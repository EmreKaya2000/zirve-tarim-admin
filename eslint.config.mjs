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
      /*
       * CI, sozlesme kontrolu ve Playwright icin Api deposunu BURAYA klonlar.
       * `eslint .` o klasorun icine girip API'nin kaynagini BU deponun
       * kurallariyla denetliyordu; `--max-warnings 0` oldugu icin API'nin
       * seed betigindeki console satirlari derlemeyi kiriyordu.
       *
       * Yerelde hic gorunmez (klasor yok) ve CI'da da gorunmuyordu, cunku
       * checkout adimi bu asamaya kadar zaten dusuyordu. .gitignore'da olmasi
       * yetmez: ESLint duz yapilandirmasi .gitignore okumaz.
       */
      '.zirve-api/**',
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
