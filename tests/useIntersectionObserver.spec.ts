import { describe, it, expect, vi, afterEach } from "vitest";
import { nextTick } from "vue";
import { useIntersectionObserver } from "../src/composables/useIntersectionObserver";

type Callback = (entries: Array<{ isIntersecting: boolean }>) => void;

class FakeObserver {
  static instances: FakeObserver[] = [];
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(
    public callback: Callback,
    public options: unknown
  ) {
    FakeObserver.instances.push(this);
  }
}

function install() {
  FakeObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal("window", { IntersectionObserver: FakeObserver });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIntersectionObserver", () => {
  it("observes the target element with the given options", async () => {
    install();
    const { targetRef, isIntersecting } = useIntersectionObserver({
      rootMargin: "10px",
      threshold: 0.5
    });
    expect(isIntersecting.value).toBe(false);

    const el = {} as HTMLElement;
    targetRef.value = el;
    await nextTick();
    await nextTick();

    const [observer] = FakeObserver.instances;
    expect(observer.observe).toHaveBeenCalledWith(el);
    expect(observer.options).toMatchObject({ rootMargin: "10px", threshold: 0.5 });

    observer.callback([{ isIntersecting: true }]);
    expect(isIntersecting.value).toBe(true);
    observer.callback([{ isIntersecting: false }]);
    expect(isIntersecting.value).toBe(false);
  });

  it("disconnects after first visibility when freezeOnceVisible is set", async () => {
    install();
    const { targetRef } = useIntersectionObserver({ freezeOnceVisible: true });
    targetRef.value = {} as HTMLElement;
    await nextTick();
    await nextTick();

    const [observer] = FakeObserver.instances;
    observer.callback([{ isIntersecting: true }]);
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("disconnects when the target is cleared or stop() is called", async () => {
    install();
    const { targetRef, stop } = useIntersectionObserver();
    targetRef.value = {} as HTMLElement;
    await nextTick();
    await nextTick();
    const [observer] = FakeObserver.instances;

    targetRef.value = null;
    await nextTick();
    await nextTick();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);

    stop();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it("reports visible when IntersectionObserver is unavailable", async () => {
    vi.stubGlobal("window", {});
    const { targetRef, isIntersecting } = useIntersectionObserver();
    targetRef.value = {} as HTMLElement;
    await nextTick();
    await nextTick();
    expect(isIntersecting.value).toBe(true);
  });
});
