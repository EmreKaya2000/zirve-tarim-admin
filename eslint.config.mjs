import { nextConfig } from './config/eslint/next.mjs';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextConfig,
  {
    ignores: [
      '.next/**',
      'next-env.d.ts',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      // Senkron kopya: kaynagi zirve-tarim-api/packages/types.
      'src/types/**',
    ],
  },
  {
    // Derleme betikleri terminale yazmak İÇİN vardır; ne yaptığını
    // söylemeyen bir betik hata ayıklanamaz.
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
];
