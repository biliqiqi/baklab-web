import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import zodEn from 'zod-i18n-map/locales/en/zod.json'
import zodZhCN from 'zod-i18n-map/locales/zh-CN/zod.json'

import { API_HOST } from '@/constants/constants'

import enRes from './en.json'
import zhHansRes from './zh-Hans.json'

const zhHansOpts = {
  translation: zhHansRes,
  zod: zodZhCN,
}

const resources = {
  'zh-Hans': zhHansOpts,
  'zh-CN': zhHansOpts,
  en: {
    translation: enRes,
    zod: zodEn,
  },
}

await i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    detection: {
      lookupQuerystring: 'lang',
      lookupCookie: 'lang',
      cookieDomain: new URL(API_HOST).hostname,
      cookieMinutes: 30 * 24 * 60,
      cookieOptions: { path: '/', sameSite: 'lax' },
      caches: ['localStorage', 'cookie'],
      lookupLocalStorage: 'lang',
      htmlTag: document.documentElement,
      convertDetectedLanguage: (lng) => {
        return lng.replace('_', '-')
      },
    },
  })

if (i18n.services.formatter) {
  i18n.services.formatter.add('upperCaseHead', (val: string, lng) => {
    if (lng == 'en') {
      return val.charAt(0).toUpperCase() + val.slice(1)
    }

    return val
  })

  i18n.services.formatter.add('upperCase', (val: string, lng) => {
    if (lng == 'en') {
      return val.toUpperCase()
    }

    return val
  })

  i18n.services.formatter.add('lowerCase', (val: string, lng) => {
    if (lng == 'en') {
      return val.toLowerCase()
    }

    return val
  })

  i18n.services.formatter.add('uppercaseWords', (val: string, lng) => {
    if (lng == 'en') {
      return val
        .split(' ')
        .map((val) => {
          if (val == '') {
            return val
          }

          return val.charAt(0).toUpperCase() + val.slice(1)
        }, [])
        .join(' ')
    }

    return val
  })
}

export default i18n
