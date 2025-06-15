import type { Formula, BaseSignal } from './types';
import { withTracking } from '../utils/dependency-tracker';
import { globalVersion } from './version';

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
export function formula<T>(compute: () => T): Formula<T> {
  const f: Formula<T> = {
    type: 'formula',
    compute,
    cachedValue: undefined,
    version: 0,
    dependencyVersions: new Map(),
    watchers: new Set(),
  };

  return f;
}

export function recordDependencyVersion(
  formula: Formula<unknown>,
  dependency: BaseSignal,
): void {
  // Record the current version of the dependency
  formula.dependencyVersions.set(dependency, dependency.version);
}

function isStale<T>(formula: Formula<T>): boolean {
  // Quick check: if global version hasn't changed, nothing is stale
  if (formula.version === globalVersion) {
    return false;
  }

  // If global version changed, check individual dependencies
  for (const [dep, lastVersion] of formula.dependencyVersions) {
    if (dep.version !== lastVersion) {
      return true;
    }
  }

  // Also stale if never computed
  return formula.version === 0;
}

export function evaluateFormula<T>(formula: Formula<T>): T {
  if (!isStale(formula) && formula.cachedValue !== undefined) {
    return formula.cachedValue;
  }

  // Clear old dependency versions
  formula.dependencyVersions.clear();

  // Compute with dependency tracking
  const value = withTracking(formula, formula.compute);

  formula.cachedValue = value;
  formula.version = globalVersion;

  return value;
}
