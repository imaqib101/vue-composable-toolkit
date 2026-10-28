import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, nextTick } from "vue";
import { useDebouncedQuery } from "../src/composables/useDebouncedQuery";

describe("useDebouncedQuery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces rapid changes into a single fetch", async () => {
    const fetcher = vi.fn(async (q: string) => `result:${q}`);
    const query = ref("");
    const { data, loading } = useDebouncedQuery(fetcher, query, { debounceMs: 100 });

    query.value = "a";
    await nextTick();
    query.value = "ab";
    await nextTick();
    expect(loading.value).toBe(true);

    await vi.advanceTimersByTimeAsync(100);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("ab", expect.any(AbortSignal));
    expect(data.value).toBe("result:ab");
    expect(loading.value).toBe(false);
  });

  it("resets to the initial value for a blank query without fetching", async () => {
    const fetcher = vi.fn(async (q: string) => q);
    const query = ref("x");
    const { data } = useDebouncedQuery(fetcher, query, { debounceMs: 10, initialValue: "init" });

    query.value = "hello";
    await nextTick();
    await vi.advanceTimersByTimeAsync(10);
    expect(data.value).toBe("hello");

    query.value = "   ";
    await nextTick();
    expect(data.value).toBe("init");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("exposes fetcher errors but ignores AbortError", async () => {
    const query = ref("");
    const failing = vi.fn(async () => {
      throw new Error("nope");
    });
    const a = useDebouncedQuery(failing, query, { debounceMs: 10 });
    const aborting = vi.fn(async () => {
      const e = new Error("aborted");
      e.name = "AbortError";
      throw e;
    });
    const b = useDebouncedQuery(aborting, query, { debounceMs: 10 });

    query.value = "q";
    await nextTick();
    await vi.advanceTimersByTimeAsync(10);
    expect(a.error.value?.message).toBe("nope");
    expect(a.loading.value).toBe(false);
    expect(b.error.value).toBeNull();
  });

  it("ignores results from a superseded in-flight request", async () => {
    const resolvers: Record<string, (v: string) => void> = {};
    const fetcher = vi.fn(
      (q: string) => new Promise<string>((resolve) => (resolvers[q] = resolve))
    );
    const query = ref("");
    const { data, loading } = useDebouncedQuery(fetcher, query, { debounceMs: 10 });

    query.value = "old";
    await nextTick();
    await vi.advanceTimersByTimeAsync(10);
    query.value = "new";
    await nextTick();
    await vi.advanceTimersByTimeAsync(10);

    resolvers["new"]("NEW");
    await vi.advanceTimersByTimeAsync(0);
    expect(data.value).toBe("NEW");
    expect(loading.value).toBe(false);

    resolvers["old"]("OLD");
    await vi.advanceTimersByTimeAsync(0);
    expect(data.value).toBe("NEW");
  });

  it("aborts the in-flight request when the query changes", async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn((_q: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<string>(() => {});
    });
    const query = ref("");
    useDebouncedQuery(fetcher, query, { debounceMs: 10 });

    query.value = "one";
    await nextTick();
    await vi.advanceTimersByTimeAsync(10);
    query.value = "two";
    await nextTick();
    expect(signals[0].aborted).toBe(true);
  });
});
