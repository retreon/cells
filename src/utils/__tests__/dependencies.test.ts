import { cell, formula, get, batch, visitDependencies } from '../../index';

describe('visitDependencies', () => {
  it('visits cell itself for cells', () => {
    const a = cell(1);
    const visited: any[] = [];

    const visitedSet = visitDependencies(a, (sig) => {
      visited.push(sig);
    });

    expect(visited.length).toBe(1);
    expect(visited[0]).toBe(a);
    expect(visitedSet.size).toBe(1);
    expect(visitedSet.has(a)).toBe(true);
  });

  it('visits direct cell dependencies for simple formulas', () => {
    const a = cell(1);
    const b = cell(2);
    const sum = formula(() => get(a) + get(b));

    const visited: any[] = [];
    const visitedSet = visitDependencies(sum, (sig) => {
      visited.push(sig);
    });

    expect(visited.length).toBe(3); // formula + 2 cells
    expect(visited).toContain(sum);
    expect(visited).toContain(a);
    expect(visited).toContain(b);
    expect(visitedSet.size).toBe(3);
  });

  it('visits transitive dependencies for nested formulas', () => {
    const a = cell(1);
    const b = cell(2);
    const sum = formula(() => get(a) + get(b));
    const doubled = formula(() => get(sum) * 2);

    const visited: any[] = [];
    visitDependencies(doubled, (sig) => {
      visited.push(sig);
    });

    // Should include all signals: doubled, sum, a, b
    expect(visited.length).toBe(4);
    expect(visited).toContain(doubled);
    expect(visited).toContain(sum);
    expect(visited).toContain(a);
    expect(visited).toContain(b);
  });

  it('handles dynamic dependencies', () => {
    const condition = cell(true);
    const a = cell(1);
    const b = cell(2);
    const dynamic = formula(() => (get(condition) ? get(a) : get(b)));

    // When condition is true, visits condition and a
    let visited: any[] = [];
    visitDependencies(dynamic, (sig) => {
      visited.push(sig);
    });
    expect(visited).toContain(dynamic);
    expect(visited).toContain(condition);
    expect(visited).toContain(a);
    expect(visited).not.toContain(b);

    // Change condition
    batch((swap) => {
      swap(condition, false);
    });

    // Now visits condition and b
    visited = [];
    visitDependencies(dynamic, (sig) => {
      visited.push(sig);
    });
    expect(visited).toContain(dynamic);
    expect(visited).toContain(condition);
    expect(visited).toContain(b);
    expect(visited).not.toContain(a);
  });

  it('handles deeply nested formulas', () => {
    const a = cell(1);
    const b = formula(() => get(a) * 2);
    const c = formula(() => get(b) * 3);
    const d = formula(() => get(c) * 4);

    const visited: any[] = [];
    visitDependencies(d, (sig) => {
      visited.push(sig);
    });

    // Should visit all signals in the chain
    expect(visited).toContain(d);
    expect(visited).toContain(c);
    expect(visited).toContain(b);
    expect(visited).toContain(a);
  });

  it('handles multiple paths to same dependency', () => {
    const a = cell(1);
    const b = formula(() => get(a) * 2);
    const c = formula(() => get(a) * 3);
    const sum = formula(() => get(b) + get(c));

    const visited: any[] = [];
    const visitedSet = visitDependencies(sum, (sig) => {
      visited.push(sig);
    });

    // Should visit each signal only once
    expect(visitedSet.size).toBe(4); // sum, b, c, a
    expect(visited.filter((sig) => sig === a).length).toBe(1);
  });

  it('returns empty visitor calls for formulas with no dependencies', () => {
    const constant = formula(() => 42);

    const visited: any[] = [];
    visitDependencies(constant, (sig) => {
      visited.push(sig);
    });

    expect(visited.length).toBe(1); // Just the formula itself
    expect(visited[0]).toBe(constant);
  });

  it('allows filtering during visitation', () => {
    const a = cell(1);
    const b = cell(2);
    const sum = formula(() => get(a) + get(b));

    const cellsOnly: any[] = [];
    visitDependencies(sum, (sig) => {
      if (sig.t === 'c') {
        cellsOnly.push(sig);
      }
    });

    expect(cellsOnly.length).toBe(2);
    expect(cellsOnly).toContain(a);
    expect(cellsOnly).toContain(b);
  });
});
