module.exports = {
  root: true,
  env: { es2021: true, node: true, browser: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', project: './tsconfig.json' },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'import', 'unused-imports'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  settings: {
    react: { version: 'detect' },
    'import/resolver': { typescript: true },
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'unused-imports/no-unused-imports': 'warn',
    'import/order': [
      'warn',
      {
        groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
    '@typescript-eslint/consistent-type-imports': 'warn',
    'react/prop-types': 'off',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'web-build/', 'android/', 'ios/'],
};

