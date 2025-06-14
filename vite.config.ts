import { defineConfig } from 'vite';
import * as path from 'path';
import dts from 'vite-plugin-dts';
import manifest from './package.json';

interface PackageJson {
  name: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const pkg = manifest as PackageJson;

const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  pkg.name,
];

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: path.join(import.meta.dirname, './src/index.ts'),
      fileName: 'cells',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external,
      output: {
        exports: 'named',
      },
    },
  },
});
