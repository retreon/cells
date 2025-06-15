# @retreon/cells

A minimal reactive state management library inspired by spreadsheet semantics.

## Purpose

Retreon Cells provides a signal-based reactive harness that intelligently switches between push-based reactivity (when observed) and pull-based reactivity (when inert).

The core innovation is **[Volatile Functions](https://learn.microsoft.com/en-us/office/dev/add-ins/excel/custom-functions-volatile)**, a concept borrowed from spreadsheet programming. Volatile functions are inherently impure - they return different values even with the same inputs. The web platform is full of these: `Date.now()`, `localStorage` reads, `window.innerHeight`, and countless others.

Traditional reactive systems struggle with volatile data sources, often requiring manual invalidation or accepting stale values. Retreon Cells addresses this by allowing volatile sources to compose naturally within the computation graph, providing controlled reactivity without sacrificing performance. (For deeper context, see [the TC39 Signals proposal discussion](https://github.com/tc39/proposal-signals/issues/237).)

While this library works standalone, it's designed as a foundation for building opinionated state management solutions.

## Installation

```bash
npm install @retreon/cells
```

## Quick Example

```typescript
import { cell, formula, source, get, batch, watch } from '@retreon/cells';

// Mutable state
const quantity = cell(2);
const price = cell(19.99);

// Computed values
const total = formula(() => get(quantity) * get(price));

// Volatile source
const timestamp = source(() => Date.now());

// Composed formula using both stable and volatile data
const receipt = formula(() => ({
  total: get(total),
  time: get(timestamp),
}));

// Read values
console.log(get(receipt));
// { total: 39.98, time: 1699564823000 }

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
const windowWidth = source(
  () => window.innerWidth,
  (onChange) => {
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
  },
);
```

### `get(signal)`

Reads the current value of any signal. When used inside a formula, automatically tracks the signal as a dependency.

```ts
const value = get(doubled); // 0
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

### `watch(signal, handler)`

Subscribes to changes in a signal. Returns a cleanup function. For formulas, watches all transitive dependencies.

```ts
const dispose = watch(total, () => {
  console.log('Total updated:', get(total));
});

// Later: stop watching
dispose();
```

### `visitDependencies(signal, visitor)`

Visits all signals in the dependency graph. Calls the visitor function for each signal encountered and returns the set of all visited signals.

```ts
const visited = visitDependencies(receipt, (sig) => {
  console.log(`Found ${sig.type}`);
});
// Logs: "Found formula", "Found cell", "Found cell", "Found source"
```
