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
