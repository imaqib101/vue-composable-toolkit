import { ref, watch, type Ref } from "vue";

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const data = ref<T>(read()) as Ref<T>;

  watch(
    data,
    (val) => {
      try {
        if (val === null || val === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(val));
        }
      } catch (e) {
        console.warn(`[useLocalStorage] failed writing ${key}:`, e);
      }
    },
    { deep: true }
  );

  return data;
}
