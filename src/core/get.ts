import type { Signal } from './types.js';

export function get<T>(signal: Signal<T>): T {
  switch (signal.type) {
    case 'cell':
      return signal.value;
    case 'formula':
      // TODO: Implement formula evaluation with dependency tracking
      throw new Error('Formula evaluation not yet implemented');
    case 'source':
      // TODO: Implement source fetching
      throw new Error('Source fetching not yet implemented');
  }
}
