import { shallowRef, computed, type ShallowRef, type ComputedRef } from 'vue';

export interface UseHistoryStateRecord<T> {
  snapshot: T;
  timestamp: number;
}

export interface UseHistoryStateOptions<T> {
  /** Maximum number of history snapshots to retain (default: 50). */
  capacity?: number;
  /** Custom deep clone or serialization function (defaults to structuredClone or JSON roundtrip). */
  clone?: (val: T) => T;
}

export interface UseHistoryStateReturn<T> {
  /** Current active state */
  state: ShallowRef<T>;
  /** Undo to previous state */
  undo: () => boolean;
  /** Redo to next undone state */
  redo: () => boolean;
  /** Whether an undo action is available */
  canUndo: ComputedRef<boolean>;
  /** Whether a redo action is available */
  canRedo: ComputedRef<boolean>;
  /** Push a new state update manually into history */
  commit: () => void;
  /** Reset history stacks back to initial or specified value */
  reset: (newInitial?: T) => void;
  /** Read-only list of past snapshots */
  past: ComputedRef<UseHistoryStateRecord<T>[]>;
  /** Read-only list of future snapshots (available for redo) */
  future: ComputedRef<UseHistoryStateRecord<T>[]>;
}

function defaultClone<T>(val: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(val);
  }
  return JSON.parse(JSON.stringify(val));
}

/**
 * Enterprise-grade undo/redo history state composable for Vue 3.
 * Maintains bounded stacks, supports undo, redo, commit, and resets.
 */
export function useHistoryState<T>(
  initialValue: T,
  options: UseHistoryStateOptions<T> = {}
): UseHistoryStateReturn<T> {
  const capacity = options.capacity ?? 50;
  const clone = options.clone ?? defaultClone;

  const state = shallowRef<T>(clone(initialValue));
  const undoStack = shallowRef<UseHistoryStateRecord<T>[]>([]);
  const redoStack = shallowRef<UseHistoryStateRecord<T>[]>([]);

  // Push the current state to history stack
  const commit = () => {
    const nextUndo = [...undoStack.value, {
      snapshot: clone(state.value),
      timestamp: Date.now(),
    }];

    if (nextUndo.length > capacity) {
      nextUndo.shift();
    }

    undoStack.value = nextUndo;
    // New action invalidates future redo branch
    redoStack.value = [];
  };

  const undo = (): boolean => {
    if (undoStack.value.length === 0) {
      return false;
    }

    const currentPast = [...undoStack.value];
    const previousRecord = currentPast.pop()!;

    redoStack.value = [
      ...redoStack.value,
      {
        snapshot: clone(state.value),
        timestamp: Date.now(),
      },
    ];

    undoStack.value = currentPast;
    state.value = clone(previousRecord.snapshot);
    return true;
  };

  const redo = (): boolean => {
    if (redoStack.value.length === 0) {
      return false;
    }

    const currentFuture = [...redoStack.value];
    const nextRecord = currentFuture.pop()!;

    undoStack.value = [
      ...undoStack.value,
      {
        snapshot: clone(state.value),
        timestamp: Date.now(),
      },
    ];

    redoStack.value = currentFuture;
    state.value = clone(nextRecord.snapshot);
    return true;
  };

  const reset = (newInitial?: T) => {
    const val = newInitial !== undefined ? clone(newInitial) : clone(initialValue);
    state.value = val;
    undoStack.value = [];
    redoStack.value = [];
  };

  return {
    state,
    undo,
    redo,
    canUndo: computed(() => undoStack.value.length > 0),
    canRedo: computed(() => redoStack.value.length > 0),
    commit,
    reset,
    past: computed(() => [...undoStack.value]),
    future: computed(() => [...redoStack.value]),
  };
}
