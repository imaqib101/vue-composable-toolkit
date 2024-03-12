import { ref, shallowRef } from "vue";

export interface AsyncStateOptions<T> {
  immediate?: boolean;
  initialData?: T;
  onError?: (err: Error) => void;
  retries?: number;
}

export function useAsyncState<T>(
  promiseFactory: (signal?: AbortSignal) => Promise<T>,
  options: AsyncStateOptions<T> = {}
) {
  const { immediate = true, initialData, onError, retries = 0 } = options;

  const state = shallowRef<T | undefined>(initialData);
  const isLoading = ref(false);
  const isReady = ref(false);
  const error = ref<Error | null>(null);
  let controller: AbortController | null = null;

  const execute = async (customRetries = retries): Promise<T | undefined> => {
    if (controller) controller.abort();
    controller = new AbortController();

    isLoading.value = true;
    error.value = null;

    try {
      const data = await promiseFactory(controller.signal);
      state.value = data;
      isReady.value = true;
      return data;
    } catch (e: any) {
      if (e.name === "AbortError") return;
      if (customRetries > 0) {
        return execute(customRetries - 1);
      }
      error.value = e instanceof Error ? e : new Error(String(e));
      onError?.(error.value);
    } finally {
      isLoading.value = false;
    }
  };

  if (immediate) {
    execute();
  }

  return {
    state,
    isLoading,
    isReady,
    error,
    execute
  };
}
