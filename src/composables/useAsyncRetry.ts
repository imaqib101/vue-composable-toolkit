import { ref, shallowRef, type Ref, type ShallowRef, onUnmounted, getCurrentInstance } from "vue";

export type BackoffStrategy = "exponential" | "linear" | "fixed";
export type AsyncRetryStatus = "idle" | "pending" | "retrying" | "success" | "error";

export interface UseAsyncRetryOptions<T> {
  /** Maximum number of retry attempts before failing (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds between attempts (default: 500) */
  delay?: number;
  /** Backoff strategy for subsequent attempts (default: 'exponential') */
  backoff?: BackoffStrategy;
  /** Multiplier for exponential backoff (default: 2) */
  backoffFactor?: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Add randomized jitter (default: false) to prevent thundering herd */
  jitter?: boolean;
  /** Filter callback: returns true if the error should trigger a retry, false to reject immediately */
  retryIf?: (error: unknown, attempt: number) => boolean;
  /** Callback fired before each retry attempt */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  /** Initial data value */
  initialValue?: T;
  /** Immediately run the async function upon composable invocation (default: false) */
  immediate?: boolean;
}

export interface UseAsyncRetryReturn<T, TArgs extends unknown[]> {
  data: ShallowRef<T | undefined>;
  error: Ref<Error | null>;
  status: Ref<AsyncRetryStatus>;
  loading: Ref<boolean>;
  isRetrying: Ref<boolean>;
  retryCount: Ref<number>;
  execute: (...args: TArgs) => Promise<T>;
  retry: () => Promise<T>;
  abort: () => void;
  reset: () => void;
}

/**
 * Enterprise Vue 3 composable providing resilient async execution with configurable
 * exponential, linear, or fixed backoff retries, error filtering, and reactive state handles.
 */
export function useAsyncRetry<T, TArgs extends unknown[] = []>(
  fn: (...args: TArgs) => Promise<T>,
  options: UseAsyncRetryOptions<T> = {}
): UseAsyncRetryReturn<T, TArgs> {
  const {
    maxRetries = 3,
    delay = 500,
    backoff = "exponential",
    backoffFactor = 2,
    maxDelay = 30000,
    jitter = false,
    retryIf,
    onRetry,
    initialValue,
    immediate = false,
  } = options;

  const data = shallowRef<T | undefined>(initialValue);
  const error = ref<Error | null>(null);
  const status = ref<AsyncRetryStatus>("idle");
  const loading = ref(false);
  const isRetrying = ref(false);
  const retryCount = ref(0);

  let aborted = false;
  let activeSleepReject: ((reason?: unknown) => void) | null = null;
  let activeSleepTimer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  function calculateDelay(attempt: number): number {
    let calculated = delay;
    if (backoff === "linear") {
      calculated = delay * attempt;
    } else if (backoff === "exponential") {
      calculated = delay * Math.pow(backoffFactor, attempt - 1);
    }
    calculated = Math.min(calculated, maxDelay);
    if (jitter) {
      // 0-25% randomized jitter
      calculated = Math.round(calculated * (1 + Math.random() * 0.25));
    }
    return calculated;
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      activeSleepReject = reject;
      activeSleepTimer = setTimeout(() => {
        activeSleepReject = null;
        activeSleepTimer = null;
        resolve();
      }, ms);
    });
  }

  function abort(): void {
    aborted = true;
    if (activeSleepTimer) {
      clearTimeout(activeSleepTimer);
      activeSleepTimer = null;
    }
    if (activeSleepReject) {
      activeSleepReject(new Error("Async retry operation aborted"));
      activeSleepReject = null;
    }
    loading.value = false;
    isRetrying.value = false;
    if (status.value === "pending" || status.value === "retrying") {
      status.value = "idle";
    }
  }

  function reset(): void {
    abort();
    data.value = initialValue;
    error.value = null;
    retryCount.value = 0;
    status.value = "idle";
    loading.value = false;
    isRetrying.value = false;
    lastArgs = null;
  }

  async function execute(...args: TArgs): Promise<T> {
    abort();
    aborted = false;
    lastArgs = args;

    loading.value = true;
    error.value = null;
    retryCount.value = 0;
    status.value = "pending";

    let attempt = 0;

    while (!aborted) {
      try {
        const result = await fn(...args);
        if (aborted) {
          throw new Error("Async retry operation aborted");
        }
        data.value = result;
        error.value = null;
        loading.value = false;
        isRetrying.value = false;
        status.value = "success";
        return result;
      } catch (err: unknown) {
        if (aborted) {
          throw err;
        }

        attempt++;
        const shouldRetry =
          attempt <= maxRetries && (retryIf ? retryIf(err, attempt) : true);

        if (shouldRetry) {
          retryCount.value = attempt;
          isRetrying.value = true;
          status.value = "retrying";

          const nextDelay = calculateDelay(attempt);
          if (onRetry) {
            onRetry(attempt, err, nextDelay);
          }

          try {
            await sleep(nextDelay);
          } catch (sleepErr) {
            // Aborted during sleep
            throw sleepErr;
          }
        } else {
          const finalError =
            err instanceof Error ? err : new Error(String(err));
          error.value = finalError;
          loading.value = false;
          isRetrying.value = false;
          status.value = "error";
          throw finalError;
        }
      }
    }

    throw new Error("Async retry operation aborted");
  }

  async function retry(): Promise<T> {
    if (lastArgs) {
      return execute(...lastArgs);
    }
    return execute(...([] as unknown as TArgs));
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      abort();
    });
  }

  if (immediate) {
    execute(...([] as unknown as TArgs)).catch(() => {
      // Handled via reactive error ref
    });
  }

  return {
    data,
    error,
    status,
    loading,
    isRetrying,
    retryCount,
    execute,
    retry,
    abort,
    reset,
  };
}
