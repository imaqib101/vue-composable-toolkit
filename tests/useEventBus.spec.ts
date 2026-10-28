import { describe, it, expect, vi } from 'vitest';
import { useEventBus } from '../src/composables/useEventBus';

type TestEvents = {
  greet: string;
  count: number;
  error: { message: string };
};

describe('useEventBus', () => {
  it('on/emit: registered handler receives the payload', () => {
    const bus = useEventBus<TestEvents>();
    const received: string[] = [];
    bus.on('greet', (msg) => received.push(msg));
    bus.emit('greet', 'hello');
    bus.emit('greet', 'world');
    expect(received).toEqual(['hello', 'world']);
  });

  it('once: handler fires once then auto-removes', () => {
    const bus = useEventBus<TestEvents>();
    const received: number[] = [];
    bus.once('count', (n) => received.push(n));
    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3);
    expect(received).toEqual([1]);
  });

  it('off: removes a specific handler, leaving others intact', () => {
    const bus = useEventBus<TestEvents>();
    const log: string[] = [];
    const h1 = (msg: string) => log.push(`h1:${msg}`);
    const h2 = (msg: string) => log.push(`h2:${msg}`);
    bus.on('greet', h1);
    bus.on('greet', h2);
    bus.off('greet', h1);
    bus.emit('greet', 'ping');
    expect(log).toEqual(['h2:ping']);
  });

  it('off (no handler): removes ALL handlers for the event', () => {
    const bus = useEventBus<TestEvents>();
    const log: string[] = [];
    bus.on('greet', (m) => log.push(m));
    bus.on('greet', (m) => log.push(m.toUpperCase()));
    bus.off('greet');
    bus.emit('greet', 'x');
    expect(log).toEqual([]);
  });

  it('listenerCount: reflects accurate handler count after adds/removes', () => {
    const bus = useEventBus<TestEvents>();
    expect(bus.listenerCount('count')).toBe(0);
    const h = (_n: number) => {};
    bus.on('count', h);
    bus.on('count', (_n: number) => {});
    expect(bus.listenerCount('count')).toBe(2);
    bus.off('count', h);
    expect(bus.listenerCount('count')).toBe(1);
  });

  it('onError: called when a handler throws instead of propagating', () => {
    const errors: Array<{ err: unknown; event: string }> = [];
    const bus = useEventBus<TestEvents>({
      onError: (err, event) => errors.push({ err, event }),
    });
    bus.on('greet', () => {
      throw new Error('boom');
    });
    expect(() => bus.emit('greet', 'hi')).not.toThrow();
    expect(errors).toHaveLength(1);
    expect((errors[0].err as Error).message).toBe('boom');
    expect(errors[0].event).toBe('greet');
  });

  it('clear: removes all handlers for all events', () => {
    const bus = useEventBus<TestEvents>();
    const log: string[] = [];
    bus.on('greet', (m) => log.push(m));
    bus.on('count', (_n) => log.push('count'));
    bus.clear();
    bus.emit('greet', 'hi');
    bus.emit('count', 1);
    expect(log).toEqual([]);
  });

  it('once: a throwing handler is still removed after the first call', () => {
    const onError = vi.fn();
    const bus = useEventBus<TestEvents>({ onError });
    bus.once('count', () => {
      throw new Error('boom');
    });
    bus.emit('count', 1);
    bus.emit('count', 2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('count')).toBe(0);
  });

  it('does not warn when used outside a component setup', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useEventBus<TestEvents>();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
