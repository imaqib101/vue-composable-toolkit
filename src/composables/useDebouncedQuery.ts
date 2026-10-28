import { ref, watch, getCurrentInstance, onUnmounted, type Ref } from "vue";

export interface UseDebouncedQueryOptions<T> {
  /** Delay in milliseconds before the fetcher runs. Defaults to 300. */
  debounceMs?: number;
  /** Value exposed as `data` before any fetch and after the query is cleared. */
  initialValue?: T;
}

export interface UseDebouncedQueryReturn<T> {
  data: Ref<T | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
}

/**
 * Runs `fetcher` whenever `queryRef` changes, debounced. Superseded requests are
 * aborted and their results ignored, so `data` always reflects the latest query.
 * A blank query resets `data` to `initialValue` without calling the fetcher.
 */
export function useDebouncedQuery<T>(
  fetcher: (query: string, signal: AbortSignal) => Promise<T>,
  queryRef: Ref<string>,
  options: UseDebouncedQueryOptions<T> = {}
): UseDebouncedQueryReturn<T> {
  const { debounceMs = 300, initialValue } = options;
  const data = ref<T | undefined>(initialValue) as Ref<T | undefined>;
  const loading = ref(false);
  const error = ref<Error | null>(null);

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let abortController: AbortController | null = null;
  let requestId = 0;

  const cancelInFlight = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    if (abortController) abortController.abort();
    abortController = null;
  };

  watch(queryRef, (newVal) => {
    cancelInFlight();
    const currentId = ++requestId;

    if (!newVal.trim()) {
      data.value = initialValue;
      loading.value = false;
      error.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    timeoutId = setTimeout(async () => {
      timeoutId = null;
      const controller = new AbortController();
      abortController = controller;
      try {
        const result = await fetcher(newVal, controller.signal);
        if (currentId === requestId) data.value = result;
      } catch (err) {
        if (currentId === requestId && (err as Error)?.name !== "AbortError") {
          error.value = err instanceof Error ? err : new Error(String(err));
        }
      } finally {
        // Only the latest request may clear the loading flag.
        if (currentId === requestId) loading.value = false;
      }
    }, debounceMs);
  });

  if (getCurrentInstance()) {
    onUnmounted(() => {
      requestId++;
      cancelInFlight();
    });
  }

  return { data, loading, error };
}
