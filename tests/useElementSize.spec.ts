import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { effectScope } from 'vue';
import { useElementSize } from '../src/composables/useElementSize';

describe('useElementSize', () => {
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;
  let capturedCallback: (entries: any[]) => void;

  beforeEach(() => {
    observeMock = vi.fn();
    disconnectMock = vi.fn();

    const mockResizeObserver = vi.fn().mockImplementation((callback: (entries: any[]) => void) => {
      capturedCallback = callback;
      return {
        observe: observeMock,
        disconnect: disconnectMock,
        unobserve: vi.fn(),
      };
    });

    vi.stubGlobal('window', {
      ResizeObserver: mockResizeObserver,
    });
    vi.stubGlobal('ResizeObserver', mockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should initialize with default zero or provided initial dimensions', () => {
    const { width, height, targetRef } = useElementSize({
      initialWidth: 120,
      initialHeight: 80,
    });

    expect(width.value).toBe(120);
    expect(height.value).toBe(80);
    expect(targetRef.value).toBeNull();
  });

  it('should observe element when targetRef is assigned', async () => {
    const { targetRef } = useElementSize();
    const mockEl = {} as HTMLElement;

    targetRef.value = mockEl;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(observeMock).toHaveBeenCalledWith(mockEl, { box: 'content-box' });
  });

  it('should update reactive dimensions when ResizeObserver reports changes', async () => {
    const { width, height, targetRef } = useElementSize();
    const mockEl = {} as HTMLElement;
    targetRef.value = mockEl;

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate resize event with contentBoxSize
    capturedCallback([
      {
        target: mockEl,
        contentBoxSize: [{ inlineSize: 450, blockSize: 300 }],
        contentRect: { width: 450, height: 300 },
      },
    ]);

    expect(width.value).toBe(450);
    expect(height.value).toBe(300);
  });

  it('should support border-box observation mode and contentRect fallback', async () => {
    const { width, height, targetRef } = useElementSize({ box: 'border-box' });
    const mockEl = {} as HTMLElement;
    targetRef.value = mockEl;

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(observeMock).toHaveBeenCalledWith(mockEl, { box: 'border-box' });

    capturedCallback([
      {
        target: mockEl,
        borderBoxSize: [{ inlineSize: 600, blockSize: 400 }],
        contentRect: { width: 580, height: 380 },
      },
    ]);

    expect(width.value).toBe(600);
    expect(height.value).toBe(400);

    // Fallback to contentRect when box sizes are empty
    capturedCallback([
      {
        target: mockEl,
        contentRect: { width: 250, height: 150 },
      },
    ]);

    expect(width.value).toBe(250);
    expect(height.value).toBe(150);
  });

  it('should disconnect observer when element is unmounted (targetRef becomes null)', async () => {
    const { targetRef } = useElementSize();
    const mockEl = {} as HTMLElement;
    targetRef.value = mockEl;

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(observeMock).toHaveBeenCalledTimes(1);

    targetRef.value = null;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('should clean up observer on effectScope disposal', async () => {
    const scope = effectScope();
    const mockEl = {} as HTMLElement;

    scope.run(() => {
      const { targetRef } = useElementSize();
      targetRef.value = mockEl;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(observeMock).toHaveBeenCalledWith(mockEl, { box: 'content-box' });

    scope.stop();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('should handle manual stop() correctly', async () => {
    const { targetRef, stop } = useElementSize();
    const mockEl = {} as HTMLElement;
    targetRef.value = mockEl;

    await new Promise((resolve) => setTimeout(resolve, 0));
    stop();

    expect(disconnectMock).toHaveBeenCalled();
  });
});
