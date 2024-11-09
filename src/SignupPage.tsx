import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { z } from '@/lib/zod-custom'

import { Button } from './components/ui/button'

/* import { Card } from './components/ui/card' */
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from './components/ui/form'
import { Input } from './components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'
import BNav from './components/base/BNav'

import CodeForm, { CodeScheme } from './components/CodeForm'

import { completeEmailSign, postEmailSinup, postEmailVerify } from './api'
import request, { setAuthRequest } from './lib/request'

const emailScheme = z.object({
  email: z.string().email(),
})

const phoneScheme = z.object({
  phone: z.string().regex(/^1\d{10}$/, '错误的手机号格式'),
})

const signupScheme = z.object({
  username: z
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
    ),
  password: z
    .string()
    .min(12, '密码长度不得小于12个字符')
    .max(18, '密码长度不得超过18个字符')
    .regex(/[a-z]/, '密码必须至少包含一个小写字母')
    .regex(/[A-Z]/, '密码必须至少包含一个大写字母')
    .regex(/\d/, '密码必须包含数字')
    /* eslint-disable-next-line */
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, '密码必须包含特殊符号'),
})

type EmailScheme = z.infer<typeof emailScheme>
type PhoneScheme = z.infer<typeof phoneScheme>

type SignupScheme = z.infer<typeof signupScheme>

enum SignupType {
  email = 'email',
  phone = 'phone',
}

export default function SignupPage() {
  const [isPhone, setIsPhone] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [currTab, setCurrTab] = useState<SignupType>(SignupType.email)
  const [loading, setLoading] = useState(false)

  const email = useRef('')

  const reset = () => {
    setIsPhone(false)
    setCodeSent(false)
    setCodeVerified(false)
    setCurrTab(SignupType.email)
    setLoading(false)
  }

  const emailForm = useForm<EmailScheme>({
    resolver: zodResolver(emailScheme),
    defaultValues: {
      email: 'test@example.com',
    },
  })

  const phoneForm = useForm<PhoneScheme>({
    resolver: zodResolver(phoneScheme),
    defaultValues: {
      phone: '13599887798',
    },
  })

  const form = useForm<SignupScheme>({
    resolver: zodResolver(signupScheme),
    defaultValues: {
      username: 'abcd',
      password: 'sdfsdfDFDF$#23423',
    },
  })

  const signWithEmail = async (email: string) => {
    if (loading) return

    setLoading(true)
    try {
      const data = await postEmailSinup(email)
      /* console.log('email post resp data:', data) */
      if (!data.code) {
        setCodeSent(true)
      }
    } catch (e) {
      console.error('post email signup error: ', e)
    } finally {
      setLoading(false)
    }
  }

  const onEmailSubmit = (values: EmailScheme) => {
    /* console.log('values: ', values) */
    email.current = values.email
    signWithEmail(values.email)
  }

  const onPhoneSubmit = (values: PhoneScheme) => {
    console.log('values: ', values)
    setIsPhone(true)
    setCodeSent(true)
  }

  const onCodeSubmit = async (values: CodeScheme) => {
    console.log('email: ', email.current)
    console.log('code values: ', values)
    /* console.log('code type: ', currTab) */
    if (loading) return

    setLoading(true)
    try {
      const data = await postEmailVerify(email.current, values.code)
      console.log('email verify resp data:', data)

      if (!data.code) {
        setCodeVerified(true)

        setAuthRequest(
          request.extend((opt) => {
            opt.headers = {
              ...opt.headers,
              Authorization: `Bearer ${data.data.token}`,
            }
            return opt
          })
        )
      }
    } catch (e) {
      console.error('post email signup error: ', e)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: SignupScheme) => {
    try {
      console.log('values: ', values)

      if (loading) return

      setLoading(true)

      const data = await completeEmailSign(
        email.current,
        values.username,
        values.password
      )
      console.log('email verify resp data:', data)

      if (!data.code) {
        setCodeVerified(true)
      }
    } catch (e) {
      console.error('complete email signup error: ', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <BNav />
      <BContainer title="注册">
        <div className="w-[400px] space-y-8 mx-auto py-4">
          {codeVerified ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="mb-8 text-gray-800">
                  验证成功，请填写以下信息以完成注册。
                </div>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field, fieldState }) => (
                    <FormItem className="mb-8">
                      {/* <FormLabel errorHighlight={false}>用户名</FormLabel> */}
                      <FormControl>
                        <Input
                          placeholder="请输入用户名"
                          autoComplete="off"
                          state={fieldState.invalid ? 'invalid' : 'default'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem className="mb-8">
                      {/* <FormLabel errorHighlight={false}>密码</FormLabel> */}
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="请输入密码"
                          autoComplete="off"
                          {...field}
                          state={fieldState.invalid ? 'invalid' : 'default'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full text-center mb-4"
                  disabled={loading}
                >
                  {loading ? <BLoader /> : '提交'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full text-center"
                  onClick={reset}
                >
                  重新注册
                </Button>
              </form>
            </Form>
          ) : codeSent ? (
            <CodeForm
              isPhone={isPhone}
              loading={loading}
              onBackClick={() => setCodeSent(false)}
              onSubmit={onCodeSubmit}
              onResendClick={() => signWithEmail(email.current)}
            />
          ) : (
            <Tabs defaultValue={currTab}>
              {/* <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger
                  value={SignupType.email}
                  onClick={() => setCurrTab(SignupType.email)}
                >
                  邮箱注册
                </TabsTrigger>
                <TabsTrigger
                  value={SignupType.phone}
                  onClick={() => setCurrTab(SignupType.phone)}
                >
                  手机号注册
                </TabsTrigger>
              </TabsList> */}
              <TabsContent value={SignupType.email}>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)}>
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <FormItem className="mb-8">
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="请输入邮箱"
                              autoComplete="off"
                              {...field}
                              state={fieldState.invalid ? 'invalid' : 'default'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full text-center"
                      disabled={loading}
                    >
                      {loading ? <BLoader /> : '下一步'}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              <TabsContent value={SignupType.phone}>
                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}>
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field, fieldState }) => (
                        <FormItem className="mb-8">
                          <FormControl>
                            <Input
                              placeholder="请输入手机号码"
                              autoComplete="off"
                              {...field}
                              state={fieldState.invalid ? 'invalid' : 'default'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full text-center">
                      下一步
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </BContainer>
    </>
  )
}
