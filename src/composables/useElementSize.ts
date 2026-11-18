import { ref, watch, getCurrentScope, onScopeDispose, type Ref } from 'vue';

export interface ElementSize {
  width: number;
  height: number;
}

export interface UseElementSizeOptions {
  /** Initial width before measurement or during SSR. Defaults to 0. */
  initialWidth?: number;
  /** Initial height before measurement or during SSR. Defaults to 0. */
  initialHeight?: number;
  /** Which box model to observe. Defaults to 'content-box'. */
  box?: ResizeObserverBoxOptions;
}

export interface UseElementSizeReturn {
  /** Reactive element width */
  width: Ref<number>;
  /** Reactive element height */
  height: Ref<number>;
  /** Ref to bind to the target element */
  targetRef: Ref<HTMLElement | null>;
  /** Manually disconnect the ResizeObserver */
  stop: () => void;
}

/**
 * Enterprise Vue 3 composable to observe and react to DOM element dimensions via ResizeObserver.
 * Features automatic cleanup on element unmount or scope disposal, SSR-safety, and configurable box sizing.
 */
export function useElementSize(
  options: UseElementSizeOptions = {}
): UseElementSizeReturn {
  const { initialWidth = 0, initialHeight = 0, box = 'content-box' } = options;

  const width = ref(initialWidth);
  const height = ref(initialHeight);
  const targetRef = ref<HTMLElement | null>(null);

  let observer: ResizeObserver | null = null;

  const stop = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const start = (el: HTMLElement) => {
    stop();

    if (typeof window === 'undefined' || typeof (window as any).ResizeObserver === 'undefined') {
      // Graceful fallback for non-browser / SSR environments
      width.value = el.clientWidth || initialWidth;
      height.value = el.clientHeight || initialHeight;
      return;
    }

    observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      if (box === 'border-box' && entry.borderBoxSize && entry.borderBoxSize.length > 0) {
        width.value = entry.borderBoxSize[0].inlineSize;
        height.value = entry.borderBoxSize[0].blockSize;
      } else if (entry.contentBoxSize && entry.contentBoxSize.length > 0) {
        width.value = entry.contentBoxSize[0].inlineSize;
        height.value = entry.contentBoxSize[0].blockSize;
      } else {
        // Fallback to contentRect
        width.value = entry.contentRect.width;
        height.value = entry.contentRect.height;
      }
    });

    observer.observe(el, { box });
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
    { flush: 'post' }
  );

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stop();
    });
  }

  return {
    width,
    height,
    targetRef,
    stop,
  };
}
