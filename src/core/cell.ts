import type { Cell } from './types';
import { currentVersion } from './version';

export function cell<T>(initialValue: T): Cell<T> {
  return {
    type: 'cell',
    value: initialValue,
    version: currentVersion(),
    watchers: new Set(),
  };
}
