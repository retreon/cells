<div align="center">
  <h1>@retreon/cells</h1>
  <p>A minimal state management library inspired by spreadsheet semantics.</p>
</div>

## Purpose

Retreon Cells is an implementation of Signals.

The driving force is support for **[Volatile Functions](https://learn.microsoft.com/en-us/office/dev/add-ins/excel/custom-functions-volatile)**, a concept borrowed from spreadsheet programming. Volatile functions are inherently impure - they return different values even with the same inputs. The web platform is full of these: `Date.now()`, `localStorage` reads, `window.innerHeight`, and countless others.

Traditional systems struggle with volatile sources. They introduce stale reads, resource leaks, or unusable APIs outside a component context. Retreon Cells addresses this by integrating external sources directly into the computation graph, propagating cache invalidation in pull-based reactivity and upgrading to tracked values in watched contexts.

For more information, see [the TC39 Signals proposal discussion](https://github.com/tc39/proposal-signals/issues/237).

## Design Goals

This is intended as a low-level library. It's designed to be powerful, expressive, lightweight, and performant.

Guardrails and convenience functions are out of scope and better suited to higher-level abstractions.

## Installation

```bash
npm install @retreon/cells
```

## Quick Example

```ts
import { cell, formula, source, get, batch, watch } from '@retreon/cells';

// Mutable state
const quantity = cell(2);
const price = cell(19.99);

// Computed values
const total = formula(() => get(quantity) * get(price));

// Volatile source
const timestamp = source(
  () => Date.now(),
  (onChange) => {
    // Timestamp sampled every second.
    const interval = setInterval(onChange, 1_000);
    return () => clearInterval(interval);
  },
);

// Composed formula using both stable and volatile data
const receipt = formula(() => ({
  total: get(total),
  time: get(timestamp),
}));

// Read values
console.log(get(receipt));
// { total: 39.98, time: 1577836800000 }

// Update state atomically
batch((swap) => {
  swap(quantity, 3);
  swap(price, 24.99);
});

// Watch for changes
const dispose = watch(total, () => {
  console.log(`Total changed to: ${get(total)}`);
});
```

## API

### `cell(initialValue)`

Creates a mutable value container. Like a spreadsheet cell, it holds a value that can be updated.

```ts
const count = cell(0);
```

### `formula(compute)`

Creates a computed value that automatically updates when its dependencies change. Dependencies are discovered automatically during execution.

```ts
const doubled = formula(() => get(count) * 2);
```

### `source(fetch, subscribe?)`

Bridges external data into the reactive system. Without a subscription function, sources remain volatile - recomputing on every read. With a subscription, they become cached while observed.

```ts
// Volatile: always fresh
const random = source(() => Math.random());

// Cached when watched: efficient for event-driven data
const windowSize = source(
  () => ({ width: window.innerWidth, height: window.innerHeight }),
  (onChange) => {
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
  },
);
```

### `get(signal)`

Reads the current value of any signal. When used inside a formula, automatically tracks the signal as a dependency.

```ts
const value = get(doubled); // 2
```

### `batch(fn)`

Executes multiple cell updates atomically. Ensures consistency by preventing intermediate states from being observed.

```ts
batch((swap) => {
  swap(cellA, 1);
  swap(cellB, 2);
  // Watchers fire after both updates complete
});
```

### `untracked(fn)`

Executes a function without tracking any signal dependencies. When called inside a formula computation, any signals read within the untracked function will not be registered as dependencies.

```ts
const a = cell(1);
const b = cell(2);

// result only recomputes when 'a' changes, not when 'b' changes
const result = formula(() => {
  const trackedValue = get(a); // This creates a dependency
  const untrackedValue = untracked(() => get(b)); // This does not
  return trackedValue + untrackedValue;
});
```

### `visitDependencies(signal, visitor)`

Visits all signals in the dependency graph. Calls the visitor function for each signal encountered and returns the set of all visited signals.

```ts
const visited = visitDependencies(receipt, (sig) => {
  console.log(`Found ${sig.type}`);
});
// Logs: "Found formula", "Found cell", "Found cell", "Found source"
```

> [!WARNING]
> This API does not evaluate formulas. If the formula hasn't been re-evaluated since dependencies changed, this API may return stale data.

### `watch(signal, handler)`

Subscribes to changes in a signal. Returns a cleanup and renewal function. For formulas, watches all transitive dependencies.

```ts
const [dispose, renew] = watch(total, () => {
  console.log('Total updated:', renew());
});

// Later: stop watching
dispose();
```

This is a low-level function that prioritizes power over simplicity. It's easy to misuse.

- **dispose:** Stops watching for changes.
- **renew:** Re-evaluates the expression and watches the new dependency set.

> [!WARNING]
> Careful attention is required when watching formulas. `watch()` does not invoke formulas automatically unless you call `renew()`. This means `watch()` may be watching stale dependencies.
>
> It's recommended to call `renew()` inside the watch handler (re-evaluating any formulas) to ensure you're always observing the correct dependencies.
