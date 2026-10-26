import { ref, watch, onUnmounted, type Ref } from "vue";

export interface UseDebouncedQueryOptions<T> {
  debounceMs?: number;
  initialValue?: T;
}

export function useDebouncedQuery<T>(
  fetcher: (query: string, signal: AbortSignal) => Promise<T>,
  queryRef: Ref<string>,
  options: UseDebouncedQueryOptions<T> = {}
) {
  const { debounceMs = 300, initialValue } = options;
  const data = ref<T | undefined>(initialValue) as Ref<T | undefined>;
  const loading = ref(false);
  const error = ref<Error | null>(null);

  let timeoutId: any = null;
  let abortController: AbortController | null = null;

  watch(
    queryRef,
    (newVal) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (abortController) abortController.abort();

      if (!newVal.trim()) {
        data.value = initialValue;
        loading.value = false;
        error.value = null;
        return;
      }

      loading.value = true;
      error.value = null;

      timeoutId = setTimeout(async () => {
        abortController = new AbortController();
        try {
          data.value = await fetcher(newVal, abortController.signal);
        } catch (err: any) {
          if (err.name !== "AbortError") {
            error.value = err;
          }
        } finally {
          loading.value = false;
        }
      }, debounceMs);
    },
    { immediate: false }
  );

  onUnmounted(() => {
    if (timeoutId) clearTimeout(timeoutId);
    if (abortController) abortController.abort();
  });

  return { data, loading, error };
}
