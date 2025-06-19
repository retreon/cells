// NOTE: Fields must be single characters.
// This has a surprisingly large impact on bundle size.

/** Sentinel value indicating cache is empty. */
export const STALE = {};

// Core discriminated union types
export interface Cell<T> {
  /** Type */
  readonly t: 'c';

  /** Cell value */
  c: T;

  /** Version */
  v: number;

  /** Watchers */
  w: Set<Watcher<unknown>>;
}

export interface Formula<T> {
  /** Type */
  readonly t: 'f';

  /** Formula function */
  readonly f: () => T;

  /** Cached value */
  c: T | undefined;

  /** Version */
  v: number;

  /** Volatile flag */
  x: boolean;

  /** Versions of dependencies from last execution */
  d: Map<BaseSignal, number>;
}

export interface Source<T> {
  /** Type */
  readonly t: 's';

  /** Fetch source data (read) */
  readonly r: () => T;

  /** Subscribe to changes */
  readonly s?: (onChange: () => void) => Disposer;

  /** Disposer for the subscription */
  d?: Disposer;

  /** Cached value */
  c: T | typeof STALE;

  /** Volatile flag */
  x: boolean;

  /** Version */
  v: number;

  /** Watchers */
  w: Set<Watcher<unknown>>;
}

export type Signal<T> = Cell<T> | Formula<T> | Source<T>;
export type BaseSignal = Signal<unknown>;

export interface Watcher<T> {
  /** Signal */
  s: Signal<T>;

  /** Change handler */
  c: ChangeHandler;

  /** Dependencies */
  d: Set<BaseSignal>;
}

export type ChangeHandler = () => void;
export type WatcherHandler = (watcher: Watcher<unknown>) => void;
export type Disposer = () => void;
