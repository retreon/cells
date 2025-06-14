import { cell, formula, get, batch, dependencies } from '../../index';

describe('dependencies', () => {
  it('returns cell itself for cells', () => {
    const a = cell(1);
    const deps = dependencies(a);

    expect(deps.size).toBe(1);
    expect(deps.has(a)).toBe(true);
  });

  it('returns direct cell dependencies for simple formulas', () => {
    const a = cell(1);
    const b = cell(2);
    const sum = formula(() => get(a) + get(b));

    const deps = dependencies(sum);

    expect(deps.size).toBe(2);
    expect(deps.has(a)).toBe(true);
    expect(deps.has(b)).toBe(true);
  });

  it('returns transitive dependencies for nested formulas', () => {
    const a = cell(1);
    const b = cell(2);
    const sum = formula(() => get(a) + get(b));
    const doubled = formula(() => get(sum) * 2);

    const deps = dependencies(doubled);

    // Should only include cells, not intermediate formulas
    expect(deps.size).toBe(2);
    expect(deps.has(a)).toBe(true);
    expect(deps.has(b)).toBe(true);
  });

  it('handles dynamic dependencies', () => {
    const condition = cell(true);
    const a = cell(1);
    const b = cell(2);
    const dynamic = formula(() => (get(condition) ? get(a) : get(b)));

    // When condition is true, depends on condition and a
    let deps = dependencies(dynamic);
    expect(deps.size).toBe(2);
    expect(deps.has(condition)).toBe(true);
    expect(deps.has(a)).toBe(true);

    // Change condition
    batch((swap) => {
      swap(condition, false);
    });

    // Now depends on condition and b
    deps = dependencies(dynamic);
    expect(deps.size).toBe(2);
    expect(deps.has(condition)).toBe(true);
    expect(deps.has(b)).toBe(true);
  });

  it('handles deeply nested formulas', () => {
    const a = cell(1);
    const b = formula(() => get(a) * 2);
    const c = formula(() => get(b) * 3);
    const d = formula(() => get(c) * 4);

    const deps = dependencies(d);

    // Should only include the root cell
    expect(deps.size).toBe(1);
    expect(deps.has(a)).toBe(true);
  });

  it('handles multiple paths to same dependency', () => {
    const a = cell(1);
    const b = formula(() => get(a) * 2);
    const c = formula(() => get(a) * 3);
    const sum = formula(() => get(b) + get(c));

    const deps = dependencies(sum);

    // Should only include 'a' once
    expect(deps.size).toBe(1);
    expect(deps.has(a)).toBe(true);
  });

  it('returns empty set for formulas with no dependencies', () => {
    const constant = formula(() => 42);

    const deps = dependencies(constant);

    expect(deps.size).toBe(0);
  });
});
