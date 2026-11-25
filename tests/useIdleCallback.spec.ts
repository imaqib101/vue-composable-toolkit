import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { useIdleCallback } from "../src/composables/useIdleCallback";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a fake IdleDeadline with a fixed timeRemaining. */
function fakeDeadline(remaining = 50): IdleDeadline {
  return { didTimeout: false, timeRemaining: () => remaining };
}

/**
 * Because JSDOM doesn't implement requestIdleCallback, our composable falls
 * back to setTimeout(16).  We use vi.useFakeTimers() so we can advance time
 * synchronously without real delays.
 */
describe("useIdleCallback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Initial state ────────────────────────────────────────────────────────

  it("starts in idle status with all flags false", () => {
    const cb = vi.fn();
    const { status, isPending, isRunning, isCancelled } = useIdleCallback(cb);

    expect(status.value).toBe("idle");
    expect(isPending.value).toBe(false);
    expect(isRunning.value).toBe(false);
    expect(isCancelled.value).toBe(false);
  });

  // ── schedule ─────────────────────────────────────────────────────────────

  it("transitions to pending after schedule() and back to idle after execution", async () => {
    const cb = vi.fn();
    const { status, isPending, schedule } = useIdleCallback(cb);

    schedule();
    expect(status.value).toBe("pending");
    expect(isPending.value).toBe(true);

    // Advance past the 16 ms fallback timer.
    await vi.advanceTimersByTimeAsync(20);

    expect(status.value).toBe("idle");
    expect(isPending.value).toBe(false);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("passes an IdleDeadline-like object to the callback", async () => {
    let receivedDeadline: IdleDeadline | null = null;
    const cb = vi.fn((dl: IdleDeadline) => {
      receivedDeadline = dl;
    });

    const { schedule } = useIdleCallback(cb);
    schedule();
    await vi.advanceTimersByTimeAsync(20);

    expect(receivedDeadline).not.toBeNull();
    expect(typeof receivedDeadline!.timeRemaining).toBe("function");
    expect(receivedDeadline!.timeRemaining()).toBe(50); // polyfill returns 50
  });

  it("cancels the previous registration when schedule() is called again", async () => {
    const cb = vi.fn();
    const { schedule } = useIdleCallback(cb);

    schedule();
    schedule(); // re-schedule before the first fires

    await vi.advanceTimersByTimeAsync(50);

    // Callback should have been called exactly once (second schedule fires,
    // first was cancelled before it could run).
    expect(cb).toHaveBeenCalledTimes(1);
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  it("cancel() prevents the callback from running", async () => {
    const cb = vi.fn();
    const { schedule, cancel, status, isCancelled } = useIdleCallback(cb);

    schedule();
    cancel();

    expect(status.value).toBe("cancelled");
    expect(isCancelled.value).toBe(true);

    await vi.advanceTimersByTimeAsync(50);

    // Callback must NOT have been called.
    expect(cb).not.toHaveBeenCalled();
  });

  it("cancel() is a no-op when nothing is pending", () => {
    const cb = vi.fn();
    const { cancel, status } = useIdleCallback(cb);

    expect(() => cancel()).not.toThrow();
    expect(status.value).toBe("idle");
  });

  it("allows schedule() after a prior cancel()", async () => {
    const cb = vi.fn();
    const { schedule, cancel } = useIdleCallback(cb);

    schedule();
    cancel();
    schedule(); // reschedule after cancel

    await vi.advanceTimersByTimeAsync(20);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  // ── immediate mode ────────────────────────────────────────────────────────

  it("immediate mode runs the callback synchronously without a timer", () => {
    const cb = vi.fn();
    const { schedule, status } = useIdleCallback(cb, { immediate: true });

    schedule();

    // No need to advance timers — it ran synchronously.
    expect(cb).toHaveBeenCalledTimes(1);
    expect(status.value).toBe("idle");
  });

  // ── onStatusChange hook ───────────────────────────────────────────────────

  it("fires onStatusChange for each status transition", async () => {
    const transitions: string[] = [];
    const cb = vi.fn();
    const { schedule } = useIdleCallback(cb, {
      onStatusChange: (s) => transitions.push(s),
    });

    schedule();
    await vi.advanceTimersByTimeAsync(20);

    // pending → running → idle
    expect(transitions).toEqual(["pending", "running", "idle"]);
  });

  it("fires onStatusChange with cancelled when cancel() is called", () => {
    const transitions: string[] = [];
    const cb = vi.fn();
    const { schedule, cancel } = useIdleCallback(cb, {
      onStatusChange: (s) => transitions.push(s),
    });

    schedule();
    cancel();

    expect(transitions).toEqual(["pending", "cancelled"]);
  });

  // ── error resilience ──────────────────────────────────────────────────────

  it("resets status to idle even if the callback throws", async () => {
    const cb = vi.fn(() => {
      throw new Error("callback boom");
    });
    const { schedule, status } = useIdleCallback(cb);

    schedule();

    // Swallow the thrown error (it propagates out of the fake timer advance).
    await expect(vi.advanceTimersByTimeAsync(20)).rejects.toThrow("callback boom");

    // Status must still be idle after the error.
    expect(status.value).toBe("idle");
  });
});
