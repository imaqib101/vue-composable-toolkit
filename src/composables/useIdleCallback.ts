import {
  ref,
  readonly,
  getCurrentScope,
  onScopeDispose,
  type Ref,
  type DeepReadonly,
} from "vue";

// ── Types ─────────────────────────────────────────────────────────────────────

export type IdleCallbackStatus = "idle" | "pending" | "running" | "cancelled";

export interface UseIdleCallbackOptions {
  /**
   * Maximum number of milliseconds the browser is allowed to delay calling
   * the callback.  Maps directly to `IdleRequestOptions.timeout`.
   * When omitted the browser decides (potentially never calling the callback
   * during heavy load — set a timeout for anything latency-sensitive).
   */
  timeout?: number;
  /**
   * Run the callback immediately on the first call to `schedule()` without
   * waiting for an idle period.  Useful in environments where
   * requestIdleCallback is unavailable or for SSR/test contexts.
   * Default: false.
   */
  immediate?: boolean;
  /**
   * Called whenever the status transitions to a new value.
   */
  onStatusChange?: (status: IdleCallbackStatus) => void;
}

export interface UseIdleCallbackReturn {
  /** Current lifecycle status of the idle callback. */
  status: DeepReadonly<Ref<IdleCallbackStatus>>;
  /** True while a callback is queued but has not run yet. */
  isPending: DeepReadonly<Ref<boolean>>;
  /** True while the callback is actively executing. */
  isRunning: DeepReadonly<Ref<boolean>>;
  /** True after cancel() was called and before schedule() is called again. */
  isCancelled: DeepReadonly<Ref<boolean>>;
  /**
   * Queue the callback to run during the next idle period.
   * If already pending, the existing registration is cancelled first.
   */
  schedule: () => void;
  /**
   * Cancel a pending idle callback.  No-op if nothing is pending.
   */
  cancel: () => void;
}

// ── Polyfill detection ────────────────────────────────────────────────────────

const hasRIC =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as Record<string, unknown>).requestIdleCallback ===
    "function";

function ricSchedule(
  cb: IdleRequestCallback,
  opts?: IdleRequestOptions
): number {
  if (hasRIC) {
    return (
      globalThis as unknown as Window
    ).requestIdleCallback(cb, opts);
  }
  // Fallback: use setTimeout with a 16 ms delay (one frame).
  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => 50, // report 50 ms remaining (spec maximum)
    });
  }, 16) as unknown as number;
}

function ricCancel(handle: number): void {
  if (hasRIC) {
    (globalThis as unknown as Window).cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

// ── Composable ────────────────────────────────────────────────────────────────

/**
 * `useIdleCallback` — schedule work during browser idle periods.
 *
 * Wraps `requestIdleCallback` (with a `setTimeout` fallback for environments
 * that lack it, such as Node.js / JSDOM test runners) and exposes reactive
 * status so the template can react to scheduling lifecycle.
 *
 * @example
 * ```ts
 * const { status, schedule, cancel } = useIdleCallback(
 *   (deadline) => { analytics.flush(deadline.timeRemaining()); },
 *   { timeout: 2000 }
 * );
 *
 * // Queue on mount, cancel on unmount (handled automatically in a scope).
 * onMounted(schedule);
 * ```
 *
 * @param callback  The work to perform. Receives the `IdleDeadline` from the
 *                  browser (or the polyfill).
 * @param options   Scheduling options.
 */
export function useIdleCallback(
  callback: (deadline: IdleDeadline) => void,
  options: UseIdleCallbackOptions = {}
): UseIdleCallbackReturn {
  const { timeout, immediate = false, onStatusChange } = options;

  const status = ref<IdleCallbackStatus>("idle");
  const isPending = ref(false);
  const isRunning = ref(false);
  const isCancelled = ref(false);

  let handle: number | null = null;

  const setStatus = (next: IdleCallbackStatus) => {
    status.value = next;
    isPending.value = next === "pending";
    isRunning.value = next === "running";
    isCancelled.value = next === "cancelled";
    onStatusChange?.(next);
  };

  const cancel = (): void => {
    if (handle !== null) {
      ricCancel(handle);
      handle = null;
      setStatus("cancelled");
    }
  };

  const schedule = (): void => {
    // Cancel any existing registration first.
    if (handle !== null) {
      ricCancel(handle);
      handle = null;
    }

    if (immediate) {
      setStatus("running");
      try {
        callback({ didTimeout: false, timeRemaining: () => 50 });
      } finally {
        handle = null;
        setStatus("idle");
      }
      return;
    }

    setStatus("pending");

    const opts: IdleRequestOptions | undefined =
      timeout !== undefined ? { timeout } : undefined;

    handle = ricSchedule((deadline) => {
      handle = null;
      setStatus("running");
      try {
        callback(deadline);
      } finally {
        setStatus("idle");
      }
    }, opts);
  };

  // Auto-cancel when the Vue effect scope (component) is disposed.
  if (getCurrentScope()) {
    onScopeDispose(cancel);
  }

  return {
    status: readonly(status),
    isPending: readonly(isPending),
    isRunning: readonly(isRunning),
    isCancelled: readonly(isCancelled),
    schedule,
    cancel,
  };
}
