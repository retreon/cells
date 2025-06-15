import { source, get, watch } from '../../index';

describe('source', () => {
  it('fetches fresh values in volatile mode', () => {
    let value = 0;
    const counter = source(() => ++value);

    expect(get(counter)).toBe(1);
    expect(get(counter)).toBe(2);
    expect(get(counter)).toBe(3);
  });

  it('caches values when watched', () => {
    let value = 0;
    const counter = source(() => ++value);

    const dispose = watch(counter, () => {});

    expect(get(counter)).toBe(1);
    expect(get(counter)).toBe(1); // Cached

    dispose();
  });

  it('returns to volatile mode when unwatched', () => {
    let value = 0;
    const counter = source(() => ++value);

    const dispose = watch(counter, () => {});
    expect(get(counter)).toBe(1);

    dispose();

    expect(get(counter)).toBe(2);
    expect(get(counter)).toBe(3);
  });

  it('notifies watchers when subscription fires', () => {
    let onChange: (() => void) | undefined;
    const timer = source(
      () => Date.now(),
      (cb) => {
        onChange = cb;
        return () => {
          onChange = undefined;
        };
      },
    );

    let notified = false;
    const dispose = watch(timer, () => {
      notified = true;
    });

    // Trigger change
    onChange?.();

    expect(notified).toBe(true);

    dispose();
  });

  it('subscribes only when first watcher is added', () => {
    let subscribed = false;
    let unsubscribed = false;

    const timer = source(
      () => Date.now(),
      () => {
        subscribed = true;
        return () => {
          unsubscribed = true;
        };
      },
    );

    expect(subscribed).toBe(false);

    const dispose1 = watch(timer, () => {});
    expect(subscribed).toBe(true);
    expect(unsubscribed).toBe(false);

    const dispose2 = watch(timer, () => {});
    expect(unsubscribed).toBe(false); // Still has watchers

    dispose1();
    expect(unsubscribed).toBe(false); // Still has one watcher

    dispose2();
    expect(unsubscribed).toBe(true); // No more watchers
  });

  it('handles sources without subscriptions', () => {
    const random = source(() => Math.random());

    // Should work in volatile mode
    const val1 = get(random);
    const val2 = get(random);
    expect(val1).not.toBe(val2);

    // Should cache when watched
    const dispose = watch(random, () => {});
    const val3 = get(random);
    const val4 = get(random);
    expect(val3).toBe(val4);

    dispose();
  });

  it('handles undefined values correctly', () => {
    let returnUndefined = true;
    const undefinedSource = source(() => {
      return returnUndefined ? undefined : 'defined';
    });

    expect(get(undefinedSource)).toBe(undefined);

    // Should cache undefined when watched
    const dispose = watch(undefinedSource, () => {});
    expect(get(undefinedSource)).toBe(undefined);
    expect(get(undefinedSource)).toBe(undefined); // Should use cached undefined

    dispose();

    // Should fetch fresh after unwatched
    returnUndefined = false;
    expect(get(undefinedSource)).toBe('defined');
  });

  it('resets cache flag when subscription fires', () => {
    let value = 0;
    let onChange: (() => void) | undefined;

    const counter = source(
      () => ++value,
      (cb) => {
        onChange = cb;
        return () => {
          onChange = undefined;
        };
      },
    );

    // Watch the source - should cache first value
    const dispose = watch(counter, () => {});
    expect(get(counter)).toBe(1);
    expect(get(counter)).toBe(1); // Should use cached value

    // Trigger subscription change
    onChange?.();

    // Should fetch fresh value after subscription fires
    expect(get(counter)).toBe(2);
    expect(get(counter)).toBe(2); // Should cache the new value

    dispose();
  });
});
