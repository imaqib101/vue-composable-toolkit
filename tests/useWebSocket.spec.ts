import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, effectScope, nextTick } from 'vue';
import { useWebSocket } from '../src/composables/useWebSocket';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  protocols?: string | string[];
  readyState: number = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;

  sent: any[] = [];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    MockWebSocket.instances.push(this);
  }

  static instances: MockWebSocket[] = [];

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: any) {
    this.onmessage?.({ data });
  }

  simulateError(error: any) {
    this.onerror?.(error);
  }

  simulateClose(code = 1000, reason = 'Normal closure') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason, wasClean: code === 1000 } as any);
  }

  send(data: any) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sent.push(data);
  }

  close(code = 1000, reason = 'Normal closure') {
    this.readyState = MockWebSocket.CLOSING;
    this.simulateClose(code, reason);
  }
}

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.stubGlobal('window', {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('connects immediately and transitions status to OPEN', () => {
    const onConnected = vi.fn();
    const { status, ws } = useWebSocket('wss://api.example.com/ws', { onConnected });

    expect(status.value).toBe('CONNECTING');
    expect(MockWebSocket.instances.length).toBe(1);

    const instance = MockWebSocket.instances[0];
    instance.simulateOpen();

    expect(status.value).toBe('OPEN');
    expect(ws.value).toBe(instance);
    expect(onConnected).toHaveBeenCalledWith(instance);
  });

  it('receives and parses JSON messages', () => {
    const onMessage = vi.fn();
    const { data } = useWebSocket<{ event: string; count: number }>('wss://api.example.com/ws', {
      onMessage,
    });

    const instance = MockWebSocket.instances[0];
    instance.simulateOpen();

    instance.simulateMessage(JSON.stringify({ event: 'TICK', count: 42 }));

    expect(data.value).toEqual({ event: 'TICK', count: 42 });
    expect(onMessage).toHaveBeenCalled();
  });

  it('sends JSON data and serialized messages correctly', () => {
    const { send } = useWebSocket('wss://api.example.com/ws');
    const instance = MockWebSocket.instances[0];

    // Cannot send before open
    expect(send({ type: 'SUBSCRIBE' })).toBe(false);

    instance.simulateOpen();

    const ok1 = send('hello');
    expect(ok1).toBe(true);
    expect(instance.sent).toContain('hello');

    const ok2 = send({ action: 'filter', channel: 'orders' });
    expect(ok2).toBe(true);
    expect(instance.sent).toContain(JSON.stringify({ action: 'filter', channel: 'orders' }));
  });

  it('handles manual close without auto-reconnecting', () => {
    const onDisconnected = vi.fn();
    const { close, status } = useWebSocket('wss://api.example.com/ws', {
      autoReconnect: true,
      onDisconnected,
    });

    const instance = MockWebSocket.instances[0];
    instance.simulateOpen();

    close();

    expect(status.value).toBe('CLOSED');
    expect(onDisconnected).toHaveBeenCalled();

    // Advance time - should NOT reconnect because manually closed
    vi.advanceTimersByTime(5000);
    expect(MockWebSocket.instances.length).toBe(1);
  });

  it('auto-reconnects with exponential backoff on unexpected disconnect', () => {
    const { status } = useWebSocket('wss://api.example.com/ws', {
      autoReconnect: {
        retries: 3,
        delay: 500,
        backoffMultiplier: 2,
      },
    });

    const instance1 = MockWebSocket.instances[0];
    instance1.simulateOpen();
    expect(status.value).toBe('OPEN');

    // Unexpected server disconnect (code 1006)
    instance1.simulateClose(1006, 'Abnormal Closure');
    expect(status.value).toBe('CLOSED');

    // Advance by delay 500ms
    vi.advanceTimersByTime(500);

    expect(MockWebSocket.instances.length).toBe(2);
    expect(status.value).toBe('CONNECTING');

    const instance2 = MockWebSocket.instances[1];
    instance2.simulateOpen();
    expect(status.value).toBe('OPEN');
  });

  it('sends periodic heartbeat pings when configured', () => {
    useWebSocket('wss://api.example.com/ws', {
      heartbeat: {
        message: { type: 'ping' },
        interval: 1000,
      },
    });

    const instance = MockWebSocket.instances[0];
    instance.simulateOpen();

    expect(instance.sent.length).toBe(0);

    vi.advanceTimersByTime(1000);
    expect(instance.sent).toContain(JSON.stringify({ type: 'ping' }));

    vi.advanceTimersByTime(1000);
    expect(instance.sent.length).toBe(2);
  });

  it('reconnects when reactive URL changes', async () => {
    const url = ref('wss://api.example.com/v1');
    useWebSocket(url);

    const instance1 = MockWebSocket.instances[0];
    instance1.simulateOpen();
    expect(instance1.url).toBe('wss://api.example.com/v1');

    url.value = 'wss://api.example.com/v2';
    await nextTick();

    expect(instance1.readyState).toBe(MockWebSocket.CLOSED);
    expect(MockWebSocket.instances.length).toBe(2);
    expect(MockWebSocket.instances[1].url).toBe('wss://api.example.com/v2');
  });

  it('cleans up and closes socket on effectScope disposal', () => {
    const scope = effectScope();
    let wsRef: any;

    scope.run(() => {
      const { ws } = useWebSocket('wss://api.example.com/ws');
      wsRef = ws;
    });

    const instance = MockWebSocket.instances[0];
    instance.simulateOpen();

    scope.stop();

    expect(instance.readyState).toBe(MockWebSocket.CLOSED);
  });
});
