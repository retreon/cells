<div align="center">
  <h1>@retreon/cells</h1>
  <p>A minimal state management library inspired by spreadsheet semantics.</p>
</div>

## Purpose

Retreon Cells is an implementation of [Signals](https://dev.to/this-is-learning/the-evolution-of-signals-in-javascript-8ob) with first-class support for **[Volatile Functions](https://learn.microsoft.com/en-us/office/dev/add-ins/excel/custom-functions-volatile)**, a primitive for binding external data sources.

This is a low-level library. It biases towards power and expressiveness over safety and convenience. As such, several components are out of scope:

- Error caching
- Cycle detection
- Effect management

## Other Projects

There are many high-quality libraries implementing signal-based reactivity:

- [SolidJS Signals](https://github.com/solidjs/signals)
- [Preact Signals](https://github.com/preactjs/signals)
- [Alien Signals](https://github.com/stackblitz/alien-signals) (used by Vue, XState, many others)
- [TC39 Proposal Reference Implementation](https://github.com/proposal-signals/signal-polyfill)

`@retreon/cells` exists to explore the space of Volatile Functions and serve as a concrete example of how it might work in practice. It spawned out of a discussion thread [here](https://github.com/tc39/proposal-signals/issues/237).

## Overview

- **Cell:** Holds a value. Can only be read or replaced.
- **Source:** Similar to a cell, but binds to externally owned data.
- **Formula:** Computes a cached value using cells, sources, or other formulas.
- **Watcher:** Listens for changes on a cell, source, or formula.

## Installation

```bash
npm install --save @retreon/cells
```

## API

### `cell`

Creates a mutable value container. Like a spreadsheet cell, it holds a value that can be updated.

```ts
const count = cell(0);
```

### `source`

Binds to an untracked data source. Examples are `window.innerHeight`, `document.visibilityState`, `localStorage.getItem()`, or any value that changes over time.

```ts
const viewport = source(
  () => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }),
  (onChange) => {
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
  },
);
```

Sources run in two modes:

- **Volatile (unwatched):** Every read is fresh, not cached.
- **Non-Volatile (watched):** Reads are cached and only recomputed when necessary.

Sources start volatile until they become watched. If a `subscribe()` handler is provided, the source upgrades to non-volatile and only triggers changes when it calls `onChange`.

### `formula`

Formulas compute a value using cells and sources. The result is cached until a dependency changes.

```ts
const doubled = formula(() => get(count) * 2);
```

Formulas that depend on volatile sources are never cached and will always re-evaluate.

### `get`

Reads the current value of a source, cell, or formula.

```ts
const value = cell(10);
get(value); // => 10
```

When used inside a formula, the value is automatically tracked as a dependency.

### `untracked`

Allows reading cells, sources, and formulas without adding them as dependencies.

```ts
const a = cell('a');
const b = cell('b');

// Only `a` is added to the set of dependencies. `b` is ignored.
const result = formula(() => {
  const trackedValue = get(a);
  const untrackedValue = untracked(() => get(b));
});
```

### `batch`

Updates the value of one or more cells atomically.

```ts
batch((swap) => {
  swap(cellA, 1);
  swap(cellB, 2);
});
```

Watchers are only notified after all changes are applied (glitch-free evaluation).

### `watch`

Subscribes to a cell, source, or formula.

```ts
const [dispose, renew] = watch(total, () => {
  console.log('Total updated:', renew());
});
```

If the target is a formula, all its recursive dependencies are observed. Any `source()` values used are immediately promoted to non-volatile.

Calling `renew()` re-evaluates the value and updates the set of observed dependencies. Calling `dispose()` clears the watcher and releases all values. If this was the only watcher observing a `source()`, it will downgrade to volatile mode.

> [!WARNING]
> Calling `watch()` does **not** evaluate formulas. If the formula hasn't been evaluated yet, or hasn't been evaluated since dependencies changed, `watch()` will subscribe to stale dependencies.
>
> While it provides control over how and when formulas execute, the API is easy to misuse. It's recommended to abstract it with higher-level utilities.

### `visitDependencies`

Visits all cells, sources, and formulas in a dependency graph.

```ts
const visited = visitDependencies(expression, (dep) => {
  console.log('Found:', dep.type);
});
```

It returns the set of all dependencies including the value provided.

**Note:** like `watch()`, `visitDependencies()` does not evaluate formulas and may return a stale (cached) set of dependencies. You may want to force evaluation before calling this API.
