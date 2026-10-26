import { describe, it, expect, vi } from "vitest";
import { useMediaQuery } from "../src/composables/useMediaQuery";

describe("useMediaQuery", () => {
  it("initializes with default value when window is undefined or matchMedia is missing", () => {
    const matches = useMediaQuery("(min-width: 768px)", { defaultValue: true });
    expect(matches.value).toBe(true);
  });

  it("registers matchMedia listener and updates reactive state on change", () => {
    let changeListener: ((e: { matches: boolean }) => void) | null = null;
    let currentMatches = false;

    const mockMatchMedia = vi.fn((query: string) => ({
      get matches() {
        return currentMatches;
      },
      media: query,
      addEventListener: vi.fn((event: string, cb: any) => {
        if (event === "change") {
          changeListener = cb;
        }
      }),
      removeEventListener: vi.fn()
    }));

    vi.stubGlobal("window", {
      matchMedia: mockMatchMedia
    });

    const matches = useMediaQuery("(min-width: 1024px)");
    expect(mockMatchMedia).toHaveBeenCalledWith("(min-width: 1024px)");
    expect(matches.value).toBe(false);

    // Simulate window resizing / media query change
    currentMatches = true;
    if (changeListener) {
      (changeListener as any)({ matches: true });
    }

    expect(matches.value).toBe(true);

    vi.unstubAllGlobals();
  });
});
