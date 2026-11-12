import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { usePrevious } from '../src/composables/usePrevious';

describe('usePrevious', () => {
  it('tracks the previous value when a ref changes', () => {
    const count = ref(0);
    const previousCount = usePrevious(count);

    expect(previousCount.value).toBeUndefined();

    count.value = 1;
    expect(previousCount.value).toBe(0);

    count.value = 5;
    expect(previousCount.value).toBe(1);

    count.value = 10;
    expect(previousCount.value).toBe(5);
  });

  it('works with string refs', () => {
    const name = ref('Alice');
    const previousName = usePrevious(name);

    expect(previousName.value).toBeUndefined();

    name.value = 'Bob';
    expect(previousName.value).toBe('Alice');

    name.value = 'Charlie';
    expect(previousName.value).toBe('Bob');
  });
});
