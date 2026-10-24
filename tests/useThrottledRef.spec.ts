import { describe, it, expect, vi } from "vitest";
import { useThrottledRef } from "../src/composables/useThrottledRef";

describe("useThrottledRef", () => {
  it("executes immediately on leading edge", () => {
    vi.useFakeTimers();
    const throttled = useThrottledRef("first", { delay: 200, leading: true });
    expect(throttled.value).toBe("first");

    throttled.value = "second";
    expect(throttled.value).toBe("second"); // immediate leading execution

    throttled.value = "third";
    expect(throttled.value).toBe("second"); // throttled

    vi.advanceTimersByTime(200);
    expect(throttled.value).toBe("third"); // trailing execution
    vi.useRealTimers();
  });
});
