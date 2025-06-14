import type { Signal } from './types';
import { trackDependency } from '../utils/dependency-tracker';
import { evaluateFormula } from './formula';

export function get<T>(signal: Signal<T>): T {
  // Track this signal as a dependency of the current formula
  trackDependency(signal);

  switch (signal.type) {
    case 'cell':
      return signal.value;
    case 'formula':
      return evaluateFormula(signal);
    case 'source':
      if (signal.isVolatile) {
        // In volatile mode, always fetch fresh
        return signal.fetch();
      } else {
        // In cached mode, use cached value if available
        if (signal.cachedValue === undefined) {
          signal.cachedValue = signal.fetch();
        }
        return signal.cachedValue;
      }
  }
}
