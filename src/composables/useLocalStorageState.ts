import { ref, watch, getCurrentScope, onScopeDispose, type Ref } from "vue";

export interface UseLocalStorageOptions<T> {
  serializer?: (value: T) => string;
  deserializer?: (raw: string) => T;
  onError?: (error: unknown) => void;
  syncTabs?: boolean;
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): Ref<T> {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    onError = console.error,
    syncTabs = true
  } = options;

  const readValue = (): T => {
    if (typeof window === "undefined" || !window.localStorage) {
      return initialValue;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) {
        return initialValue;
      }
      return deserializer(raw);
    } catch (err) {
      onError(err);
      return initialValue;
    }
  };

  const state = ref<T>(readValue()) as Ref<T>;

  // Sync state changes to localStorage
  const stopWatch = watch(
    state,
    (newVal) => {
      if (typeof window === "undefined" || !window.localStorage) return;
      try {
        if (newVal === undefined || newVal === null) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, serializer(newVal));
        }
      } catch (err) {
        onError(err);
      }
    },
    { deep: true }
  );

  // Sync cross-tab storage updates
  if (syncTabs && typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          state.value = deserializer(event.newValue);
        } catch (err) {
          onError(err);
        }
      }
    };
    window.addEventListener("storage", onStorage);

    if (getCurrentScope()) {
      onScopeDispose(() => {
        window.removeEventListener("storage", onStorage);
        stopWatch();
      });
    }
  }

  return state;
}
