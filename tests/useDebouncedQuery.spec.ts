import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { useDebouncedQuery } from '../src/composables/useDebouncedQuery';

describe('useDebouncedQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default state and initialValue', () => {
    const query = ref('');
    const fetcher = vi.fn().mockResolvedValue(['res1']);
    const { data, loading, isPending, error } = useDebouncedQuery(fetcher, query, {
      initialValue: ['init'],
    });

    expect(data.value).toEqual(['init']);
    expect(loading.value).toBe(false);
    expect(isPending.value).toBe(false);
    expect(error.value).toBe(null);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('debounces fetcher invocation when query ref updates', async () => {
    const query = ref('');
    const fetcher = vi.fn().mockResolvedValue(['result-item']);
    const onSuccess = vi.fn();

    const { data, loading, isPending, error } = useDebouncedQuery(fetcher, query, {
      debounceMs: 200,
      onSuccess,
    });

    query.value = 'vue';
    await vi.advanceTimersByTimeAsync(0);

    expect(isPending.value).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();

    // Advance 150ms (before debounce timeout)
    await vi.advanceTimersByTimeAsync(150);
    expect(fetcher).not.toHaveBeenCalled();

    // Advance past debounce threshold
    await vi.advanceTimersByTimeAsync(50);
    expect(fetcher).toHaveBeenCalledWith('vue', expect.any(AbortSignal));
    expect(data.value).toEqual(['result-item']);
    expect(loading.value).toBe(false);
    expect(isPending.value).toBe(false);
    expect(error.value).toBe(null);
    expect(onSuccess).toHaveBeenCalledWith(['result-item']);
  });

  it('resets to initialValue if query is shorter than minQueryLength', async () => {
    const query = ref('initial-query');
    const fetcher = vi.fn().mockResolvedValue(['loaded']);
    const { data, execute } = useDebouncedQuery(fetcher, query, {
      minQueryLength: 3,
      initialValue: [],
    });

    await execute();
    expect(data.value).toEqual(['loaded']);

    // Change query to less than min length
    query.value = 'ab';
    await vi.advanceTimersByTimeAsync(350);

    expect(data.value).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('executes immediately when immediate: true', async () => {
    const query = ref('direct');
    const fetcher = vi.fn().mockResolvedValue('fast');
    const { data } = useDebouncedQuery(fetcher, query, {
      immediate: true,
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledWith('direct', expect.any(AbortSignal));
    expect(data.value).toBe('fast');
  });

  it('handles fetcher errors and invokes onError', async () => {
    const query = ref('err-query');
    const failure = new Error('Network timeout');
    const fetcher = vi.fn().mockRejectedValue(failure);
    const onError = vi.fn();

    const { error, loading, execute } = useDebouncedQuery(fetcher, query, {
      onError,
    });

    await execute();
    expect(error.value).toEqual(failure);
    expect(loading.value).toBe(false);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('cancels pending timers and aborts in-flight requests', async () => {
    const query = ref('');
    let capturedSignal: AbortSignal | null = null;
    const fetcher = vi.fn().mockImplementation((_q: string, signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise((resolve) => setTimeout(() => resolve('done'), 500));
    });

    const { isPending, cancel } = useDebouncedQuery(fetcher, query, { debounceMs: 200 });

    query.value = 'search';
    await vi.advanceTimersByTimeAsync(0);
    expect(isPending.value).toBe(true);

    // Cancel while debounce timer is active
    cancel();
    expect(isPending.value).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher).not.toHaveBeenCalled();

    // Trigger execute and cancel in-flight
    query.value = 'another';
    await vi.advanceTimersByTimeAsync(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect((capturedSignal as AbortSignal | null)?.aborted).toBe(false);

    cancel();
    expect((capturedSignal as AbortSignal | null)?.aborted).toBe(true);
  });

  it('resets state with reset()', async () => {
    const query = ref('term');
    const fetcher = vi.fn().mockResolvedValue(['alpha', 'beta']);
    const { data, reset, execute } = useDebouncedQuery(fetcher, query, {
      initialValue: [],
    });

    await execute();
    expect(data.value).toEqual(['alpha', 'beta']);

    reset();
    expect(data.value).toEqual([]);
  });
});
