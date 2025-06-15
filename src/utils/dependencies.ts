import type { Signal, BaseSignal } from '../core/types';
import { evaluateFormula } from '../core/formula';

/**
 * Visits all signals in the dependency graph of a signal.
 *
 * This function traverses the dependency graph and calls the visitor
 * function for each signal encountered. Returns the set of all visited signals.
 *
 * @param signal - The signal to analyze
 * @param visitor - Function called for each visited signal
 * @returns A set of all visited signals (including the root signal)
 *
 * @example
 * ```typescript
 * const a = cell(1);
 * const b = cell(2);
 * const sum = formula(() => get(a) + get(b));
 *
 * const visited = visitDependencies(sum, (sig) => {
 *   console.log(`Visiting ${sig.type}`);
 * });
 * // Logs: "Visiting formula", "Visiting cell", "Visiting cell"
 * ```
 */
export function visitDependencies<T>(
  signal: Signal<T>,
  visitor: (signal: BaseSignal) => void,
): Set<BaseSignal> {
  const visited = new Set<BaseSignal>();

  function visit(sig: BaseSignal): void {
    if (visited.has(sig)) {
      return; // Handle cycles
    }
    visited.add(sig);

    // Call the visitor function
    visitor(sig);

    if (sig.type === 'formula') {
      // Ensure formula is evaluated to populate dependencies
      evaluateFormula(sig);
      // Recursively visit all dependencies
      for (const [dep] of sig.dependencyVersions) {
        visit(dep);
      }
    }
  }

  visit(signal);
  return visited;
}
