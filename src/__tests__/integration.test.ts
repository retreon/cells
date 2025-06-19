import { cell, formula, source, get, batch, watch } from '../index';

describe('Integration Tests', () => {
  describe('Shopping Cart Example', () => {
    it('manages a reactive shopping cart with prices and quantities', () => {
      // Product catalog
      const products = cell([
        { id: 1, name: 'Widget', price: 9.99 },
        { id: 2, name: 'Gadget', price: 19.99 },
        { id: 3, name: 'Doohickey', price: 5.99 },
      ]);

      // Shopping cart items
      const cartItems = cell([
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ]);

      // Calculate subtotal
      const subtotal = formula(() => {
        const items = get(cartItems);
        const catalog = get(products);

        return items.reduce((total, item) => {
          const product = catalog.find((p) => p.id === item.productId);
          return total + (product?.price ?? 0) * item.quantity;
        }, 0);
      });

      // Tax rate as a cell
      const taxRate = cell(0.08);

      // Calculate tax
      const tax = formula(() => get(subtotal) * get(taxRate));

      // Calculate total
      const total = formula(() => get(subtotal) + get(tax));

      // Initial state
      expect(get(subtotal)).toBe(39.97);
      expect(get(tax)).toBeCloseTo(3.2, 2);
      expect(get(total)).toBeCloseTo(43.17, 2);

      // Add item to cart
      batch((swap) => {
        swap(cartItems, [...get(cartItems), { productId: 3, quantity: 3 }]);
      });

      expect(get(subtotal)).toBe(57.94);
      expect(get(total)).toBeCloseTo(62.58, 2);

      // Update tax rate
      batch((swap) => {
        swap(taxRate, 0.1);
      });

      expect(get(tax)).toBeCloseTo(5.79, 2);
      expect(get(total)).toBeCloseTo(63.73, 2);
    });
  });

  describe('Form Validation Example', () => {
    it('implements reactive form validation with dynamic rules', () => {
      // Form fields
      const username = cell('');
      const email = cell('');
      const password = cell('');
      const confirmPassword = cell('');

      // Validation rules
      const minPasswordLength = cell(8);
      const requireUppercase = cell(true);

      // Field validations
      const usernameError = formula(() => {
        const value = get(username);
        if (!value) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value))
          return 'Username can only contain letters, numbers, and underscores';
        return null;
      });

      const emailError = formula(() => {
        const value = get(email);
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return 'Invalid email format';
        return null;
      });

      const passwordError = formula(() => {
        const value = get(password);
        const minLength = get(minPasswordLength);
        const needsUppercase = get(requireUppercase);

        if (!value) return 'Password is required';
        if (value.length < minLength)
          return `Password must be at least ${minLength} characters`;
        if (needsUppercase && !/[A-Z]/.test(value))
          return 'Password must contain an uppercase letter';
        return null;
      });

      const confirmPasswordError = formula(() => {
        const value = get(confirmPassword);
        const pwd = get(password);
        if (!value) return 'Please confirm your password';
        if (value !== pwd) return 'Passwords do not match';
        return null;
      });

      // Overall form validity
      const isValid = formula(() => {
        return (
          !get(usernameError) &&
          !get(emailError) &&
          !get(passwordError) &&
          !get(confirmPasswordError)
        );
      });

      // Track which fields have been touched
      const touched = cell(new Set<string>());

      // Helper to mark field as touched
      const touchField = (field: string) => {
        batch((swap) => {
          const current = get(touched);
          swap(touched, new Set([...current, field]));
        });
      };

      // Initial state - empty form
      expect(get(isValid)).toBe(false);
      expect(get(usernameError)).toBe('Username is required');

      // Fill out form
      batch((swap) => {
        swap(username, 'john_doe');
        swap(email, 'john@example.com');
        swap(password, 'SecurePass');
        swap(confirmPassword, 'SecurePass');
      });

      touchField('username');
      touchField('email');
      touchField('password');
      touchField('confirmPassword');

      expect(get(isValid)).toBe(true);
      expect(get(usernameError)).toBe(null);
      expect(get(emailError)).toBe(null);
      expect(get(passwordError)).toBe(null);
      expect(get(confirmPasswordError)).toBe(null);

      // Change validation rules
      batch((swap) => {
        swap(minPasswordLength, 12);
        swap(requireUppercase, true);
      });

      expect(get(isValid)).toBe(false);
      expect(get(passwordError)).toBe(
        'Password must be at least 12 characters',
      );

      // Fix password
      batch((swap) => {
        swap(password, 'SecurePassword123');
        swap(confirmPassword, 'SecurePassword123');
      });

      expect(get(isValid)).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('cleans up watchers and prevents memory leaks', () => {
      const data = cell(0);
      const computed = formula(() => get(data) * 2);

      // Track handler calls
      const handlers = {
        data: vi.fn(),
        computed: vi.fn(),
      };

      // Watch both signals
      const [disposeData, renewData] = watch(data, handlers.data);
      const [disposeComputed, renewComputed] = watch(
        computed,
        handlers.computed,
      );

      renewData();
      renewComputed();

      // Update data
      batch((swap) => {
        swap(data, 1);
      });

      expect(handlers.data).toHaveBeenCalledTimes(1);
      expect(handlers.computed).toHaveBeenCalledTimes(1);

      // Dispose computed watcher
      disposeComputed();

      // Update data again
      batch((swap) => {
        swap(data, 2);
      });

      expect(handlers.data).toHaveBeenCalledTimes(2);
      expect(handlers.computed).toHaveBeenCalledTimes(1); // Not called again

      // Dispose data watcher
      disposeData();

      // Update data once more
      batch((swap) => {
        swap(data, 3);
      });

      expect(handlers.data).toHaveBeenCalledTimes(2); // Not called again
      expect(handlers.computed).toHaveBeenCalledTimes(1); // Still not called
    });
  });

  describe('Source Subscription Lifecycle', () => {
    it('manages source subscriptions based on watchers', () => {
      let subscribeCount = 0;
      let unsubscribeCount = 0;
      let readCount = 0;
      let currentValue = 0;
      let onChange: (() => void) | undefined;

      const counter = source(
        () => {
          readCount++;
          return currentValue;
        },
        (cb) => {
          subscribeCount++;
          onChange = cb;
          return () => {
            unsubscribeCount++;
            onChange = undefined;
          };
        },
      );

      // Initially volatile - no subscription
      expect(subscribeCount).toBe(0);
      expect(get(counter)).toBe(0);
      expect(readCount).toBe(1);

      currentValue = 1;
      expect(get(counter)).toBe(1); // Fresh value
      expect(readCount).toBe(2);

      // Add first watcher - triggers subscription
      const [dispose1] = watch(counter, () => {});
      expect(subscribeCount).toBe(1);
      expect(unsubscribeCount).toBe(0);

      // No new reads. We haven't fetched the value yet.
      expect(readCount).toBe(2);
      currentValue = 2;

      expect(get(counter)).toBe(2); // Fresh read, new value
      expect(readCount).toBe(3);

      // Cached this time!
      expect(get(counter)).toBe(2);
      expect(readCount).toBe(3);

      currentValue = 3;
      expect(get(counter)).toBe(2); // Still cached
      expect(readCount).toBe(3);

      onChange?.(); // Trigger update
      expect(readCount).toBe(3);
      expect(get(counter)).toBe(3); // Cache invalidated, fresh read
      expect(readCount).toBe(4);

      // Add second watcher - no new subscription
      const [dispose2] = watch(counter, () => {});
      expect(subscribeCount).toBe(1);

      // Remove first watcher - subscription remains
      dispose1();
      expect(unsubscribeCount).toBe(0);

      // Remove last watcher - triggers unsubscribe
      dispose2();
      expect(unsubscribeCount).toBe(1);

      // Back to volatile
      currentValue = 3;
      expect(readCount).toBe(4);

      // Back to volatile mode
      expect(get(counter)).toBe(3);
      expect(readCount).toBe(5);

      expect(get(counter)).toBe(3);
      expect(readCount).toBe(6);
    });
  });
});
