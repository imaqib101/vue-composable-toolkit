import { ref, watch, onScopeDispose, type Ref } from "vue";

export interface IntersectionObserverOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export function useIntersectionObserver(
  target: Ref<Element | null | undefined>,
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverOptions = {}
) {
  const isSupported = typeof window !== "undefined" && "IntersectionObserver" in window;
  const isIntersecting = ref(false);
  let observer: IntersectionObserver | null = null;

  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  if (isSupported) {
    watch(
      target,
      (el) => {
        cleanup();
        if (!el) return;

        observer = new IntersectionObserver((entries) => {
          isIntersecting.value = entries.some((e) => e.isIntersecting);
          callback(entries);
        }, options);

        observer.observe(el);
      },
      { immediate: true, flush: "post" }
    );
  }

  onScopeDispose(cleanup);

  return {
    isSupported,
    isIntersecting,
    stop: cleanup
  };
}
