import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import perfectionist from 'eslint-plugin-perfectionist';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import js from '@eslint/js';

/**
 * A custom ESLint configuration for backend API project.
 *
 * @type {import("eslint").Linter.Config}
 */
export default [
  {
    ignores: ['node_modules/**', 'cdk.out/**', 'dist/**', 'build/**', 'scripts/**'],
  },
  perfectionist.configs['recommended-line-length'],
  eslintPluginPrettierRecommended,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    rules: {
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          leadingUnderscore: 'require',
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
        },
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'warn',
        { overrides: { constructors: 'no-public' } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'table'] }],
      'spaced-comment': ['error', 'always', { exceptions: ['*'] }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',

      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'perfectionist/sort-named-imports': 'warn',
      'perfectionist/sort-named-exports': 'warn',
      'perfectionist/sort-interfaces': 'off',
      'perfectionist/sort-exports': 'warn',
      'perfectionist/sort-imports': 'warn',

      'perfectionist/sort-objects': 'off',

      'perfectionist/sort-classes': 'off',
      'perfectionist/sort-enums': 'warn',
      'no-extra-boolean-cast': 'off',
      'prettier/prettier': 'warn',
      'prefer-const': 'warn',
      'no-eq-null': 'warn',
      'no-var': 'warn',
      eqeqeq: 'warn',
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: globals.node,
      ecmaVersion: 2020,
    },
    files: ['**/*.{ts,tsx}'],
  },
];
