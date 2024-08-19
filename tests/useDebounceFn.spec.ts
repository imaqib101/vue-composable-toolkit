import { describe, it, expect, vi } from "vitest";
import { useDebounceFn } from "../src/useDebounceFn";

describe("useDebounceFn", () => {
  it("should debounce function calls", async () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const { run } = useDebounceFn(spy, 100);

    run();
    run();
    run();

    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
