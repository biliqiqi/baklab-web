import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { z } from '@/lib/zod-custom'

import BContainer from './components/BContainer'
import BNav from './components/BNav'
import CodeForm, { CodeScheme } from './components/CodeForm'
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

const emailScheme = z.object({
  email: z.string().email(),
})

const phoneScheme = z.object({
  phone: z.string().regex(/^1\d{10}$/, '错误的手机号格式'),
})

const signupScheme = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
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
      username: '',
      password: '',
    },
  })

  /* const emailForm = useForm<>{} */

  const onEmailSubmit = (values: EmailScheme) => {
    console.log('values: ', values)
    setIsPhone(false)
    setCodeSent(true)
  }

  const onPhoneSubmit = (values: PhoneScheme) => {
    console.log('values: ', values)
    setIsPhone(true)
    setCodeSent(true)
  }

  const onCodeSubmit = (values: CodeScheme) => {
    console.log('code values: ', values)
    setCodeVerified(true)
  }

  const onSubmit = (values: SignupScheme) => {
    console.log('values: ', values)
  }

  /* useEffect(() => {
   *   setCodeSent(true)
   * }, [codeSent]) */

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
                    <FormItem className="mb-4">
                      <FormLabel errorHighlight={false}>用户名</FormLabel>
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
                      <FormLabel errorHighlight={false}>密码</FormLabel>
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
                <Button type="submit" className="w-full text-center">
                  提交
                </Button>
              </form>
            </Form>
          ) : codeSent ? (
            <CodeForm
              isPhone={isPhone}
              onBackClick={() => setCodeSent(false)}
              onSubmit={onCodeSubmit}
            />
          ) : (
            <Tabs defaultValue={currTab}>
              <TabsList className="grid w-full grid-cols-2 mb-8">
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
              </TabsList>
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
                    <Button type="submit" className="w-full text-center">
                      下一步
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
