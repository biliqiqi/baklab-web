import { zodResolver } from '@hookform/resolvers/zod'
import { memo, useState } from 'react'
import { Control, Controller, Path, useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { z } from '@/lib/zod-custom'

import { postSignin } from '@/api'
import { emailRule, passwordRule } from '@/constants/rules'
import useDocumentTitle from '@/hooks/use-page-title'
import { useAuthedUserStore, useDialogStore } from '@/state/global'
import { Role } from '@/types/permission'

import BLoader from './base/BLoader'
import { Button } from './ui/button'
import { Form, FormControl, FormItem } from './ui/form'
import { Input } from './ui/input'

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

export interface SigninFromProps {
  dialog?: boolean
  onSuccess?: () => void
}

const SigninForm: React.FC<SigninFromProps> = ({
  dialog = false,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false)
  const updateAuthState = useAuthedUserStore((state) => state.update)

  const [searchParams, _setSearchParams] = useSearchParams()
  const { updateSignin, updateSignup } = useDialogStore()
  const account = searchParams.get('account')

  /* const navigate = useNavigate() */

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
        const { token, userID, username, role } = data.data
        updateAuthState(token, username, userID, role as Role)
        /* console.log('is inner url: ', isInnerURL(returnURL)) */

        if (onSuccess && typeof onSuccess == 'function') {
          onSuccess()
        }

        /* let targetURL = '/'
         * if (returnURL && isInnerURL(returnURL)) {
         *   targetURL = returnURL.replace(location.origin, '')
         *   console.log('to return url: ', targetURL)
         * }
         * console.log('targetURL: ', targetURL)
         * navigate(targetURL) */
      }
    } catch (e) {
      console.error('signin error: ', e)
    } finally {
      setLoading(false)
    }
  }

  useDocumentTitle('登录')

  /* console.log('render signin page') */

  return (
    <>
      <div className="w-[400px] max-sm:w-full space-y-8 mx-auto py-4">
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
          <Link
            to="/signup"
            className="b-text-link"
            onClick={(e) => {
              if (dialog) {
                e.preventDefault()
                updateSignin(false)
                updateSignup(true)
                return
              }
            }}
          >
            新建一个
          </Link>
        </div>
      </div>
    </>
  )
}

export default SigninForm
