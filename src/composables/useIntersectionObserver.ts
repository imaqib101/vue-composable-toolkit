import { ref, watch, type Ref } from "vue";

export interface UseIntersectionObserverOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
  freezeOnceVisible?: boolean;
}

export interface UseIntersectionObserverReturn {
  isIntersecting: Ref<boolean>;
  targetRef: Ref<HTMLElement | null>;
  stop: () => void;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const { root = null, rootMargin = "0px", threshold = 0, freezeOnceVisible = false } = options;

  const isIntersecting = ref(false);
  const targetRef = ref<HTMLElement | null>(null);
  let observer: IntersectionObserver | null = null;

  const stop = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const start = (el: HTMLElement) => {
    stop();
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      isIntersecting.value = true;
      return;
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        const isElementVisible = entry.isIntersecting;
        isIntersecting.value = isElementVisible;

        if (isElementVisible && freezeOnceVisible) {
          stop();
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(el);
  };

  watch(
    targetRef,
    (el) => {
      if (el) {
        start(el);
      } else {
        stop();
      }
    },
    { flush: "post" }
  );

  return {
    isIntersecting,
    targetRef,
    stop
  };
}
