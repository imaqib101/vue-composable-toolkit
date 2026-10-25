import { ref, type Ref } from "vue";

export interface AsyncQueueTask<T = any> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  retriesRemaining: number;
}

export interface UseAsyncQueueOptions {
  concurrency?: number;
  autoDrain?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface UseAsyncQueueReturn<T = any> {
  pendingCount: Ref<number>;
  activeCount: Ref<number>;
  completedCount: Ref<number>;
  failedCount: Ref<number>;
  isPaused: Ref<boolean>;
  push: (task: () => Promise<T>, id?: string) => Promise<T>;
  pause: () => void;
  resume: () => void;
  clear: () => void;
  onIdle: () => Promise<void>;
}

export function useAsyncQueue<T = any>(
  options: UseAsyncQueueOptions = {}
): UseAsyncQueueReturn<T> {
  const concurrency = options.concurrency ?? 1;
  const maxRetries = options.maxRetries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? 50;

  const queue: AsyncQueueTask<T>[] = [];
  const pendingCount = ref(0);
  const activeCount = ref(0);
  const completedCount = ref(0);
  const failedCount = ref(0);
  const isPaused = ref(false);

  let idleResolvers: (() => void)[] = [];
  let taskIdCounter = 0;

  function checkIdle() {
    if (queue.length === 0 && activeCount.value === 0) {
      const resolvers = idleResolvers;
      idleResolvers = [];
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }

  async function drain() {
    if (isPaused.value) return;

    while (!isPaused.value && activeCount.value < concurrency && queue.length > 0) {
      const task = queue.shift()!;
      pendingCount.value = queue.length;
      activeCount.value++;

      (async () => {
        try {
          const result = await task.fn();
          completedCount.value++;
          task.resolve(result);
        } catch (err) {
          if (task.retriesRemaining > 0) {
            task.retriesRemaining--;
            if (retryDelayMs > 0) {
              await new Promise((r) => setTimeout(r, retryDelayMs));
            }
            queue.unshift(task);
            pendingCount.value = queue.length;
          } else {
            failedCount.value++;
            task.reject(err);
          }
        } finally {
          activeCount.value--;
          checkIdle();
          drain();
        }
      })();
    }
  }

  function push(taskFn: () => Promise<T>, id?: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: AsyncQueueTask<T> = {
        id: id ?? `task_${++taskIdCounter}`,
        fn: taskFn,
        resolve,
        reject,
        retriesRemaining: maxRetries
      };

      queue.push(task);
      pendingCount.value = queue.length;

      if (!isPaused.value) {
        drain();
      }
    });
  }

  function pause() {
    isPaused.value = true;
  }

  function resume() {
    if (isPaused.value) {
      isPaused.value = false;
      drain();
    }
  }

  function clear() {
    for (const task of queue) {
      task.reject(new Error("Queue cleared"));
    }
    queue.length = 0;
    pendingCount.value = 0;
    checkIdle();
  }

  function onIdle(): Promise<void> {
    if (queue.length === 0 && activeCount.value === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      idleResolvers.push(resolve);
    });
  }

  return {
    pendingCount,
    activeCount,
    completedCount,
    failedCount,
    isPaused,
    push,
    pause,
    resume,
    clear,
    onIdle
  };
}
