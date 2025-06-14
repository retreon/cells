import type { Source } from './types';
import { currentVersion } from './version';

export function source<T>(
  fetch: () => T,
  subscribe?: (onChange: () => void) => () => void,
): Source<T> {
  return {
    type: 'source',
    fetch,
    subscribe,
    cachedValue: undefined,
    version: currentVersion(),
    watchers: new Set(),
    isVolatile: true,
    subscriptionDisposer: undefined,
  };
}
