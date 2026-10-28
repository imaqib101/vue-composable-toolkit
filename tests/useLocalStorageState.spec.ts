import { describe, it, expect, beforeEach, vi } from "vitest";
import { effectScope } from "vue";
import { useLocalStorageState } from "../src/composables/useLocalStorageState";

describe("useLocalStorageState", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      }
    };

    (global as any).window = {
      localStorage: mockStorage,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
  });

  it("loads fallback default when key does not exist", () => {
    const theme = useLocalStorageState("app_theme", "dark");
    expect(theme.value).toBe("dark");
  });

  it("loads existing persisted value from storage", () => {
    store["app_theme"] = JSON.stringify("light");
    const theme = useLocalStorageState("app_theme", "dark");
    expect(theme.value).toBe("light");
  });

  it("updates storage on reactive mutation", async () => {
    const profile = useLocalStorageState("user_profile", { role: "viewer" });
    profile.value = { role: "admin" };

    // Wait for Vue watch flush
    await new Promise((r) => setTimeout(r, 10));
    expect(JSON.parse(store["user_profile"])).toEqual({ role: "admin" });
  });

  it("removes the storage listener when its effect scope is disposed", () => {
    const win = (global as any).window;
    const scope = effectScope();
    scope.run(() => useLocalStorageState("scoped", 1));
    expect(win.addEventListener).toHaveBeenCalledWith("storage", expect.any(Function));
    const handler = win.addEventListener.mock.calls[0][1];

    scope.stop();
    expect(win.removeEventListener).toHaveBeenCalledWith("storage", handler);
  });

  it("applies values from storage events with a matching key", () => {
    const win = (global as any).window;
    const state = useLocalStorageState("shared", "a");
    const handler = win.addEventListener.mock.calls[0][1];

    handler({ key: "other", newValue: JSON.stringify("x") });
    expect(state.value).toBe("a");
    handler({ key: "shared", newValue: JSON.stringify("b") });
    expect(state.value).toBe("b");
  });

  it("reports deserialization errors through onError and keeps the fallback", () => {
    store["bad"] = "{not json";
    const onError = vi.fn();
    const state = useLocalStorageState("bad", "fallback", { onError });
    expect(state.value).toBe("fallback");
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
