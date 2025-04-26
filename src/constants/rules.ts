import { z } from 'zod'

import i18n from '@/i18n'

export const emailRule = z.string().email()
export const phoneRule = z
  .string()
  .regex(/^1\d{10}$/, i18n.t('formatError', { field: i18n.t('phoneNumber') }))
export const usernameRule = z
  .string()
  .min(4, i18n.t('charMinimum', { field: i18n.t('username'), num: 4 }))
  .max(20, i18n.t('charMaximum', { field: i18n.t('username'), num: 20 }))
  .transform((str) => str.toLowerCase())
  .pipe(
    z.string().refine(
      (value) => {
        const validCharsRegex = /^[a-z0-9._-]+$/
        const startsWithPunctuation = /^[._-]/.test(value)
        const endsWithPunctuation = /[._-]$/.test(value)

        return (
          validCharsRegex.test(value) &&
          !startsWithPunctuation &&
          !endsWithPunctuation
        )
      },
      {
        message: i18n.t('usernameFormatMsg'),
      }
    )
  )

export const passwordRule = z
  .string()
  .min(12, i18n.t('charMinimum', { field: i18n.t('password'), num: 12 }))
  .max(18, i18n.t('charMaximum', { field: i18n.t('password'), num: 18 }))
  .regex(/[a-z]/, i18n.t('passRule1'))
  .regex(/[A-Z]/, i18n.t('passRule2'))
  .regex(/\d/, i18n.t('passRule3'))
  /* eslint-disable-next-line */
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, i18n.t('passRule4'))
