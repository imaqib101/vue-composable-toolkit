import { ref, watch, getCurrentScope, onScopeDispose, type Ref } from 'vue';

export interface UseDebouncedQueryOptions<T> {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Initial data value */
  initialValue?: T;
  /** Minimum query string length required to trigger a query (default: 1) */
  minQueryLength?: number;
  /** Whether to execute immediately on initialization if query is valid (default: false) */
  immediate?: boolean;
  /** Optional callback invoked on successful fetch */
  onSuccess?: (data: T) => void;
  /** Optional callback invoked on query failure */
  onError?: (error: Error) => void;
}

export interface UseDebouncedQueryReturn<T> {
  data: Ref<T | undefined>;
  loading: Ref<boolean>;
  isPending: Ref<boolean>;
  error: Ref<Error | null>;
  execute: (overrideQuery?: string) => Promise<T | undefined>;
  cancel: () => void;
  reset: () => void;
}

export function useDebouncedQuery<T>(
  fetcher: (query: string, signal: AbortSignal) => Promise<T>,
  querySource: Ref<string> | (() => string),
  options: UseDebouncedQueryOptions<T> = {}
): UseDebouncedQueryReturn<T> {
  const {
    debounceMs = 300,
    initialValue,
    minQueryLength = 1,
    immediate = false,
    onSuccess,
    onError,
  } = options;

  const data = ref<T | undefined>(initialValue) as Ref<T | undefined>;
  const loading = ref<boolean>(false);
  const isPending = ref<boolean>(false);
  const error = ref<Error | null>(null);

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;

  const getQuery = (): string => {
    return typeof querySource === 'function' ? querySource() : querySource.value;
  };

  const cancel = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    isPending.value = false;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    loading.value = false;
  };

  const reset = () => {
    cancel();
    data.value = initialValue;
    error.value = null;
  };

  const execute = async (overrideQuery?: string): Promise<T | undefined> => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    isPending.value = false;

    if (abortController) {
      abortController.abort();
    }

    const rawQuery = overrideQuery !== undefined ? overrideQuery : getQuery();
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';

    if (query.length < minQueryLength) {
      data.value = initialValue;
      loading.value = false;
      error.value = null;
      return undefined;
    }

    abortController = new AbortController();
    const { signal } = abortController;
    loading.value = true;
    error.value = null;

    try {
      const result = await fetcher(query, signal);
      if (!signal.aborted) {
        data.value = result;
        loading.value = false;
        onSuccess?.(result);
        return result;
      }
    } catch (err: unknown) {
      if (!signal.aborted) {
        const errObj = err instanceof Error ? err : new Error(String(err));
        error.value = errObj;
        loading.value = false;
        onError?.(errObj);
      }
    }
    return undefined;
  };

  const schedule = (val: string) => {
    cancel();
    const trimmed = typeof val === 'string' ? val.trim() : '';
    if (trimmed.length < minQueryLength) {
      data.value = initialValue;
      error.value = null;
      return;
    }

    isPending.value = true;
    timerId = setTimeout(() => {
      timerId = null;
      isPending.value = false;
      void execute(trimmed);
    }, debounceMs);
  };

  watch(
    typeof querySource === 'function' ? querySource : () => querySource.value,
    (newVal) => {
      schedule(newVal);
    },
    { immediate: false }
  );

  if (immediate) {
    void execute();
  }

  if (getCurrentScope()) {
    onScopeDispose(cancel);
  }

  return {
    data,
    loading,
    isPending,
    error,
    execute,
    cancel,
    reset,
  };
}
