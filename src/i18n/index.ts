import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import i18n from 'i18next'
import LanguageDetector, {
  DetectorOptions,
} from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import zodEn from 'zod-i18n-map/locales/en/zod.json'
import zodZhCN from 'zod-i18n-map/locales/zh-CN/zod.json'

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

const updateDayjsLocale = () => dayjs.locale(i18n.language.toLowerCase())

i18n.on('initialized', () => {
  updateDayjsLocale()
})

i18n.on('languageChanged', () => {
  updateDayjsLocale()
})

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    detection: {
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
      htmlTag: document.documentElement,
      convertDetectedLanguage: (lng) => {
        return lng.replace('_', '-')
      },
    } as DetectorOptions,
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

  i18n.services.formatter.add('lowerCase', (val: string) => {
    return val.toLowerCase()
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
