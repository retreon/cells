import type { BaseSignal, Formula } from '../core/types';
import { recordDependencyVersion } from '../core/formula';

// Module-scoped state for tracking current computation
let currentFormula: Formula<unknown> | null = null;

export function trackDependency(signal: BaseSignal): void {
  if (currentFormula) {
    recordDependencyVersion(currentFormula, signal);
  }
}

export function withTracking<T>(formula: Formula<T>, fn: () => T): T {
  const previousFormula = currentFormula;
  currentFormula = formula;

  try {
    return fn();
  } finally {
    currentFormula = previousFormula;
  }
}
