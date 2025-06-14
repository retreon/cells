// Core discriminated union types
export interface Cell<T> {
  readonly type: 'cell';
  value: T;
  watchers: Set<ChangeHandler>;
}

export interface Formula<T> {
  readonly type: 'formula';
  readonly compute: () => T;
  cachedValue: T | undefined;
  dependencies: Set<BaseSignal>;
  watchers: Set<ChangeHandler>;
  isStale: boolean;
  dependencyDisposers: Map<BaseSignal, Disposer>;
}

export interface Source<T> {
  readonly type: 'source';
  readonly fetch: () => T;
  readonly subscribe?: (onChange: () => void) => Disposer;
  cachedValue: T | undefined;
  watchers: Set<ChangeHandler>;
  isVolatile: boolean;
  subscriptionDisposer?: Disposer;
}

export type Signal<T> = Cell<T> | Formula<T> | Source<T>;
export type BaseSignal = Signal<unknown>;

export type ChangeHandler = () => void;
export type Disposer = () => void;
