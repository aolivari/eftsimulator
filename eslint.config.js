// @ts-check
// Linter del proyecto. Hace cumplir la arquitectura de AGENTS.md:
// features/ aislados, shared/ui sin dominio y composición en app/.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'api/**',
      'scripts/**',
      'src/engine/**',
      'src/data/**',
      '.vercel',
      '.worktrees',
      '.taste-skill',
      'public',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      boundaries,
    },
    settings: {
      // Sin esto, el plugin no resuelve '../x' a 'x.tsx' y no clasifica el elemento.
      'import/resolver': { node: { extensions: ['.ts', '.tsx', '.js', '.jsx'] } },
      'boundaries/elements': [
        { type: 'shared-ui', pattern: 'src/shared/ui/**', mode: 'full' },
        { type: 'shared-lib', pattern: 'src/shared/lib/**', mode: 'full' },
        { type: 'shared-utils', pattern: 'src/shared/utils/**', mode: 'full' },
        { type: 'feature', pattern: 'src/features/*', mode: 'folder', capture: ['featureName'] },
        { type: 'app', pattern: 'src/app/**', mode: 'full' },
      ],
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // 1. Un feature solo se importa a través de su index.ts.
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            { target: ['feature', 'shared-ui', 'shared-lib', 'shared-utils'], allow: ['index.ts', 'index.tsx'] },
            { target: ['app'], allow: '**' },
          ],
        },
      ],

      // 2. Dependencias permitidas: shared nunca depende de features ni de app;
      //    features nunca importan de app.
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            { from: 'shared-ui', disallow: ['feature', 'app'] },
            { from: 'shared-lib', disallow: ['feature', 'app', 'shared-ui'] },
            { from: 'shared-utils', disallow: ['feature', 'app', 'shared-ui', 'shared-lib'] },
            { from: 'feature', disallow: ['app'] },
          ],
        },
      ],

      // 3. Ningún feature ni componente compartido habla con Supabase ni con las
      //    funciones de api/ directamente: pasa por shared/lib.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@supabase/supabase-js', message: 'Usa el cliente de src/shared/lib/supabase.ts.' },
          ],
        },
      ],
    },
  },
  {
    // Excepción: el único sitio que crea el cliente de Supabase.
    files: ['src/shared/lib/supabase.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
