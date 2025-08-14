// prettier.config.js, .prettierrc.js, prettier.config.mjs, or .prettierrc.mjs

/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
  trailingComma: 'es5',
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  printWidth: 80,

  plugins: ['@trivago/prettier-plugin-sort-imports', 'prettier-plugin-merge'],
  importOrder: [
    '<THIRD_PARTY_MODULES>',
    '^@/lib/(.*)$',
    '^./components/ui/(.*)$',
    '^@/components/ui/(.*)$',
    '^./components/base/(.*)$',
    '^@/components/base/(.*)$',
    '^./components/(.*)$',
    '^@/components/(.*)$',
    '^@/(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
}

export default config
