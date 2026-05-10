import { ref } from "vue";

export function useClipboard() {
  const isSupported = typeof navigator !== "undefined" && "clipboard" in navigator;
  const text = ref("");
  const copied = ref(false);

  const copy = async (value: string) => {
    if (!isSupported) return false;
    try {
      await navigator.clipboard.writeText(value);
      text.value = value;
      copied.value = true;
      setTimeout(() => (copied.value = false), 2000);
      return true;
    } catch {
      return false;
    }
  };

  return { isSupported, text, copied, copy };
}
