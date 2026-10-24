import { ref, computed, type Ref, type CSSProperties } from "vue";

export interface VirtualListOptions<T> {
  items: Ref<T[]> | T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualRow<T> {
  data: T;
  index: number;
}

export interface VirtualListReturn<T> {
  virtualRows: Ref<VirtualRow<T>[]>;
  totalHeight: Ref<number>;
  offsetY: Ref<number>;
  containerProps: {
    style: CSSProperties;
    onScroll: (e: UIEvent) => void;
  };
  wrapperProps: {
    style: ComputedRef<CSSProperties>;
  };
  scrollToIndex: (index: number) => void;
}

import type { ComputedRef } from "vue";

export function useVirtualList<T>(options: VirtualListOptions<T>) {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const scrollTop = ref(0);

  const getItems = (): T[] => {
    return Array.isArray(options.items) ? options.items : options.items.value;
  };

  const totalCount = computed(() => getItems().length);
  const totalHeight = computed(() => totalCount.value * itemHeight);

  const visibleRange = computed(() => {
    const startNode = Math.floor(scrollTop.value / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    const startIndex = Math.max(0, startNode - overscan);
    const endIndex = Math.min(totalCount.value, startNode + visibleCount + overscan);

    return { startIndex, endIndex };
  });

  const offsetY = computed(() => {
    return visibleRange.value.startIndex * itemHeight;
  });

  const virtualRows = computed(() => {
    const items = getItems();
    const { startIndex, endIndex } = visibleRange.value;
    const rows: VirtualRow<T>[] = [];

    for (let i = startIndex; i < endIndex; i++) {
      if (items[i] !== undefined) {
        rows.push({
          data: items[i],
          index: i
        });
      }
    }
    return rows;
  });

  const onScroll = (e: UIEvent) => {
    const target = e.target as HTMLElement;
    if (target) {
      scrollTop.value = target.scrollTop;
    }
  };

  let containerEl: HTMLElement | null = null;

  const scrollToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(index, totalCount.value - 1));
    const targetTop = clamped * itemHeight;
    scrollTop.value = targetTop;
    if (containerEl) {
      containerEl.scrollTop = targetTop;
    }
  };

  const containerProps = {
    ref: (el: any) => {
      containerEl = el as HTMLElement;
    },
    style: {
      overflowY: "auto" as const,
      height: `${containerHeight}px`,
      position: "relative" as const
    },
    onScroll
  };

  const wrapperProps = {
    style: computed<CSSProperties>(() => ({
      height: `${totalHeight.value}px`,
      position: "relative" as const,
      transform: `translateY(${offsetY.value}px)`
    }))
  };

  return {
    virtualRows,
    totalHeight,
    offsetY,
    scrollTop,
    containerProps,
    wrapperProps,
    scrollToIndex
  };
}
