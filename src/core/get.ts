import type { Signal } from './types';
import { currentFormula } from '../utils/dependency-tracker';
import { evaluateFormula, recordDependencyVersion } from './formula';
import { evaluateSource } from './source';

/**
 * Reads the current value of a signal.
 *
 * When called inside a formula computation, automatically tracks
 * the signal as a dependency of that formula.
 *
 * @param signal - The signal to read from
 * @returns The current value of the signal
 *
 * @example
 * ```typescript
 * const count = cell(5);
 * console.log(get(count)); // 5
 *
 * const doubled = formula(() => get(count) * 2);
 * console.log(get(doubled)); // 10
 * ```
 */
export const get = <T>(signal: Signal<T>): T => {
  // Track this signal as a dependency of the current formula
  if (currentFormula) {
    recordDependencyVersion(currentFormula, signal);
  }

  if (signal.t === 'c') {
    return signal.c;
  } else if (signal.t === 'f') {
    return evaluateFormula(signal);
  } else {
    return evaluateSource(signal);
  }
};
