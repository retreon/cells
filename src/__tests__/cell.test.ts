import { cell, get } from '../index.js';

describe('cell', () => {
  it('stores and retrieves values', () => {
    const count = cell(0);
    expect(get(count)).toBe(0);
  });

  it('stores different types', () => {
    const str = cell('hello');
    const bool = cell(true);
    const obj = cell({ x: 1, y: 2 });

    expect(get(str)).toBe('hello');
    expect(get(bool)).toBe(true);
    expect(get(obj)).toEqual({ x: 1, y: 2 });
  });
});
