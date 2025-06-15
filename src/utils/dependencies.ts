import type { Signal, Cell, Source, BaseSignal } from '../core/types';
import { evaluateFormula } from '../core/formula';

/**
 * Recursively collects all cell and source dependencies of a signal.
 *
 * This function traverses the dependency graph and returns only the
 * "leaf" signals (cells and sources), not intermediate formulas.
 *
 * @param signal - The signal to analyze
 * @returns A set of all cells and sources that the signal depends on
 *
 * @example
 * ```typescript
 * const a = cell(1);
 * const b = cell(2);
 * const sum = formula(() => get(a) + get(b));
 * const doubled = formula(() => get(sum) * 2);
 *
 * const deps = dependencies(doubled);
 * // deps contains: {a, b} (not sum)
 * ```
 */
export function dependencies<T>(
  signal: Signal<T>,
): Set<Cell<unknown> | Source<unknown>> {
  const result = new Set<Cell<unknown> | Source<unknown>>();
  const visited = new Set<BaseSignal>();

  function visit(sig: BaseSignal): void {
    if (visited.has(sig)) {
      return; // Handle cycles
    }
    visited.add(sig);

    switch (sig.type) {
      case 'cell':
      case 'source':
        result.add(sig);
        break;
      case 'formula':
        // Ensure formula is evaluated to populate dependencies
        evaluateFormula(sig);
        // Recursively visit all dependencies
        for (const [dep] of sig.dependencyVersions) {
          visit(dep);
        }
        break;
    }
  }

  visit(signal);
  return result;
}
