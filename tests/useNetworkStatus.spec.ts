import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { effectScope } from "vue";
import { useNetworkStatus } from "../src/composables/useNetworkStatus";

describe("useNetworkStatus", () => {
  let listeners: Record<string, ((e?: any) => void)[]> = {};

  beforeEach(() => {
    listeners = {};

    const mockWindow = {
      addEventListener: vi.fn((event: string, cb: any) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: any) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((fn) => fn !== cb);
        }
      }),
    };

    const mockNavigator = {
      onLine: true,
      connection: {
        downlink: 10,
        rtt: 50,
        effectiveType: "4g",
        saveData: false,
        addEventListener: vi.fn((event: string, cb: any) => {
          listeners[`connection:${event}`] = listeners[`connection:${event}`] || [];
          listeners[`connection:${event}`].push(cb);
        }),
        removeEventListener: vi.fn((event: string, cb: any) => {
          if (listeners[`connection:${event}`]) {
            listeners[`connection:${event}`] = listeners[`connection:${event}`].filter(
              (fn) => fn !== cb
            );
          }
        }),
      },
    };

    vi.stubGlobal("window", mockWindow);
    vi.stubGlobal("navigator", mockNavigator);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("initializes with current navigator connection stats", () => {
    const scope = effectScope();
    scope.run(() => {
      const { isOnline, downlink, rtt, effectiveType, saveData } = useNetworkStatus();
      expect(isOnline.value).toBe(true);
      expect(downlink.value).toBe(10);
      expect(rtt.value).toBe(50);
      expect(effectiveType.value).toBe("4g");
      expect(saveData.value).toBe(false);
    });
    scope.stop();
  });

  it("updates isOnline when offline/online events fire", () => {
    const scope = effectScope();
    scope.run(() => {
      const { isOnline } = useNetworkStatus();
      expect(isOnline.value).toBe(true);

      // Trigger offline
      listeners["offline"]?.forEach((fn) => fn());
      expect(isOnline.value).toBe(false);

      // Trigger online
      listeners["online"]?.forEach((fn) => fn());
      expect(isOnline.value).toBe(true);
    });
    scope.stop();
  });

  it("updates connection metrics when connection change event fires", () => {
    const scope = effectScope();
    scope.run(() => {
      const { downlink, rtt, effectiveType } = useNetworkStatus();

      // Simulate network degradation
      (navigator as any).connection.downlink = 1.5;
      (navigator as any).connection.rtt = 300;
      (navigator as any).connection.effectiveType = "3g";

      listeners["connection:change"]?.forEach((fn) => fn());

      expect(downlink.value).toBe(1.5);
      expect(rtt.value).toBe(300);
      expect(effectiveType.value).toBe("3g");
    });
    scope.stop();
  });

  it("cleans up event listeners when effect scope is stopped", () => {
    const scope = effectScope();
    scope.run(() => {
      useNetworkStatus();
    });

    expect(window.removeEventListener).not.toHaveBeenCalled();
    scope.stop();

    expect(window.removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
