import type { Cell, ChangeHandler } from './types.js';

export function cell<T>(initialValue: T): Cell<T> {
  return {
    type: 'cell',
    value: initialValue,
    watchers: new Set<ChangeHandler>(),
  };
}
