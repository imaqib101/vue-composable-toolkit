import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useIntersectionObserver } from "../src/composables/useIntersectionObserver";

describe("useIntersectionObserver", () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let capturedCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;

  beforeEach(() => {
    observeMock = vi.fn();
    disconnectMock = vi.fn();

    const mockIntersectionObserver = vi.fn().mockImplementation((callback, options) => {
      capturedCallback = callback;
      return {
        observe: observeMock,
        disconnect: disconnectMock,
        unobserve: vi.fn(),
        root: options?.root ?? null,
        rootMargin: options?.rootMargin ?? "0px",
        thresholds: [0],
        takeRecords: () => [],
      };
    });

    vi.stubGlobal("window", {
      IntersectionObserver: mockIntersectionObserver,
    });
    vi.stubGlobal("IntersectionObserver", mockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("initializes with isIntersecting = false and targetRef = null", () => {
    const { isIntersecting, targetRef } = useIntersectionObserver();
    expect(isIntersecting.value).toBe(false);
    expect(targetRef.value).toBeNull();
  });

  it("observes element when targetRef is assigned", async () => {
    const { targetRef } = useIntersectionObserver();
    const mockEl = {} as HTMLElement;

    targetRef.value = mockEl;
    // Wait for post flush watch
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(observeMock).toHaveBeenCalledWith(mockEl);
  });

  it("updates isIntersecting state when intersection change callback fires", async () => {
    const { isIntersecting, targetRef } = useIntersectionObserver();
    const mockEl = {} as HTMLElement;

    targetRef.value = mockEl;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(isIntersecting.value).toBe(false);

    // Simulate intersecting
    capturedCallback([{ isIntersecting: true } as any]);
    expect(isIntersecting.value).toBe(true);

    // Simulate leaving viewport
    capturedCallback([{ isIntersecting: false } as any]);
    expect(isIntersecting.value).toBe(false);
  });

  it("freezes once visible when freezeOnceVisible is true", async () => {
    const { isIntersecting, targetRef } = useIntersectionObserver({
      freezeOnceVisible: true,
    });
    const mockEl = {} as HTMLElement;

    targetRef.value = mockEl;
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate element becoming visible
    capturedCallback([{ isIntersecting: true } as any]);
    expect(isIntersecting.value).toBe(true);
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("disconnects when stop() is invoked", async () => {
    const { targetRef, stop } = useIntersectionObserver();
    const mockEl = {} as HTMLElement;

    targetRef.value = mockEl;
    await new Promise((resolve) => setTimeout(resolve, 0));

    stop();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it("falls back to true when IntersectionObserver is not supported in window", async () => {
    vi.stubGlobal("window", {});

    const { isIntersecting, targetRef } = useIntersectionObserver();
    const mockEl = {} as HTMLElement;

    targetRef.value = mockEl;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(isIntersecting.value).toBe(true);
  });
});
