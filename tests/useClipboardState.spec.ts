import { describe, it, expect, vi } from "vitest";
import { useClipboardState } from "../src/composables/useClipboardState";

describe("useClipboardState", () => {
  it("copies text successfully and toggles copied state", async () => {
    let clipboardStore = "";
    const mockNav = {
      clipboard: {
        writeText: vi.fn(async (txt: string) => {
          clipboardStore = txt;
        })
      }
    } as unknown as Navigator;

    const { copy, copied, text, isSupported, error } = useClipboardState({
      navigator: mockNav,
      timeout: 50
    });

    expect(isSupported).toBe(true);
    expect(copied.value).toBe(false);

    const ok = await copy("git commit -m 'feat: enterprise composable'");
    expect(ok).toBe(true);
    expect(clipboardStore).toBe("git commit -m 'feat: enterprise composable'");
    expect(text.value).toBe("git commit -m 'feat: enterprise composable'");
    expect(copied.value).toBe(true);
    expect(error.value).toBeNull();

    // After timeout, copied resets to false
    await new Promise((r) => setTimeout(r, 60));
    expect(copied.value).toBe(false);
  });

  it("handles writeText rejection gracefully", async () => {
    const mockNav = {
      clipboard: {
        writeText: vi.fn(async () => {
          throw new Error("Permission denied by browser policy");
        })
      }
    } as unknown as Navigator;

    const { copy, copied, error } = useClipboardState({
      navigator: mockNav
    });

    const ok = await copy("test");
    expect(ok).toBe(false);
    expect(copied.value).toBe(false);
    expect(error.value?.message).toBe("Permission denied by browser policy");
  });
});
