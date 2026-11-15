import { describe, it, expect } from 'vitest';
import { useHistoryState } from '../src/composables/useHistoryState';

describe('useHistoryState', () => {
  it('initializes with initial state and empty history stacks', () => {
    const { state, canUndo, canRedo, past, future } = useHistoryState({ count: 1 });

    expect(state.value).toEqual({ count: 1 });
    expect(canUndo.value).toBe(false);
    expect(canRedo.value).toBe(false);
    expect(past.value).toHaveLength(0);
    expect(future.value).toHaveLength(0);
  });

  it('records snapshots upon commit and allows undo and redo', () => {
    const history = useHistoryState('v1');

    history.commit();
    history.state.value = 'v2';

    history.commit();
    history.state.value = 'v3';

    expect(history.state.value).toBe('v3');
    expect(history.canUndo.value).toBe(true);
    expect(history.canRedo.value).toBe(false);
    expect(history.past.value).toHaveLength(2);

    // Undo to v2
    const undone1 = history.undo();
    expect(undone1).toBe(true);
    expect(history.state.value).toBe('v2');
    expect(history.canUndo.value).toBe(true);
    expect(history.canRedo.value).toBe(true);
    expect(history.future.value).toHaveLength(1);

    // Undo to v1
    const undone2 = history.undo();
    expect(undone2).toBe(true);
    expect(history.state.value).toBe('v1');
    expect(history.canUndo.value).toBe(false);
    expect(history.canRedo.value).toBe(true);

    // Further undo returns false
    expect(history.undo()).toBe(false);

    // Redo back to v2
    const redone1 = history.redo();
    expect(redone1).toBe(true);
    expect(history.state.value).toBe('v2');
    expect(history.canUndo.value).toBe(true);
    expect(history.canRedo.value).toBe(true);

    // Redo back to v3
    const redone2 = history.redo();
    expect(redone2).toBe(true);
    expect(history.state.value).toBe('v3');
    expect(history.canUndo.value).toBe(true);
    expect(history.canRedo.value).toBe(false);

    // Further redo returns false
    expect(history.redo()).toBe(false);
  });

  it('clears redo stack when a new commit is made', () => {
    const history = useHistoryState(10);

    history.commit();
    history.state.value = 20;

    history.undo();
    expect(history.state.value).toBe(10);
    expect(history.canRedo.value).toBe(true);

    // Branch off with new action
    history.commit();
    history.state.value = 30;

    expect(history.canRedo.value).toBe(false);
    expect(history.future.value).toHaveLength(0);
  });

  it('respects capacity limit by dropping oldest entries', () => {
    const history = useHistoryState(0, { capacity: 3 });

    for (let i = 1; i <= 5; i++) {
      history.commit();
      history.state.value = i;
    }

    expect(history.past.value).toHaveLength(3);
    expect(history.past.value.map(r => r.snapshot)).toEqual([2, 3, 4]);
  });

  it('resets state and stacks to initial value or given new value', () => {
    const history = useHistoryState({ title: 'init' });

    history.commit();
    history.state.value = { title: 'updated' };
    expect(history.canUndo.value).toBe(true);

    history.reset();
    expect(history.state.value).toEqual({ title: 'init' });
    expect(history.canUndo.value).toBe(false);
    expect(history.canRedo.value).toBe(false);
    expect(history.past.value).toHaveLength(0);

    history.commit();
    history.state.value = { title: 'draft 2' };
    history.reset({ title: 'brand-new' });
    expect(history.state.value).toEqual({ title: 'brand-new' });
    expect(history.canUndo.value).toBe(false);
  });
});
