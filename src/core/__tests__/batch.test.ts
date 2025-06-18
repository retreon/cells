import { cell, get, batch, SwapFunction } from '../../index';

describe('batch', () => {
  it('allows cell mutations within batch', () => {
    const count = cell(0);

    batch((swap) => {
      swap(count, 5);
    });

    expect(get(count)).toBe(5);
  });

  it('prevents mutations outside batch', () => {
    const count = cell(0);
    let capturedSwap: SwapFunction;

    // Capture the swap function
    batch((swap) => {
      capturedSwap = swap;
    });

    // Try to use swap outside of batch
    expect(() => {
      capturedSwap(count, 5);
    }).toThrow('Cell mutations must occur within a batch()');

    // Value should remain unchanged
    expect(get(count)).toBe(0);
  });

  it('batches multiple mutations', () => {
    const a = cell(1);
    const b = cell(2);
    const c = cell(3);

    batch((swap) => {
      swap(a, 10);
      swap(b, 20);
      swap(c, 30);
    });

    expect(get(a)).toBe(10);
    expect(get(b)).toBe(20);
    expect(get(c)).toBe(30);
  });

  it('supports nested batches', () => {
    const count = cell(0);

    batch((swap) => {
      swap(count, 1);
      expect(get(count)).toBe(1);

      batch((innerSwap) => {
        innerSwap(count, 2);
        expect(get(count)).toBe(2);
      });

      expect(get(count)).toBe(2);
    });

    expect(get(count)).toBe(2);
  });

  it('returns the value from the batch function', () => {
    const count = cell(0);

    const result = batch((swap) => {
      swap(count, 42);
      return 'success';
    });

    expect(result).toBe('success');
    expect(get(count)).toBe(42);
  });

  it('returns undefined when batch function returns nothing', () => {
    const count = cell(0);

    const result = batch((swap) => {
      swap(count, 10);
    });

    expect(result).toBeUndefined();
    expect(get(count)).toBe(10);
  });

  it('returns complex values from batch function', () => {
    const a = cell(1);
    const b = cell(2);

    const result = batch((swap) => {
      swap(a, 10);
      swap(b, 20);
      return { sum: get(a) + get(b), product: get(a) * get(b) };
    });

    expect(result).toEqual({ sum: 30, product: 200 });
  });
});
