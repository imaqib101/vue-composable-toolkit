import { ref, onScopeDispose } from "vue";

export interface DebounceOptions {
  immediate?: boolean;
  maxWait?: number;
}

export function useDebounceFn<T extends (...args: any[]) => any>(
  fn: T,
  delay: number = 250,
  options: DebounceOptions = {}
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  const isPending = ref(false);

  const clear = () => {
    if (timer) clearTimeout(timer);
    if (maxTimer) clearTimeout(maxTimer);
    timer = null;
    maxTimer = null;
    isPending.value = false;
  };

  const debounced = (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve) => {
      const invoke = () => {
        clear();
        resolve(fn(...args));
      };

      if (options.immediate && !timer) {
        invoke();
        return;
      }

      if (timer) clearTimeout(timer);
      isPending.value = true;

      timer = setTimeout(invoke, delay);

      if (options.maxWait && !maxTimer) {
        maxTimer = setTimeout(invoke, options.maxWait);
      }
    });
  };

  onScopeDispose(clear);

  return {
    run: debounced,
    cancel: clear,
    isPending
  };
}
