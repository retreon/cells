import {
  cell,
  formula,
  get,
  batch,
  watch,
  source,
  untracked,
} from '../../index';

describe('formula', () => {
  it('computes derived values', () => {
    const count = cell(5);
    const doubled = formula(() => get(count) * 2);

    expect(get(doubled)).toBe(10);
  });

  it('updates when dependencies change', () => {
    const a = cell(2);
    const b = cell(3);
    const sum = formula(() => get(a) + get(b));

    expect(get(sum)).toBe(5);

    batch((swap) => {
      swap(a, 10);
    });

    expect(get(sum)).toBe(13);

    batch((swap) => {
      swap(b, 20);
    });

    expect(get(sum)).toBe(30);
  });

  it('tracks dynamic dependencies', () => {
    const condition = cell(true);
    const a = cell(1);
    const b = cell(2);

    const result = formula(() => {
      if (get(condition)) {
        return get(a);
      } else {
        return get(b);
      }
    });

    expect(get(result)).toBe(1);

    // Change a - should update
    batch((swap) => {
      swap(a, 10);
    });
    expect(get(result)).toBe(10);

    // Change b - should not update (not a dependency)
    batch((swap) => {
      swap(b, 20);
    });
    expect(get(result)).toBe(10);

    // Switch condition
    batch((swap) => {
      swap(condition, false);
    });
    expect(get(result)).toBe(20);

    // Now a should not update
    batch((swap) => {
      swap(a, 100);
    });
    expect(get(result)).toBe(20);

    // But b should
    batch((swap) => {
      swap(b, 200);
    });
    expect(get(result)).toBe(200);
  });

  it('caches computed values', () => {
    let computeCount = 0;
    const count = cell(5);
    const expensive = formula(() => {
      computeCount++;
      return get(count) * 2;
    });

    expect(computeCount).toBe(0);

    expect(get(expensive)).toBe(10);
    expect(computeCount).toBe(1);

    // Getting again should use cache
    expect(get(expensive)).toBe(10);
    expect(computeCount).toBe(1);

    // After change, should recompute
    batch((swap) => {
      swap(count, 6);
    });

    expect(get(expensive)).toBe(12);
    expect(computeCount).toBe(2);
  });

  it('notifies watchers when dependencies change', () => {
    const count = cell(5);
    const doubled = formula(() => get(count) * 2);
    let notified = false;

    watch(doubled, () => {
      notified = true;
    });

    batch((swap) => {
      swap(count, 10);
    });

    expect(notified).toBe(true);
    expect(get(doubled)).toBe(20);
  });

  it('supports nested formulas', () => {
    const a = cell(1);
    const b = formula(() => get(a) * 2);
    const c = formula(() => get(b) * 3);

    expect(get(c)).toBe(6);

    batch((swap) => {
      swap(a, 2);
    });

    expect(get(b)).toBe(4);
    expect(get(c)).toBe(12);
  });

  it('always recomputes when depending on volatile sources', () => {
    let fetchCount = 0;
    const volatileSource = source(() => {
      fetchCount++;
      return Math.random();
    });

    const derived = formula(() => get(volatileSource) * 2);

    // First access should compute
    const value1 = get(derived);
    expect(fetchCount).toBe(1);

    // Second access should recompute because source is volatile
    const value2 = get(derived);
    expect(fetchCount).toBe(2);

    // Values should be different (since source returns random values)
    expect(value1).not.toBe(value2);
  });

  it('recomputes when depending on multiple volatile sources', () => {
    let fetchCount1 = 0;
    let fetchCount2 = 0;

    const source1 = source(() => {
      fetchCount1++;
      return fetchCount1;
    });

    const source2 = source(() => {
      fetchCount2++;
      return fetchCount2 * 10;
    });

    const combined = formula(() => get(source1) + get(source2));

    // First access
    expect(get(combined)).toBe(1 + 10); // 1 + 10 = 11
    expect(fetchCount1).toBe(1);
    expect(fetchCount2).toBe(1);

    // Second access should refetch both sources
    expect(get(combined)).toBe(2 + 20); // 2 + 20 = 22
    expect(fetchCount1).toBe(2);
    expect(fetchCount2).toBe(2);
  });

  it('recomputes when mixing cells and volatile sources', () => {
    let fetchCount = 0;
    const cell1 = cell(5);
    const volatileSource = source(() => {
      fetchCount++;
      return fetchCount;
    });

    const mixed = formula(() => get(cell1) + get(volatileSource));

    // First access
    expect(get(mixed)).toBe(5 + 1); // 5 + 1 = 6
    expect(fetchCount).toBe(1);

    // Second access should refetch source but not cell
    expect(get(mixed)).toBe(5 + 2); // 5 + 2 = 7
    expect(fetchCount).toBe(2);

    // Change cell - should still refetch source
    batch((swap) => {
      swap(cell1, 10);
    });

    expect(get(mixed)).toBe(10 + 3); // 10 + 3 = 13
    expect(fetchCount).toBe(3);
  });

  it('handles nested formulas with volatile sources', () => {
    let fetchCount = 0;
    const volatileSource = source(() => {
      fetchCount++;
      return fetchCount;
    });

    const level1 = formula(() => get(volatileSource) * 2);
    const level2 = formula(() => get(level1) + 100);

    // First access
    expect(get(level2)).toBe(1 * 2 + 100); // 102
    expect(fetchCount).toBe(1);

    // Second access should recompute entire chain
    expect(get(level2)).toBe(2 * 2 + 100); // 104
    expect(fetchCount).toBe(2);
  });

  it('handles undefined values correctly', () => {
    let computeCount = 0;
    const undefinedCell = cell<string | undefined>(undefined);
    const undefinedFormula = formula(() => {
      computeCount++;
      return get(undefinedCell);
    });

    expect(get(undefinedFormula)).toBe(undefined);
    expect(computeCount).toBe(1);

    // Should cache undefined value - no recomputation
    expect(get(undefinedFormula)).toBe(undefined);
    expect(computeCount).toBe(1);

    // Change to a real value
    batch((swap) => {
      swap(undefinedCell, 'hello');
    });

    expect(get(undefinedFormula)).toBe('hello');
    expect(computeCount).toBe(2);

    // Should cache the string value
    expect(get(undefinedFormula)).toBe('hello');
    expect(computeCount).toBe(2);

    // Change back to undefined
    batch((swap) => {
      swap(undefinedCell, undefined);
    });

    expect(get(undefinedFormula)).toBe(undefined);
    expect(computeCount).toBe(3);

    // Should cache undefined value again
    expect(get(undefinedFormula)).toBe(undefined);
    expect(computeCount).toBe(3);
  });

  it('only evaluates once when cell never changes', () => {
    let computeCount = 0;
    const unchangedCell = cell(42);
    const derivedFormula = formula(() => {
      computeCount++;
      return get(unchangedCell) * 2;
    });

    // First access should compute
    expect(get(derivedFormula)).toBe(84);
    expect(computeCount).toBe(1);

    // Multiple subsequent accesses should use cache
    expect(get(derivedFormula)).toBe(84);
    expect(computeCount).toBe(1);

    expect(get(derivedFormula)).toBe(84);
    expect(computeCount).toBe(1);

    expect(get(derivedFormula)).toBe(84);
    expect(computeCount).toBe(1);

    // Cell value never changed, so formula should never recompute
    expect(computeCount).toBe(1);
  });

  it('invokes compute without `this` context', () => {
    const compute = vi.fn(() => 42);
    const value = formula(compute);

    get(value); // Initialize

    expect(compute.mock.contexts).toEqual([undefined]);
  });

  describe('untracked', () => {
    it('prevents dependency tracking', () => {
      const a = cell(1);
      const b = cell(2);

      const result = formula(() => {
        const trackedValue = get(a); // This creates a dependency
        const untrackedValue = untracked(() => get(b)); // This does not
        return trackedValue + untrackedValue;
      });

      expect(get(result)).toBe(3); // 1 + 2

      // Changing 'a' should trigger recomputation
      batch((swap) => {
        swap(a, 10);
      });
      expect(get(result)).toBe(12); // 10 + 2

      // Changing 'b' should NOT trigger recomputation (not a dependency)
      batch((swap) => {
        swap(b, 20);
      });
      expect(get(result)).toBe(12); // Still 10 + 2, not 10 + 20
    });

    it('works with nested untracked calls', () => {
      const a = cell(1);
      const b = cell(2);
      const c = cell(3);

      const result = formula(() => {
        const trackedValue = get(a);
        const untrackedValue = untracked(() => {
          const innerTracked = get(b); // Still untracked
          const nestedUntracked = untracked(() => get(c)); // Also untracked
          return innerTracked + nestedUntracked;
        });
        return trackedValue + untrackedValue;
      });

      expect(get(result)).toBe(6); // 1 + (2 + 3)

      // Only 'a' should be a dependency
      batch((swap) => {
        swap(a, 10);
      });
      expect(get(result)).toBe(15); // 10 + (2 + 3)

      // 'b' and 'c' should not trigger updates
      batch((swap) => {
        swap(b, 20);
        swap(c, 30);
      });
      expect(get(result)).toBe(15); // Still 10 + (2 + 3)
    });

    it('allows reading volatile sources without creating dependencies', () => {
      const a = cell(1);
      const b = cell(1);

      const result = formula(() => {
        const trackedValue = get(a);
        const untrackedValue = untracked(() => get(b));
        return trackedValue + untrackedValue;
      });

      const onChange = vi.fn();
      const dispose = watch(result, onChange);

      // First access
      expect(get(result)).toBe(2); // 1 + 1
      expect(onChange).not.toHaveBeenCalled(); // No change yet

      // Changing the tracked cell should recompute, but still not refetch volatile
      batch((swap) => {
        swap(a, 5);
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(get(result)).toBe(6); // 5 + 1

      batch((swap) => {
        swap(b, 10);
      });

      // Changing the untracked cell should NOT trigger recompute
      expect(onChange).toHaveBeenCalledTimes(1); // Still 6, no change
      expect(get(result)).toBe(6); // Still 5 + 1, b is not tracked

      batch((swap) => {
        swap(a, 20);
      });

      // Recomputes, incidentally reading b again
      expect(onChange).toHaveBeenCalledTimes(2);
      expect(get(result)).toBe(30); // 20 + 10

      dispose();
    });

    it('can be used outside of formula context', () => {
      const a = cell(1);

      // Should work fine even when not inside a formula
      const result = untracked(() => get(a));
      expect(result).toBe(1);
    });

    it('restores tracking context after untracked block', () => {
      const a = cell(1);
      const b = cell(2);
      const c = cell(3);

      const result = formula(() => {
        const before = get(a); // Tracked
        const during = untracked(() => get(b)); // Untracked
        const after = get(c); // Tracked again
        return before + during + after;
      });

      expect(get(result)).toBe(6); // 1 + 2 + 3

      // 'a' and 'c' should be dependencies, 'b' should not
      batch((swap) => {
        swap(a, 10);
      });
      expect(get(result)).toBe(15); // 10 + 2 + 3

      batch((swap) => {
        swap(c, 30);
      });
      expect(get(result)).toBe(42); // 10 + 2 + 30

      batch((swap) => {
        swap(b, 20);
      });
      expect(get(result)).toBe(42); // Still 10 + 2 + 30 (b is not tracked)
    });
  });
});
