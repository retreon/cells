import { cell, batch, watch } from '../../index';

describe('watch', () => {
  it('notifies on cell changes', () => {
    const count = cell(0);
    let notified = false;

    const [dispose] = watch(count, () => {
      notified = true;
    });

    // Should not notify before change
    expect(notified).toBe(false);

    // Change the cell
    batch((swap) => {
      swap(count, 1);
    });

    // Should notify after change
    expect(notified).toBe(true);

    dispose();
  });

  it('supports multiple watchers', () => {
    const count = cell(0);
    let count1 = 0;
    let count2 = 0;

    const [dispose1] = watch(count, () => {
      count1++;
    });

    const [dispose2] = watch(count, () => {
      count2++;
    });

    batch((swap) => {
      swap(count, 1);
    });

    expect(count1).toBe(1);
    expect(count2).toBe(1);

    dispose1();
    dispose2();
  });

  it('stops notifying after dispose', () => {
    const count = cell(0);
    let notifyCount = 0;

    const [dispose] = watch(count, () => {
      notifyCount++;
    });

    batch((swap) => {
      swap(count, 1);
    });

    expect(notifyCount).toBe(1);

    dispose();

    batch((swap) => {
      swap(count, 2);
    });

    // Should not notify after dispose
    expect(notifyCount).toBe(1);
  });

  it('only notifies once per batch for multiple changes', () => {
    const count = cell(0);
    let notifyCount = 0;

    watch(count, () => {
      notifyCount++;
    });

    batch((swap) => {
      swap(count, 1);
      swap(count, 2);
      swap(count, 3);
    });

    // Should only notify once despite multiple changes
    expect(notifyCount).toBe(1);
  });

  it('does not notify if value does not change', () => {
    const count = cell(5);
    let notified = false;

    watch(count, () => {
      notified = true;
    });

    batch((swap) => {
      swap(count, 5); // Same value
    });

    expect(notified).toBe(false);
  });

  it('invokes onChange without `this` context', () => {
    const count = cell(0);
    const onChange = vi.fn();

    watch(count, onChange);

    batch((swap) => {
      swap(count, 1);
    });

    expect(onChange.mock.contexts).toEqual([undefined]);
  });
});
