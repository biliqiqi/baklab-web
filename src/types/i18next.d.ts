import 'i18next'

import en from '@/i18n/en.json'
import zhHans from '@/i18n/zh-Hans.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'zh-Hans'
    // custom resources type
    resources: {
      'zh-Hans': typeof zhHans
      'zh-CN': typeof zhHans
      en: typeof en
    }
    // other
  }
}
