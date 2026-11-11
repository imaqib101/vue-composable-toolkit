import { ref, shallowRef, watch, getCurrentScope, onScopeDispose, type Ref, type ShallowRef } from 'vue';

export type WebSocketStatus = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

export interface AutoReconnectOptions {
  /** Maximum reconnection attempts before giving up (default: 5) */
  retries?: number;
  /** Initial delay before first reconnect in ms (default: 1000) */
  delay?: number;
  /** Maximum backoff delay cap in ms (default: 30000) */
  maxDelay?: number;
  /** Multiplier applied per retry attempt (default: 1.5) */
  backoffMultiplier?: number;
}

export interface HeartbeatOptions {
  /** Message to send as ping (default: 'ping') */
  message?: string | Record<string, unknown>;
  /** Interval in ms between heartbeat pings (default: 30000) */
  interval?: number;
  /** Timeout in ms to wait for activity/pong before dropping connection (default: 10000) */
  pongTimeout?: number;
}

export interface UseWebSocketOptions<T> {
  /** Automatically connect when composable is initialized (default: true) */
  immediate?: boolean;
  /** Auto-reconnect configuration or boolean toggle (default: false) */
  autoReconnect?: boolean | AutoReconnectOptions;
  /** Heartbeat ping configuration or boolean toggle (default: false) */
  heartbeat?: boolean | HeartbeatOptions;
  /** Subprotocols for WebSocket */
  protocols?: string | string[];
  /** Custom data parser for incoming messages */
  parser?: (data: string | ArrayBuffer | Blob) => T;
  /** Custom serializer for outbound payload */
  serializer?: (data: unknown) => string;
  /** Hook fired when socket connection is established */
  onConnected?: (ws: WebSocket) => void;
  /** Hook fired when socket connection is closed */
  onDisconnected?: (ws: WebSocket, event: CloseEvent) => void;
  /** Hook fired when an error occurs */
  onError?: (ws: WebSocket, event: Event) => void;
  /** Hook fired when a message is received */
  onMessage?: (ws: WebSocket, event: MessageEvent, parsedData: T) => void;
}

export interface UseWebSocketReturn<T> {
  /** Latest message payload parsed from socket */
  data: Ref<T | null>;
  /** Connection lifecycle status */
  status: Ref<WebSocketStatus>;
  /** Underlying WebSocket instance */
  ws: ShallowRef<WebSocket | null>;
  /** Send message over socket (serializes objects to JSON if appropriate) */
  send: (payload: unknown, useSerializer?: boolean) => boolean;
  /** Explicitly open or reconnect socket */
  open: () => void;
  /** Explicitly close socket */
  close: (code?: number, reason?: string) => void;
}

export function useWebSocket<T = unknown>(
  url: string | Ref<string> | (() => string),
  options: UseWebSocketOptions<T> = {}
): UseWebSocketReturn<T> {
  const {
    immediate = true,
    autoReconnect = false,
    heartbeat = false,
    protocols,
    parser = (raw) => {
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as unknown as T;
        }
      }
      return raw as unknown as T;
    },
    serializer = (payload) => {
      if (typeof payload === 'string') return payload;
      return JSON.stringify(payload);
    },
    onConnected,
    onDisconnected,
    onError,
    onMessage,
  } = options;

  const data = ref<T | null>(null) as Ref<T | null>;
  const status = ref<WebSocketStatus>('CLOSED');
  const ws = shallowRef<WebSocket | null>(null);

  let manuallyClosed = false;
  let retryCount = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  let pongTimer: ReturnType<typeof setTimeout> | null = null;

  const getUrl = (): string => {
    if (typeof url === 'function') return url();
    if (typeof url === 'object' && 'value' in url) return url.value;
    return url;
  };

  const getReconnectConfig = (): AutoReconnectOptions => {
    if (typeof autoReconnect === 'object' && autoReconnect !== null) {
      return {
        retries: autoReconnect.retries ?? 5,
        delay: autoReconnect.delay ?? 1000,
        maxDelay: autoReconnect.maxDelay ?? 30000,
        backoffMultiplier: autoReconnect.backoffMultiplier ?? 1.5,
      };
    }
    return {
      retries: 5,
      delay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 1.5,
    };
  };

  const getHeartbeatConfig = (): HeartbeatOptions => {
    if (typeof heartbeat === 'object' && heartbeat !== null) {
      return {
        message: heartbeat.message ?? 'ping',
        interval: heartbeat.interval ?? 30000,
        pongTimeout: heartbeat.pongTimeout ?? 10000,
      };
    }
    return {
      message: 'ping',
      interval: 30000,
      pongTimeout: 10000,
    };
  };

  const clearTimers = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (pongTimer) {
      clearTimeout(pongTimer);
      pongTimer = null;
    }
  };

  const startHeartbeat = () => {
    if (!heartbeat) return;
    const config = getHeartbeatConfig();

    heartbeatTimer = setInterval(() => {
      if (ws.value && ws.value.readyState === WebSocket.OPEN) {
        const pingPayload = typeof config.message === 'string'
          ? config.message
          : JSON.stringify(config.message);
        ws.value.send(pingPayload);

        // Schedule pong timeout check
        if (config.pongTimeout && config.pongTimeout > 0) {
          pongTimer = setTimeout(() => {
            // Heartbeat pong not received in time, force reconnect
            if (ws.value) {
              ws.value.close(4000, 'Heartbeat timeout');
            }
          }, config.pongTimeout);
        }
      }
    }, config.interval);
  };

  const resetPongTimeout = () => {
    if (pongTimer) {
      clearTimeout(pongTimer);
      pongTimer = null;
    }
  };

  const open = () => {
    clearTimers();
    manuallyClosed = false;

    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return;
    }

    if (ws.value && (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const currentUrl = getUrl();
    if (!currentUrl) return;

    status.value = 'CONNECTING';

    try {
      const socket = protocols ? new WebSocket(currentUrl, protocols) : new WebSocket(currentUrl);
      ws.value = socket;

      socket.onopen = () => {
        status.value = 'OPEN';
        retryCount = 0;
        startHeartbeat();
        onConnected?.(socket);
      };

      socket.onmessage = (event: MessageEvent) => {
        resetPongTimeout();
        try {
          const parsed = parser(event.data);
          data.value = parsed;
          onMessage?.(socket, event, parsed);
        } catch {
          data.value = event.data as unknown as T;
          onMessage?.(socket, event, event.data as unknown as T);
        }
      };

      socket.onerror = (event: Event) => {
        onError?.(socket, event);
      };

      socket.onclose = (event: CloseEvent) => {
        status.value = 'CLOSED';
        ws.value = null;
        clearTimers();
        onDisconnected?.(socket, event);

        if (!manuallyClosed && autoReconnect) {
          const cfg = getReconnectConfig();
          const maxRetries = cfg.retries ?? 5;
          if (retryCount < maxRetries) {
            retryCount++;
            const baseDelay = cfg.delay ?? 1000;
            const multiplier = cfg.backoffMultiplier ?? 1.5;
            const computedDelay = Math.min(baseDelay * Math.pow(multiplier, retryCount - 1), cfg.maxDelay ?? 30000);

            reconnectTimer = setTimeout(() => {
              open();
            }, computedDelay);
          }
        }
      };
    } catch {
      status.value = 'CLOSED';
    }
  };

  const close = (code = 1000, reason = 'Normal closure') => {
    manuallyClosed = true;
    clearTimers();
    if (ws.value) {
      status.value = 'CLOSING';
      ws.value.close(code, reason);
      ws.value = null;
    }
    status.value = 'CLOSED';
  };

  const send = (payload: unknown, useSerializer = true): boolean => {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      if (typeof payload === 'string' || payload instanceof ArrayBuffer || payload instanceof Blob) {
        ws.value.send(payload);
      } else if (useSerializer) {
        ws.value.send(serializer(payload));
      } else {
        ws.value.send(String(payload));
      }
      return true;
    } catch {
      return false;
    }
  };

  // Watch URL changes to reconnect
  if (typeof url === 'function' || (typeof url === 'object' && 'value' in url)) {
    watch(
      () => getUrl(),
      (newUrl, oldUrl) => {
        if (newUrl !== oldUrl && !manuallyClosed) {
          close(1000, 'URL changed');
          open();
        }
      }
    );
  }

  if (immediate) {
    open();
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      close(1000, 'Scope disposed');
    });
  }

  return {
    data,
    status,
    ws,
    send,
    open,
    close,
  };
}
