import type { BaseSignal, Formula } from '../core/types';
import { recordDependencyVersion } from '../core/formula';

// Module-scoped state for tracking current computation
let currentFormula: Formula<unknown> | null = null;
export let isInWatcherContext = false;

export const trackDependency = (signal: BaseSignal): void => {
  if (currentFormula) {
    recordDependencyVersion(currentFormula, signal);
  }
};

export const withTracking = <T>(formula: Formula<T>, fn: () => T): T => {
  const previousFormula = currentFormula;
  currentFormula = formula;

  try {
    return fn();
  } finally {
    currentFormula = previousFormula;
  }
};

export const withWatcherContext = <T>(fn: () => T): T => {
  const previousWatcherContext = isInWatcherContext;
  isInWatcherContext = true;

  try {
    return fn();
  } finally {
    isInWatcherContext = previousWatcherContext;
  }
};

/**
 * Executes a function without tracking any signal dependencies.
 *
 * When called inside a formula computation, any signals read within
 * the untracked function will not be registered as dependencies.
 *
 * @param fn - Function to execute without dependency tracking
 * @returns The result of the function
 *
 * @example
 * ```typescript
 * const a = cell(1);
 * const b = cell(2);
 * const result = formula(() => {
 *   const trackedValue = get(a); // This creates a dependency
 *   const untrackedValue = untracked(() => get(b)); // This does not
 *   return trackedValue + untrackedValue;
 * });
 * ```
 */
export const untracked = <T>(fn: () => T): T => {
  const previousFormula = currentFormula;
  currentFormula = null;

  try {
    return fn();
  } finally {
    currentFormula = previousFormula;
  }
};
