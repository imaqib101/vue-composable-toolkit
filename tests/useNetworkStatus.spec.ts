import { describe, it, expect, vi, afterEach } from "vitest";
import { useNetworkStatus } from "../src/composables/useNetworkStatus";

type Listener = () => void;

function installGlobals(connection?: Record<string, unknown>) {
  const listeners: Record<string, Set<Listener>> = {};
  const win = {
    addEventListener: vi.fn((type: string, fn: Listener) => {
      (listeners[type] ??= new Set()).add(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: Listener) => {
      listeners[type]?.delete(fn);
    })
  };
  const nav: Record<string, unknown> = { onLine: true };
  if (connection) nav.connection = connection;
  vi.stubGlobal("window", win);
  vi.stubGlobal("navigator", nav);
  return { listeners, win, nav };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useNetworkStatus", () => {
  it("reads initial online state and connection details", () => {
    installGlobals({
      downlink: 10,
      rtt: 50,
      effectiveType: "4g",
      saveData: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    const status = useNetworkStatus();
    expect(status.isOnline.value).toBe(true);
    expect(status.downlink.value).toBe(10);
    expect(status.rtt.value).toBe(50);
    expect(status.effectiveType.value).toBe("4g");
    expect(status.saveData.value).toBe(true);
  });

  it("falls back to null/false when the Network Information API is missing", () => {
    installGlobals();
    const status = useNetworkStatus();
    expect(status.downlink.value).toBeNull();
    expect(status.effectiveType.value).toBeNull();
    expect(status.saveData.value).toBe(false);
  });

  it("tracks online/offline events when used outside a component", () => {
    const { listeners } = installGlobals();
    const status = useNetworkStatus();
    expect(listeners.online.size).toBe(1);

    listeners.offline.forEach((fn) => fn());
    expect(status.isOnline.value).toBe(false);
    listeners.online.forEach((fn) => fn());
    expect(status.isOnline.value).toBe(true);
  });

  it("does not warn about lifecycle hooks outside a component", () => {
    installGlobals();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    useNetworkStatus();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
