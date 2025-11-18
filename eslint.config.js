import sharedConfig from '@baklab/shared-web/eslint'

export default [
  ...sharedConfig,
  {
    ignores: ['tsconfig*.json'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.app.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
