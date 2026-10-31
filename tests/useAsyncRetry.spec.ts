import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAsyncRetry } from "../src/composables/useAsyncRetry";

describe("useAsyncRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves successfully on the first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success-data");
    const { data, error, loading, status, execute } = useAsyncRetry(fn);

    expect(status.value).toBe("idle");
    const promise = execute();
    expect(loading.value).toBe(true);
    expect(status.value).toBe("pending");

    const result = await promise;
    expect(result).toBe("success-data");
    expect(data.value).toBe("success-data");
    expect(error.value).toBe(null);
    expect(loading.value).toBe(false);
    expect(status.value).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure up to maxRetries and succeeds", async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error(`Transient failure ${callCount}`);
      }
      return "recovered";
    });

    const onRetry = vi.fn();
    const { data, error, retryCount, isRetrying, execute } = useAsyncRetry(fn, {
      maxRetries: 3,
      delay: 100,
      backoff: "linear",
      onRetry,
    });

    const promise = execute();

    // First attempt fails immediately, enters retry loop
    await vi.advanceTimersByTimeAsync(0);
    expect(isRetrying.value).toBe(true);
    expect(retryCount.value).toBe(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 100);

    // Wait for first delay (100ms)
    await vi.advanceTimersByTimeAsync(100);
    expect(retryCount.value).toBe(2);
    expect(onRetry).toHaveBeenCalledWith(2, expect.any(Error), 200);

    // Wait for second delay (200ms)
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe("recovered");
    expect(data.value).toBe("recovered");
    expect(error.value).toBe(null);
    expect(isRetrying.value).toBe(false);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting maxRetries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Persistent error"));
    const { error, status, loading, isRetrying, retryCount, execute } = useAsyncRetry(fn, {
      maxRetries: 2,
      delay: 50,
      backoff: "fixed",
    });

    let caughtError: any = null;
    const promise = execute().catch((e) => {
      caughtError = e;
    });

    // Advance through retries
    await vi.advanceTimersByTimeAsync(50);
    await vi.advanceTimersByTimeAsync(50);
    await promise;

    expect(caughtError).not.toBe(null);
    expect(caughtError?.message).toBe("Persistent error");
    expect(error.value?.message).toBe("Persistent error");
    expect(status.value).toBe("error");
    expect(loading.value).toBe(false);
    expect(isRetrying.value).toBe(false);
    expect(retryCount.value).toBe(2);
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("respects retryIf filter and stops immediately on fatal errors", async () => {
    class FatalError extends Error {}
    const fn = vi.fn().mockRejectedValue(new FatalError("Fatal unrecoverable error"));

    const { error, retryCount, execute } = useAsyncRetry(fn, {
      maxRetries: 5,
      delay: 50,
      retryIf: (err) => !(err instanceof FatalError),
    });

    let caughtError: Error | null = null;
    await execute().catch((e) => {
      caughtError = e;
    });

    expect(caughtError).toBeInstanceOf(FatalError);
    expect(error.value).toBeInstanceOf(FatalError);
    expect(retryCount.value).toBe(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("aborts pending retry sleep", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Network glitch"));
    const { status, isRetrying, execute, abort } = useAsyncRetry(fn, {
      maxRetries: 3,
      delay: 1000,
    });

    let caughtError: any = null;
    const promise = execute().catch((e) => {
      caughtError = e;
    });

    // First attempt fails, waiting in sleep
    await vi.advanceTimersByTimeAsync(0);
    expect(isRetrying.value).toBe(true);

    abort();
    await promise;

    expect(caughtError?.message).toBe("Async retry operation aborted");
    expect(status.value).toBe("idle");
    expect(isRetrying.value).toBe(false);
  });

  it("resets state back to initial values", async () => {
    const fn = vi.fn().mockResolvedValue("data");
    const { data, status, execute, reset } = useAsyncRetry(fn, { initialValue: "init" });

    await execute();
    expect(data.value).toBe("data");
    expect(status.value).toBe("success");

    reset();
    expect(data.value).toBe("init");
    expect(status.value).toBe("idle");
  });

  it("retries with last used arguments", async () => {
    const fn = vi.fn().mockImplementation(async (query: string) => `result for ${query}`);
    const { data, execute, retry } = useAsyncRetry(fn);

    await execute("search-term");
    expect(data.value).toBe("result for search-term");

    await retry();
    expect(fn).toHaveBeenLastCalledWith("search-term");
  });
});
