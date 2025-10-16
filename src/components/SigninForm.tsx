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
import { OAUTH_PROVIDERS } from '@/constants/constants'
import useDocumentTitle from '@/hooks/use-page-title'
import {
  useAuthedUserStore,
  useDialogStore,
  useSiteStore,
} from '@/state/global'
import { OAUTH_PROVIDER, OAuthProvider } from '@/types/types'

import OAuthButton from './OAuthButton'
import OAuthUsernameSetup from './OAuthUsernameSetup'
import { Button } from './ui/button'
import { Form, FormControl, FormItem } from './ui/form'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'

const accountRule = z.string().min(1)
const signinSchema = z.object({
  account: accountRule,
  password: z.string(),
})

const oauthProverConfigList = (OAUTH_PROVIDERS as OAuthProvider[]).filter(
  (provider) => Object.values(OAUTH_PROVIDER).includes(provider)
)

type SigninSchema = z.infer<typeof signinSchema>

interface FormInputProps<T extends SigninSchema> {
  control: Control<T>
  name: Path<T>
  type?: 'text' | 'password' | 'email' | 'number'
  placeholder?: string
}

const FormInput = memo(
  <T extends SigninSchema>({
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
  const [showUsernameSetup, setShowUsernameSetup] = useState(false)
  const [oauthData, setOauthData] = useState<{
    email: string
    provider: OAuthProvider
    suggestedName: string
  } | null>(null)
  const updateAuthState = useAuthedUserStore((state) => state.update)

  const { siteFrontId } = useParams()
  const [searchParams, _setSearchParams] = useSearchParams()
  const { updateSignin, updateSignup } = useDialogStore()
  const account = searchParams.get('account') || email

  const siteStore = useSiteStore()
  const { t } = useTranslation()

  const signinForm = useForm<SigninSchema>({
    resolver: zodResolver(
      signinSchema.extend({
        password: z
          .string()
          .min(12, t('charMinimum', { field: t('password'), num: 12 }))
          .max(18, t('charMaximum', { field: t('password'), num: 18 }))
          .regex(/[a-z]/, t('passRule1'))
          .regex(/[A-Z]/, t('passRule2'))
          .regex(/\d/, t('passRule3'))
          /* eslint-disable-next-line */
          .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, t('passRule4')),
      })
    ),
    defaultValues: {
      account: account || '',
      password: '',
    },
  })

  signinForm.register('account', {
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value)
    },
  })

  const fetchSiteData = toSync(
    useCallback(async () => {
      if (!siteFrontId) return

      try {
        const { code, data } = await getSiteWithFrontId(siteFrontId)
        if (!code) {
          /* console.log('site data after login: ', data) */
          siteStore.update({ ...data })
        } else {
          siteStore.update(null)
        }
      } catch (err) {
        console.error('fetch site data error: ', err)
      }
    }, [siteFrontId, siteStore])
  )

  const handleOAuthUsernameRequired = (
    email: string,
    provider: OAuthProvider,
    suggestedName: string
  ) => {
    setOauthData({ email, provider, suggestedName })
    setShowUsernameSetup(true)
    setLoading(false)
  }

  const handleUsernameSetupSuccess = () => {
    setShowUsernameSetup(false)
    setOauthData(null)
    fetchSiteData()
    toSync(siteStore.fetchSiteList)()
    onSuccess?.()
  }

  const handleUsernameSetupError = (error: string) => {
    console.error('OAuth username setup error:', error)
  }

  const handleBackToSignin = () => {
    setShowUsernameSetup(false)
    setOauthData(null)
  }

  const onSigninSubmit = async (values: SigninSchema) => {
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

  // Show username setup if needed
  if (showUsernameSetup && oauthData) {
    return (
      <div className="w-[400px] max-sm:w-full space-y-6 mx-auto py-4">
        <OAuthUsernameSetup
          email={oauthData.email}
          provider={oauthData.provider}
          suggestedName={oauthData.suggestedName}
          onSuccess={handleUsernameSetupSuccess}
          onError={handleUsernameSetupError}
        />
        <button
          type="button"
          onClick={handleBackToSignin}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {t('goBack')}
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="w-[400px] max-sm:w-full space-y-8 mx-auto py-4">
        <Form {...signinForm}>
          <form onSubmit={signinForm.handleSubmit(onSigninSubmit)}>
            <FormInput
              control={signinForm.control}
              name="account"
              placeholder={t('inputTip', { field: t('usernameOrEmail') })}
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
              {loading && <Spinner />} {t('signin')}
            </Button>
          </form>
        </Form>

        {/* OAuth login section */}
        {oauthProverConfigList.length > 0 && (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-dialog px-2">{t('or')}</span>
              </div>
            </div>

            <div className="space-y-4 pt-3">
              {oauthProverConfigList.map((provider) => (
                <OAuthButton
                  key={provider}
                  provider={provider}
                  onSuccess={onSuccess}
                  onError={(error) =>
                    console.error(`${provider} oauth error:`, error)
                  }
                  onUsernameRequired={handleOAuthUsernameRequired}
                  disabled={loading}
                />
              ))}
            </div>
          </div>
        )}

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
