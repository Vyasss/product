import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Import boundaries that encode the dependency direction between the source folders:
 * domain <- data, search, smart-search, url <- hooks <- features <- app.
 */
const REACT = ['react', 'react-dom', 'react-dom/*', 'react-router', '@tanstack/*'];
const layer = (...names) => names.map((name) => `**/${name}/**`);

const boundary = (files, patterns, message) => ({
  files,
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
  },
});

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'test-results', 'playwright-report'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: ['src/**/*.tsx', 'src/**/*.ts'],
    ...reactHooks.configs.flat['recommended-latest'],
  },
  {
    files: ['src/**/*.tsx'],
    ...jsxA11y.flatConfigs.strict,
  },
  {
    // Node scripts; browser globals too, for callbacks passed to page.evaluate().
    files: ['scripts/**/*.mjs', '*.js', '*.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // CloudFront Functions runtime: `handler` is invoked by CloudFront, not by this file.
    files: ['infra/**/*.js'],
    languageOptions: { sourceType: 'script', globals: {} },
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^handler$' }] },
  },
  boundary(
    ['src/domain/**'],
    [...REACT, ...layer('data', 'search', 'smart-search', 'url', 'hooks', 'components', 'features', 'app', 'config')],
    'domain is the innermost layer: types and constants only.',
  ),
  boundary(
    ['src/data/**', 'src/search/**', 'src/smart-search/**', 'src/cart/**'],
    [...REACT, ...layer('url', 'hooks', 'components', 'features', 'app')],
    'data, search, smart-search and cart are framework-free and may depend only on domain (and data).',
  ),
  boundary(
    ['src/url/parseFilters.ts', 'src/url/serializeFilters.ts'],
    [...REACT, ...layer('data', 'search', 'smart-search', 'hooks', 'components', 'features', 'app')],
    'The URL codec is pure and may depend only on domain.',
  ),
  boundary(
    ['src/components/**'],
    layer('domain', 'data', 'search', 'smart-search', 'url', 'hooks', 'features', 'app', 'config'),
    'components/ui are generic primitives and know nothing about products.',
  ),
  boundary(
    ['src/hooks/**'],
    layer('components', 'features', 'app'),
    'hooks may not depend on UI layers.',
  ),
  boundary(['src/features/**'], layer('app'), 'features may not depend on app.'),
);
