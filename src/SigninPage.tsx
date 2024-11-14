import { zodResolver } from '@hookform/resolvers/zod'
import { memo, useState } from 'react'
import { Control, Controller, Path, useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { z } from '@/lib/zod-custom'

import { Button } from './components/ui/button'
import { Form, FormControl, FormItem } from './components/ui/form'
import { Input } from './components/ui/input'

import BContainer from './components/base/BContainer'
import BLoader from './components/base/BLoader'
import BNav from './components/base/BNav'

import { postSignin } from './api'
import { emailRule, passwordRule } from './rules'
import { useAuthedUserStore } from './state/global'

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
        </FormItem>
      )}
    />
  )
)

const isInnerURL = (url: string) => new URL(url).origin == location.origin

export default function SigninPage() {
  const [loading, setLoading] = useState(false)
  const updateAuthState = useAuthedUserStore((state) => state.update)

  const [searchParams, _setSearchParams] = useSearchParams()
  const account = searchParams.get('account')
  const returnURL = searchParams.get('return')
  /* console.log('account: ', account) */
  console.log('return url: ', returnURL)

  const navigate = useNavigate()

  const signinForm = useForm<SigninScheme>({
    resolver: zodResolver(signinScheme),
    defaultValues: {
      account: account || '',
      password: '',
    },
  })

  const onSigninSubmit = async (values: SigninScheme) => {
    try {
      /* console.log('values: ', values) */

      if (loading) return

      setLoading(true)

      const data = await postSignin(values.account, values.password)
      console.log('sign in resp data:', data)
      if (!data.code) {
        const { token, userID, username } = data.data
        updateAuthState(token, username, userID)
        /* console.log('is inner url: ', isInnerURL(returnURL)) */

        let targetURL = '/'
        if (returnURL && isInnerURL(returnURL)) {
          targetURL = returnURL.replace(location.origin, '')
          console.log('to return url: ', targetURL)
        }
        console.log('targetURL: ', targetURL)
        navigate(targetURL)
      }
    } catch (e) {
      console.error('signin error: ', e)
    } finally {
      setLoading(false)
    }
  }

  /* console.log('render signin page') */

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
                className="w-full text-center"
                disabled={loading}
              >
                {loading ? <BLoader /> : '登录'}
              </Button>
            </form>
          </Form>
          <div className="text-sm">
            还没有账号？
            <Link to="/signup" className="b-text-link">
              新建一个
            </Link>
          </div>
        </div>
      </BContainer>
    </>
  )
}
