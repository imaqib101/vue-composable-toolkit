import { describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useDebouncedRef } from "../src/useDebouncedRef";

describe("useDebouncedRef", () => {
  it("debounces value updates", async () => {
    vi.useFakeTimers();
    const val = useDebouncedRef("initial", 100);
    expect(val.value).toBe("initial");

    val.value = "updated";
    expect(val.value).toBe("initial"); // not updated immediately

    vi.advanceTimersByTime(100);
    expect(val.value).toBe("updated");
    vi.useRealTimers();
  });
});
