import { describe, it, expect, beforeEach, vi } from "vitest";
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
});
