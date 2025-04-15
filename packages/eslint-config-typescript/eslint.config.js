// Import required modules and plugins
const eslintPluginImport = require('eslint-plugin-import');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const eslintPluginSonarjs = require('eslint-plugin-sonarjs');
const globals = require('globals');
const tseslint = require("typescript-eslint");

module.exports = [
  ...tseslint.configs.recommended,
  // Ignore patterns
  {
    ignores: ['**/node_modules', '**/coverage', '**/mocks'],
  },

  // Base configuration
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      import: eslintPluginImport,
      prettier: eslintPluginPrettier,
      sonarjs: eslintPluginSonarjs,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',

      // Import plugin rules
      'import/prefer-default-export': 'off',
      'import/extensions': 'off',
      'import/no-cycle': 'off',

      // Prettier plugin rules
      'prettier/prettier': 'warn',

      // General ESLint rules
      'no-promise-executor-return': 'off',
      'no-restricted-syntax': 'off',
      'no-await-in-loop': 'off',
      'no-shadow': 'off',
      'no-case-declarations': 'off',
      'new-cap': 'off',
      'no-return-await': 'off',
      'no-continue': 'off',
      'prefer-destructuring': 'off',
    },
  },
];
