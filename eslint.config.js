const expo = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  ...expo,
  prettier,
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**', 'ios/**', 'android/**'],
  },
  {
    files: ['src/unistyles.ts'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['e2e/**/*.js'],
    languageOptions: {
      globals: {
        beforeAll: 'readonly',
        by: 'readonly',
        describe: 'readonly',
        device: 'readonly',
        element: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        waitFor: 'readonly',
      },
    },
  },
];
