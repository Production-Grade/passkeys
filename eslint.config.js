const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');

module.exports = [
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        jest: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          args: 'after-used',
        },
      ],
      'no-unused-vars': 'off', // Use TypeScript version instead
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  {
    files: ['src/react/**/*.ts', 'src/nextjs/**/*.ts'],
    languageOptions: {
      globals: {
        window: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        // Don't use project for test files
      },
      globals: {
        jest: true,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        fail: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        Headers: 'readonly',
        Response: 'readonly',
        NextResponse: 'readonly',
      },
    },
  },
  {
    ignores: ['dist', 'node_modules', 'coverage', '*.js', '!eslint.config.js'],
  },
];


