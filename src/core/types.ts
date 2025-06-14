// Core discriminated union types
export interface Cell<T> {
  readonly type: 'cell';
  value: T;
  version: number;
  watchers: Set<ChangeHandler>;
}

export interface Formula<T> {
  readonly type: 'formula';
  readonly compute: () => T;
  cachedValue: T | undefined;
  version: number;
  dependencyVersions: Map<BaseSignal, number>;
  watchers: Set<ChangeHandler>;
}

export interface Source<T> {
  readonly type: 'source';
  readonly fetch: () => T;
  readonly subscribe?: (onChange: () => void) => Disposer;
  cachedValue: T | undefined;
  version: number;
  watchers: Set<ChangeHandler>;
  isVolatile: boolean;
  subscriptionDisposer?: Disposer;
}

export type Signal<T> = Cell<T> | Formula<T> | Source<T>;
export type BaseSignal = Signal<unknown>;

export type ChangeHandler = () => void;
export type Disposer = () => void;
