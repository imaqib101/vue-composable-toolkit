import { ref, watch, type Ref } from 'vue';

export function usePrevious<T>(source: Ref<T>): Ref<T | undefined> {
  const previous = ref<T | undefined>(undefined) as Ref<T | undefined>;

  watch(
    source,
    (newVal, oldVal) => {
      previous.value = oldVal;
    },
    { immediate: false, flush: 'sync' }
  );

  return previous;
}
