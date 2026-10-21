import { ref, watch, Ref } from 'vue';

export function useDebouncedRef<T>(value: T, delay = 300): Ref<T> {
  const state = ref(value) as Ref<T>;
  let timeout: any;

  watch(() => value, (newValue: any) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      state.value = newValue;
    }, delay);
  });

  return state;
}
