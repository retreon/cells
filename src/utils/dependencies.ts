import type { Signal, Cell, Source, BaseSignal } from '../core/types';
import { evaluateFormula } from '../core/formula';

/**
 * Recursively collect all cell and source dependencies of a signal.
 * For cells and sources, returns a set containing just itself.
 * For formulas, returns all cells and sources it transitively depends on.
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
