import { describe, it, expect } from "vitest";
import { useAsyncQueue } from "../src/composables/useAsyncQueue";

describe("useAsyncQueue", () => {
  it("processes tasks with concurrency limit and tracks status", async () => {
    const queue = useAsyncQueue<number>({ concurrency: 2 });
    let running = 0;
    let maxRunning = 0;

    const createTask = (val: number, delayMs: number) => () =>
      new Promise<number>((resolve) => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        setTimeout(() => {
          running--;
          resolve(val);
        }, delayMs);
      });

    const p1 = queue.push(createTask(1, 40));
    const p2 = queue.push(createTask(2, 40));
    const p3 = queue.push(createTask(3, 20));

    expect(queue.activeCount.value).toBe(2);
    expect(queue.pendingCount.value).toBe(1);

    const results = await Promise.all([p1, p2, p3]);

    expect(results).toEqual([1, 2, 3]);
    expect(maxRunning).toBe(2);
    expect(queue.completedCount.value).toBe(3);
    expect(queue.pendingCount.value).toBe(0);
    expect(queue.activeCount.value).toBe(0);
  });

  it("handles retries when tasks fail", async () => {
    const queue = useAsyncQueue<string>({ maxRetries: 2, retryDelayMs: 10 });
    let attempts = 0;

    const flakyTask = () =>
      new Promise<string>((resolve, reject) => {
        attempts++;
        if (attempts < 3) {
          reject(new Error("Temporary network glitch"));
        } else {
          resolve("success on attempt 3");
        }
      });

    const result = await queue.push(flakyTask);

    expect(result).toBe("success on attempt 3");
    expect(attempts).toBe(3);
    expect(queue.completedCount.value).toBe(1);
    expect(queue.failedCount.value).toBe(0);
  });

  it("supports pause, resume, and onIdle synchronization", async () => {
    const queue = useAsyncQueue<string>({ concurrency: 1 });
    queue.pause();
    expect(queue.isPaused.value).toBe(true);

    let executed = false;
    queue.push(async () => {
      executed = true;
      return "done";
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(executed).toBe(false);

    queue.resume();
    expect(queue.isPaused.value).toBe(false);

    await queue.onIdle();
    expect(executed).toBe(true);
    expect(queue.completedCount.value).toBe(1);
  });
});
