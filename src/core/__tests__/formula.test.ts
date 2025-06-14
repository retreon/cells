import { cell, formula, get, batch, watch } from '../../index';

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
});
