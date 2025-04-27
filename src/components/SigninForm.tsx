import { zodResolver } from '@hookform/resolvers/zod'
import { ChangeEvent, memo, useCallback, useState } from 'react'
import { Control, Controller, Path, useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { toSync } from '@/lib/fire-and-forget'
import { noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { postSignin } from '@/api'
import { getSiteWithFrontId } from '@/api/site'
import { emailRule, passwordRule } from '@/constants/rules'
import useDocumentTitle from '@/hooks/use-page-title'
import {
  useAuthedUserStore,
  useDialogStore,
  useSiteStore,
} from '@/state/global'

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

export interface SigninFromProps {
  dialog?: boolean
  email?: string
  setEmail?: (x: string) => void
  onSuccess?: () => void
}

const SigninForm: React.FC<SigninFromProps> = ({
  dialog = false,
  email,
  setEmail = noop,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false)
  const updateAuthState = useAuthedUserStore((state) => state.update)

  const { siteFrontId } = useParams()
  const [searchParams, _setSearchParams] = useSearchParams()
  const { updateSignin, updateSignup } = useDialogStore()
  const account = searchParams.get('account') || email

  const siteStore = useSiteStore()
  const { t } = useTranslation()

  const signinForm = useForm<SigninScheme>({
    resolver: zodResolver(signinScheme),
    defaultValues: {
      account: account || '',
      password: '',
    },
  })

  signinForm.register('account', {
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      try {
        const email = emailRule.parse(e.target.value)
        setEmail(email)
      } catch (_err) {
        setEmail('')
      }
    },
  })

  const fetchSiteData = toSync(
    useCallback(async () => {
      if (!siteFrontId) return

      try {
        const { code, data } = await getSiteWithFrontId(siteFrontId)
        if (!code) {
          console.log('site data after login: ', data)
          siteStore.update({ ...data })
        } else {
          siteStore.update(null)
        }
      } catch (err) {
        console.error('fetch site data error: ', err)
      }
    }, [siteFrontId, siteStore])
  )

  const onSigninSubmit = async (values: SigninScheme) => {
    try {
      if (loading) return

      setLoading(true)

      const data = await postSignin(values.account, values.password)

      if (!data.code) {
        const { token, userID, username, user } = data.data
        updateAuthState(token, username, userID, user)
        fetchSiteData()
        toSync(siteStore.fetchSiteList)()

        if (onSuccess && typeof onSuccess == 'function') {
          onSuccess()
        }
      }
    } catch (e) {
      console.error('signin error: ', e)
    } finally {
      setLoading(false)
    }
  }

  useDocumentTitle(t('signin'))

  return (
    <>
      <div className="w-[400px] max-sm:w-full space-y-8 mx-auto py-4">
        <Form {...signinForm}>
          <form onSubmit={signinForm.handleSubmit(onSigninSubmit)}>
            <FormInput
              control={signinForm.control}
              name="account"
              placeholder={t('inputTip', { field: t('email') })}
            />
            <FormInput
              control={signinForm.control}
              name="password"
              type="password"
              placeholder={t('inputTip', { field: t('password') })}
            />
            <Button
              type="submit"
              className="w-full text-center"
              disabled={loading}
            >
              {loading ? <BLoader /> : t('signin')}
            </Button>
          </form>
        </Form>
        <div className="text-sm">
          <Trans
            i18nKey={'directlySignupTip'}
            components={{
              signupLink: (
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
                />
              ),
            }}
          />
        </div>
      </div>
    </>
  )
}

export default SigninForm
