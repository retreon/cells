import type { Formula, BaseSignal } from './types';
import { withTracking } from '../utils/dependency-tracker';
import { globalVersion } from '../utils/version';

/**
 * Creates a formula that computes a derived value from other signals.
 *
 * Formulas automatically track their dependencies and update when those
 * dependencies change. Dependencies are discovered dynamically during
 * computation.
 *
 * @param compute - A function that computes the derived value
 * @returns A formula signal that can be read with `get()`
 *
 * @example
 * ```typescript
 * const a = cell(2);
 * const b = cell(3);
 * const sum = formula(() => get(a) + get(b));
 *
 * console.log(get(sum)); // 5
 *
 * batch((swap) => {
 *   swap(a, 10);
 * });
 * console.log(get(sum)); // 13
 * ```
 */
export const formula = <T>(compute: () => T): Formula<T> => ({
  t: 'f',
  f: compute,
  c: undefined,
  v: -1,
  d: new Map(),
  x: false,
});

export const recordDependencyVersion = (
  formula: Formula<unknown>,
  dependency: BaseSignal,
): void => {
  // Record the current version of the dependency
  formula.d.set(dependency, dependency.v);
};

const isStale = <T>(formula: Formula<T>): boolean => {
  // Volatile formulas are always stale
  if (formula.x) {
    return true;
  }

  // Quick check: if global version hasn't changed, nothing is stale
  if (formula.v === globalVersion) {
    return false;
  }

  // If global version changed, check individual dependencies
  for (const [dep, lastVersion] of formula.d) {
    // Always consider stale if depending on a volatile source
    if (dep.t === 's' && dep.x) {
      return true;
    }

    if (dep.v !== lastVersion) {
      return true;
    }
  }

  // Also stale if never computed
  return formula.v === -1;
};

export const evaluateFormula = <T>(formula: Formula<T>): T => {
  if (!isStale(formula)) {
    return formula.c as T;
  }

  // Clear old dependency versions and reset volatility
  formula.d.clear();
  formula.x = false;

  // Compute with dependency tracking
  const value = withTracking(formula, formula.f);

  // Check if any dependencies are volatile and mark this formula as volatile
  for (const dep of formula.d.keys()) {
    if ((dep.t === 's' && dep.x) || (dep.t === 'f' && dep.x)) {
      formula.x = true;
      break;
    }
  }

  formula.c = value;
  formula.v = globalVersion;

  return value;
};
