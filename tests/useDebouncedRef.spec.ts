import { describe, it, expect, vi } from "vitest";
import { useDebouncedRef } from "../src/composables/useDebouncedRef";

describe("useDebouncedRef", () => {
  it("initializes with the initial value", () => {
    const { value, isPending } = useDebouncedRef("initial", 100);
    expect(value.value).toBe("initial");
    expect(isPending.value).toBe(false);
  });

  it("updates value only after the specified delay", async () => {
    vi.useFakeTimers();
    const { value, isPending } = useDebouncedRef("initial", 200);

    value.value = "updated";
    expect(isPending.value).toBe(true);
    expect(value.value).toBe("initial");

    vi.advanceTimersByTime(100);
    expect(value.value).toBe("initial");
    expect(isPending.value).toBe(true);

    vi.advanceTimersByTime(100);
    expect(value.value).toBe("updated");
    expect(isPending.value).toBe(false);
    vi.useRealTimers();
  });

  it("supports flush to apply pending value immediately", () => {
    vi.useFakeTimers();
    const { value, isPending, flush } = useDebouncedRef("initial", 300);

    value.value = "fast-forward";
    expect(isPending.value).toBe(true);
    flush();

    expect(value.value).toBe("fast-forward");
    expect(isPending.value).toBe(false);
    vi.useRealTimers();
  });

  it("supports cancel to discard pending changes", () => {
    vi.useFakeTimers();
    const { value, isPending, cancel } = useDebouncedRef("initial", 300);

    value.value = "discard-me";
    expect(isPending.value).toBe(true);
    cancel();

    expect(isPending.value).toBe(false);
    vi.advanceTimersByTime(350);
    expect(value.value).toBe("initial");
    vi.useRealTimers();
  });
});
