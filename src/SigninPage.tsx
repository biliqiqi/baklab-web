import { zodResolver } from '@hookform/resolvers/zod'
import { memo, useState } from 'react'
import { Control, Controller, Path, useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { z } from '@/lib/zod-custom'

import { Button } from './components/ui/button'
import { Form, FormControl, FormItem, FormMessage } from './components/ui/form'
import { Input } from './components/ui/input'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'
import BNav from './components/base/BNav'

import { emailRule, passwordRule } from './rules'

const signinScheme = z.object({
  account: emailRule,
  password: passwordRule,
})

type SigninScheme = z.infer<typeof signinScheme>

interface FormInputProps<T extends SigninScheme> {
  control: Control<T>
  name: Path<T>
  type?: 'text' | 'password' | 'email' | 'number'
  placeholder?: string
}

const FormInput = memo(
  <T extends SigninScheme>({
    control,
    name,
    type = 'text',
    placeholder,
  }: FormInputProps<T>) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className="mb-8">
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              autoComplete="off"
              state={fieldState.invalid ? 'invalid' : 'default'}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
)

export default function SigninPage() {
  const [loading, setLoading] = useState(false)

  const [searchParams, _setSearchParams] = useSearchParams()
  const account = searchParams.get('account')
  console.log('account: ', account)

  const signinForm = useForm<SigninScheme>({
    resolver: zodResolver(signinScheme),
    defaultValues: {
      account: 't@example.com',
      password: 'sdfsdfDFDF$#23423',
    },
  })

  const onSigninSubmit = async (values: SigninScheme) => {
    try {
      console.log('values: ', values)

      if (loading) return

      setLoading(true)

      /* const data = await completeEmailSign(
  *   email.current,
  *   values.username,
  *   values.password
  * )
  * console.log('email verify resp data:', data)

  * if (!data.code) {
  *   setCodeVerified(true)
  * } */
    } catch (e) {
      console.error('signin error: ', e)
    } finally {
      setLoading(false)
    }
  }

  console.log('render signin page')

  return (
    <>
      <BNav />
      <BContainer title="登录">
        <div className="w-[400px] space-y-8 mx-auto py-4">
          <Form {...signinForm}>
            <form onSubmit={signinForm.handleSubmit(onSigninSubmit)}>
              <FormInput
                control={signinForm.control}
                name="account"
                placeholder="请输入邮箱"
              />
              <FormInput
                control={signinForm.control}
                name="password"
                type="password"
                placeholder="请输入密码"
              />
              <Button
                type="submit"
                className="w-full text-center mb-4"
                disabled={loading}
              >
                {loading ? <BLoader /> : '登录'}
              </Button>
            </form>
          </Form>
        </div>
      </BContainer>
    </>
  )
}
