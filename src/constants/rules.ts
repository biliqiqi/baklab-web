import { z } from 'zod'

export const emailRule = z.string().email()
export const phoneRule = z.string().regex(/^1\d{10}$/, '错误的手机号格式')
export const usernameRule = z
  .string()
  .min(4, '用户名不得小于4个字符')
  .max(20, '用户名不得小于20个字符')
  .transform((str) => str.toLowerCase())
  .pipe(
    z.string().refine(
      (value) => {
        // 检查是否只包含允许的字符
        const validCharsRegex = /^[a-z0-9._-]+$/

        // 检查首尾是否是标点符号
        const startsWithPunctuation = /^[._-]/.test(value)
        const endsWithPunctuation = /[._-]$/.test(value)

        return (
          validCharsRegex.test(value) &&
          !startsWithPunctuation &&
          !endsWithPunctuation
        )
      },
      {
        message:
          '用户名只能包含字母、数字、下划线(_)、中横线(-)和英文句号(.)，且首尾不能是标点符号',
      }
    )
  )

export const passwordRule = z
  .string()
  .min(12, '密码长度不得小于12个字符')
  .max(18, '密码长度不得超过18个字符')
  .regex(/[a-z]/, '密码必须至少包含一个小写字母')
  .regex(/[A-Z]/, '密码必须至少包含一个大写字母')
  .regex(/\d/, '密码必须包含数字')
  /* eslint-disable-next-line */
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, '密码必须包含特殊符号')
