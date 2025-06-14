import type { Signal, Disposer, ChangeHandler } from './types.js';

export function watch<T>(signal: Signal<T>, handler: ChangeHandler): Disposer {
  // Add the handler to the signal's watchers
  signal.watchers.add(handler);

  // For sources, transition from volatile to cached mode
  if (signal.type === 'source' && signal.watchers.size === 1) {
    // First watcher - transition to cached mode
    signal.isVolatile = false;

    // If source has a subscribe function, set up the subscription
    if (signal.subscribe) {
      signal.subscriptionDisposer = signal.subscribe(() => {
        // When source changes, mark as stale and notify watchers
        signal.cachedValue = undefined;
        handler();
      });
    }
  }

  // Return a disposer function
  return () => {
    signal.watchers.delete(handler);

    // For sources, transition back to volatile mode if no watchers
    if (signal.type === 'source' && signal.watchers.size === 0) {
      signal.isVolatile = true;

      // Clean up subscription
      if (signal.subscriptionDisposer) {
        signal.subscriptionDisposer();
        signal.subscriptionDisposer = undefined;
      }

      // Clear cached value
      signal.cachedValue = undefined;
    }
  };
}
