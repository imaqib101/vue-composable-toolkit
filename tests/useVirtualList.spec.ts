import { describe, it, expect } from "vitest";
import { useVirtualList } from "../src/composables/useVirtualList";

describe("useVirtualList", () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, label: `Row ${i}` }));

  it("calculates correct total height and initial slice", () => {
    const { virtualRows, totalHeight, offsetY } = useVirtualList({
      items,
      itemHeight: 50,
      containerHeight: 500,
      overscan: 2
    });

    expect(totalHeight.value).toBe(50000); // 1000 * 50
    expect(offsetY.value).toBe(0);

    // Initial slice: startNode = 0, visibleCount = 10, overscan = 2 -> 0 to 12 items
    expect(virtualRows.value.length).toBe(12);
    expect(virtualRows.value[0].data.id).toBe(0);
    expect(virtualRows.value[11].data.id).toBe(11);
  });

  it("updates slice dynamically when scroll occurs", () => {
    const { virtualRows, totalHeight, offsetY, containerProps } = useVirtualList({
      items,
      itemHeight: 50,
      containerHeight: 500,
      overscan: 2
    });

    // Simulate scrolling to 1000px
    containerProps.onScroll({
      target: { scrollTop: 1000 }
    } as any);

    // at scrollTop = 1000: startNode = 20, visible = 10
    // startIndex = 20 - 2 = 18, endIndex = 20 + 10 + 2 = 32
    expect(offsetY.value).toBe(18 * 50); // 900
    expect(virtualRows.value[0].data.id).toBe(18);
    expect(virtualRows.value[virtualRows.value.length - 1].data.id).toBe(31);
  });

  it("scrolls to index accurately", () => {
    const { virtualRows, scrollToIndex } = useVirtualList({
      items,
      itemHeight: 50,
      containerHeight: 500,
      overscan: 1
    });

    scrollToIndex(50);
    // startNode = 50, startIndex = 49
    expect(virtualRows.value[0].data.id).toBe(49);
  });
});
