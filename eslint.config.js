import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'public/Projects/**', '**/porskad-dist/**', '**/*-dist/**']),
  {
    files: ['vite-plugin-mock-api.js', 'vite.config.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['server.js', 'server-upload.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^[A-Z_]' }],
      // The following rules are disabled because they flag the standard
      // data-fetching pattern (load data in useEffect, call setState) which
      // is intentional and correct for this app. Re-enable if migrating to
      // a data-fetching library that avoids manual setState in effects.
      'react-hooks/set-state-in-effect': 'off',
      // This file exports both a hook and a provider component, which is
      // a valid pattern (not a bug).
      'react-refresh/only-export-components': 'off',
    },
  },
])