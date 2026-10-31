import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDebouncedRef } from "../src/composables/useDebouncedRef";

describe("useDebouncedRef", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces value updates", () => {
    const { value, isPending } = useDebouncedRef("initial", 100);
    expect(value.value).toBe("initial");
    expect(isPending.value).toBe(false);

    value.value = "updated";
    expect(isPending.value).toBe(true);
    expect(value.value).toBe("initial"); // not updated immediately

    vi.advanceTimersByTime(100);
    expect(value.value).toBe("updated");
    expect(isPending.value).toBe(false);
  });

  it("cancels pending updates", () => {
    const { value, isPending, cancel } = useDebouncedRef("initial", 100);
    value.value = "cancelled-update";
    expect(isPending.value).toBe(true);

    cancel();
    expect(isPending.value).toBe(false);

    vi.advanceTimersByTime(200);
    expect(value.value).toBe("initial");
  });

  it("flushes pending updates immediately", () => {
    const { value, isPending, flush } = useDebouncedRef("initial", 100);
    value.value = "flushed-update";
    expect(isPending.value).toBe(true);

    flush();
    expect(isPending.value).toBe(false);
    expect(value.value).toBe("flushed-update");
  });
});
