// @ts-check
/**
 * ESLint flat config for CakeNews.
 *
 * Scope: TypeScript and Angular template files. We deliberately keep
 * the rule set narrow so the wall in CI is *signal*, not noise.
 *
 *   - typescript-eslint recommended (no-floating-promises, no-explicit-any
 *     downgraded to a warning for the brief refactor surface still using
 *     it),
 *   - angular-eslint for component/directive selectors and template
 *     binding correctness,
 *   - generated dist / build artefacts and the spec stubs (which use
 *     `any` access for prototype injection) are skipped.
 */

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'out-tsc/**',
      'node_modules/**',
      'public/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
      // Edge Functions run on Deno; their `https://esm.sh/...` imports
      // and `Deno.*` globals aren't part of the browser/Node lint
      // surface. Lint them separately with `deno lint` from the
      // `supabase/` workspace.
      'supabase/functions/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        // Typed linting needs the project graph. We point at every
        // tsconfig in the repo so all `.ts` files (app + spec + setup)
        // resolve their types.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      // Selector / lifecycle prefixes: we use the project default `app-`
      // prefix already; just enforce kebab-case style.
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      // Promises: forgetting `await` on a side-effecting call is the
      // single most common bug in async code. We start at `warn` while
      // the legacy admin components still have ~50 unawaited promises;
      // once those are migrated to `void` / await, promote to `error`.
      '@typescript-eslint/no-floating-promises': 'warn',
      // Same logic for `require-await` — admin handlers tagged async
      // for ergonomic reasons even when the body is sync.
      '@typescript-eslint/require-await': 'warn',
      // The `onFoo` output naming convention is used heavily in the
      // existing codebase. We migrate gradually rather than blow up
      // CI on every new component touch.
      '@angular-eslint/no-output-on-prefix': 'warn',
      // Allow numeric / boolean literal types for tagged unions etc.
      '@typescript-eslint/no-empty-function': 'off',
      // `any` is sometimes needed at boundaries (Supabase payloads).
      // Keep as warn so it surfaces in CI without blocking iteration.
      '@typescript-eslint/no-explicit-any': 'warn',
      // `_` prefix is our convention for ignored params.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // We don't enforce a single type/interface convention — they have
      // different ergonomics depending on the use site.
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      // The Supabase SDK returns loosely-typed payloads; the `unsafe-*`
      // family produces hundreds of false positives at the boundary
      // until we wrap the SDK in typed adapters (planned). Until then
      // we trust the SDK at the integration layer.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      // Stylistic checks that conflict with Angular signals patterns.
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/array-type': ['warn', { default: 'array' }],
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      // Supabase channel status is a string union typed loosely; the
      // comparison rule fires false positives we can't avoid without
      // a type assertion. Off until we ship a typed adapter.
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      'no-async-promise-executor': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      // Warns rather than errors for the rest of the deferred surface.
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/unbound-method': 'off',
      '@angular-eslint/no-output-native': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // The feed view's swipe-track and admin templates have dynamic
      // ARIA / focus needs we'll address in the a11y sprint;
      // don't fail CI on them now.
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/alt-text': 'warn',
      '@angular-eslint/template/no-autofocus': 'warn',
      '@angular-eslint/template/elements-content': 'warn',
      // Migration to control-flow (@if / @for) is in progress; warn for
      // now so new code gets nudged without breaking the legacy admin.
      '@angular-eslint/template/prefer-control-flow': 'warn',
    },
  },
  {
    files: ['**/*.spec.ts', 'src/test-setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
);
