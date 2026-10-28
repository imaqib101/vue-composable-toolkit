import { customRef, type Ref } from "vue";

export interface ThrottledRefOptions {
  delay?: number;
  leading?: boolean;
  trailing?: boolean;
}

export function useThrottledRef<T>(
  initialValue: T,
  delayOrOptions: number | ThrottledRefOptions = 300
): Ref<T> {
  const options = typeof delayOrOptions === "number" ? { delay: delayOrOptions } : delayOrOptions;
  const delay = options.delay ?? 300;
  const leading = options.leading ?? true;
  const trailing = options.trailing ?? true;

  let lastExecuted = 0;
  let timeoutId: any = null;
  let latestValue: T = initialValue;

  return customRef<T>((track, trigger) => {
    let internalValue = initialValue;

    return {
      get() {
        track();
        return internalValue;
      },
      set(newValue: T) {
        latestValue = newValue;
        const now = Date.now();

        if (leading && now - lastExecuted >= delay) {
          lastExecuted = now;
          internalValue = newValue;
          trigger();
        } else if (trailing) {
          if (timeoutId) clearTimeout(timeoutId);
          const remaining = Math.max(0, delay - (now - lastExecuted));
          timeoutId = setTimeout(() => {
            lastExecuted = Date.now();
            internalValue = latestValue;
            timeoutId = null;
            trigger();
          }, remaining);
        }
      }
    };
  });
}
