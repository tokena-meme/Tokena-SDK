import { defineConfig } from 'tsup';

export default defineConfig([
  // Core entry (no React dependency)
  {
    entry: { index: 'src/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    external: ['ethers', 'react'],
  },
  // React entry (requires React)
  {
    entry: { react: 'src/react.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    external: ['ethers', 'react'],
  },
]);
