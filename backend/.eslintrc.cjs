module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'prettier/prettier': 'error',
    // Prevent production source files from importing anything under tests/
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/tests/**', '../tests/**', '../../tests/**', '../../../tests/**'],
            message:
              'src/ must not import from tests/. Move shared types to src/ and import from there.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Relax the rule inside the tests/ directory itself
      files: ['tests/**/*.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', '*.cjs'],
};

