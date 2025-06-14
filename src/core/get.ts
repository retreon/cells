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
      // TODO: Implement source fetching
      throw new Error('Source fetching not yet implemented');
  }
}
