import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { z } from '@/lib/zod-custom'

import { Button } from './components/ui/button'

/* import { Card } from './components/ui/card' */
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from './components/ui/form'
import { Input } from './components/ui/input'
import { Tabs, TabsContent } from './components/ui/tabs'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'
import BNav from './components/base/BNav'

import CodeForm, { CodeScheme } from './components/CodeForm'

import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { completeEmailSign, postEmailSinup, postEmailVerify } from './api'
import { SERVER_ERR_ACCOUNT_EXIST } from './constants'
import { emailRule, passwordRule, phoneRule, usernameRule } from './rules'
import { useAuthedUserStore } from './state/global'

const emailScheme = z.object({
  email: emailRule,
})

const phoneScheme = z.object({
  phone: phoneRule,
})

const signupScheme = z.object({
  username: usernameRule,
  password: passwordRule,
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

  const autheState = useAuthedUserStore()
  const navigate = useNavigate()

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
      /* email: 'test@example.com', */
      email: '',
    },
  })

  const phoneForm = useForm<PhoneScheme>({
    resolver: zodResolver(phoneScheme),
    defaultValues: {
      /* phone: '13599887798', */
      phone: '',
    },
  })

  const form = useForm<SignupScheme>({
    resolver: zodResolver(signupScheme),
    defaultValues: {
      /* username: 'abcd',
       * password: 'sdfsdfDFDF$#23423', */
      username: '',
      password: '',
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
    /* console.log('email: ', email.current)
     * console.log('code values: ', values) */
    /* console.log('code type: ', currTab) */
    if (loading) return

    setLoading(true)
    try {
      const data = await postEmailVerify(email.current, values.code)
      /* console.log('email verify resp data:', data) */

      if (!data.code) {
        setCodeVerified(true)
        autheState.update(data.data.token, '', '')
      } else {
        if (data.code == SERVER_ERR_ACCOUNT_EXIST) {
          toast.info('邮箱已注册，请直接登录')
          navigate(`/signin?account=${email.current}`)
        }
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
      /* console.log('signup complete data:', data) */

      if (!data.code) {
        setCodeVerified(true)
        const { token, username, userID } = data.data
        autheState.update(token, username, userID)
        navigate('/')
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
                <div className="text-sm mt-8">
                  已有账号或手机号账户请
                  <Link to="/signin" className="b-text-link">
                    直接登录
                  </Link>
                </div>
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
