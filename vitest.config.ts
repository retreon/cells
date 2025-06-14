import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      include: ['src'],
    },
    exclude: [...configDefaults.exclude, '.direnv/**'],
  },
});
