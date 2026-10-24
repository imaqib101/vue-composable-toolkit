import { ref, customRef, type Ref } from "vue";

export interface DebouncedRefOptions {
  delay?: number;
  immediate?: boolean;
}

export interface DebouncedRefReturn<T> {
  value: Ref<T>;
  isPending: Ref<boolean>;
  cancel: () => void;
  flush: (newValue?: T) => void;
}

export function useDebouncedRef<T>(
  initialValue: T,
  delayOrOptions: number | DebouncedRefOptions = 300
): DebouncedRefReturn<T> {
  const options = typeof delayOrOptions === "number" ? { delay: delayOrOptions } : delayOrOptions;
  const delay = options.delay ?? 300;
  const isPending = ref(false);

  let timeoutId: any = null;
  let pendingValue: T = initialValue;
  let internalValue = initialValue;
  let triggerRef: (() => void) | null = null;

  const value = customRef<T>((track, trigger) => {
    triggerRef = trigger;

    return {
      get() {
        track();
        return internalValue;
      },
      set(newValue: T) {
        pendingValue = newValue;
        isPending.value = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          internalValue = pendingValue;
          isPending.value = false;
          timeoutId = null;
          trigger();
        }, delay);
      }
    };
  });

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      isPending.value = false;
    }
  };

  const flush = (newValue?: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    isPending.value = false;
    internalValue = newValue !== undefined ? newValue : pendingValue;
    if (triggerRef) {
      triggerRef();
    }
  };

  return {
    value,
    isPending,
    cancel,
    flush
  };
}
