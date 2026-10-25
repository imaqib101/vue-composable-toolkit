import { ref, type Ref } from "vue";

export interface UseClipboardStateOptions {
  timeout?: number;
  navigator?: Navigator;
}

export interface UseClipboardStateReturn {
  text: Ref<string>;
  copied: Ref<boolean>;
  isSupported: boolean;
  error: Ref<Error | null>;
  copy: (textToCopy: string) => Promise<boolean>;
}

export function useClipboardState(
  options: UseClipboardStateOptions = {}
): UseClipboardStateReturn {
  const timeout = options.timeout ?? 2000;
  const nav = options.navigator ?? (typeof navigator !== "undefined" ? navigator : undefined);

  const text = ref<string>("");
  const copied = ref<boolean>(false);
  const error = ref<Error | null>(null);

  const isSupported = Boolean(nav && "clipboard" in nav && typeof nav.clipboard.writeText === "function");
  let timer: any = null;

  async function copy(textToCopy: string): Promise<boolean> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    try {
      if (isSupported && nav?.clipboard) {
        await nav.clipboard.writeText(textToCopy);
      } else {
        // Fallback or unsupported simulation
        throw new Error("Clipboard API not supported in this runtime environment");
      }

      text.value = textToCopy;
      copied.value = true;
      error.value = null;

      timer = setTimeout(() => {
        copied.value = false;
        timer = null;
      }, timeout);

      return true;
    } catch (err: any) {
      error.value = err instanceof Error ? err : new Error(String(err));
      copied.value = false;
      return false;
    }
  }

  return {
    text,
    copied,
    isSupported,
    error,
    copy
  };
}
