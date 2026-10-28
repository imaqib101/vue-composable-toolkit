import { ref, getCurrentInstance, onUnmounted } from 'vue';

export type EventHandler<T = unknown> = (payload: T) => void;

export interface EventBusOptions {
  onError?: (err: unknown, event: string) => void;
}

type HandlerSet<T> = Set<EventHandler<T>>;
type ListenersMap<Events extends Record<string, unknown>> = {
  [K in keyof Events]?: HandlerSet<Events[K]>;
};

export function useEventBus<Events extends Record<string, unknown>>(
  options?: EventBusOptions
) {
  const listeners = ref<ListenersMap<Events>>({} as ListenersMap<Events>);

  function on<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): () => void {
    if (!listeners.value[event]) {
      listeners.value[event] = new Set<EventHandler<Events[K]>>();
    }
    (listeners.value[event] as HandlerSet<Events[K]>).add(handler);
    return () => off(event, handler);
  }

  function emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const handlers = listeners.value[event] as HandlerSet<Events[K]> | undefined;
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        if (options?.onError) {
          options.onError(err, event as string);
        } else {
          console.error(`[useEventBus] Unhandled error in handler for "${String(event)}":`, err);
        }
      }
    }
  }

  function once<K extends keyof Events>(
    event: K,
    handler: EventHandler<Events[K]>
  ): () => void {
    const wrapper: EventHandler<Events[K]> = (payload) => {
      // Unsubscribe first so a throwing handler is still only called once.
      off(event, wrapper);
      handler(payload);
    };
    return on(event, wrapper);
  }

  function off<K extends keyof Events>(
    event: K,
    handler?: EventHandler<Events[K]>
  ): void {
    if (!handler) {
      delete listeners.value[event];
      return;
    }
    const handlers = listeners.value[event] as HandlerSet<Events[K]> | undefined;
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        delete listeners.value[event];
      }
    }
  }

  function clear(): void {
    listeners.value = {} as ListenersMap<Events>;
  }

  function listenerCount<K extends keyof Events>(event: K): number {
    return (listeners.value[event] as HandlerSet<Events[K]> | undefined)?.size ?? 0;
  }

  // Auto-cleanup when used inside a component setup
  if (getCurrentInstance()) {
    onUnmounted(clear);
  }

  return { on, emit, once, off, clear, listenerCount };
}