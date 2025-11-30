import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Control, Controller, Path, useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { toSync } from '@/lib/fire-and-forget'
import { noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { completeSignup, postSignin, postSignup, postVerifyCode } from '@/api'
import { getSiteWithFrontId } from '@/api/site'
import { OAUTH_PROVIDERS } from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import useDocumentTitle from '@/hooks/use-page-title'
import {
  useAuthedUserStore,
  useContextStore,
  useDialogStore,
  useSiteStore,
} from '@/state/global'
import {
  AuthedDataResponse,
  OAUTH_PROVIDER,
  OAuthProvider,
} from '@/types/types'

import CodeForm, { CodeSchema } from './CodeForm'
import OAuthButton from './OAuthButton'
import OAuthUsernameSetup from './OAuthUsernameSetup'
import { Button } from './ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

const accountRule = z.string().min(1)
const signinSchema = z.object({
  account: accountRule,
  password: z.string(),
})
const phoneSchema = z.object({
  phone: z.string(),
})

const usernameSchema = z.object({
  username: z.string(),
})

const PHONE_REGEX = /^1\d{10}$/

enum SigninType {
  password = 'password',
  phone = 'phone',
}

const oauthProverConfigList = (OAUTH_PROVIDERS as OAuthProvider[]).filter(
  (provider) => Object.values(OAUTH_PROVIDER).includes(provider)
)

type SigninSchema = z.infer<typeof signinSchema>
type PhoneSchema = z.infer<typeof phoneSchema>
type UsernameSchema = z.infer<typeof usernameSchema>

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
  const [currTab, setCurrTab] = useState<SigninType>(SigninType.password)
  const [codeSent, setCodeSent] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [verifyResult, setVerifyResult] = useState<AuthedDataResponse | null>(
    null
  )
  const [phoneTempToken, setPhoneTempToken] = useState('')
  const contact = useRef('')
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
  const countryCode = useContextStore((state) => state.countryCode)
  const isChina = countryCode === 'CN'
  const isMobile = useIsMobile()
  const isChinaMobile = isChina && isMobile

  const usernameRule = useMemo(
    () =>
      z
        .string()
        .min(4, t('charMinimum', { field: t('username'), num: 4 }))
        .max(20, t('charMaximum', { field: t('username'), num: 20 }))
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
              message: t('usernameFormatMsg'),
            }
          )
        ),
    [t]
  )

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

  const phoneForm = useForm<PhoneSchema>({
    resolver: zodResolver(
      phoneSchema.extend({
        phone: z.string().regex(PHONE_REGEX, t('phoneRegionNotSupported')),
      })
    ),
    defaultValues: {
      phone: '',
    },
  })

  const phoneCompleteForm = useForm<UsernameSchema>({
    resolver: zodResolver(
      usernameSchema.extend({
        username: usernameRule,
      })
    ),
    defaultValues: {
      username: '',
    },
  })

  useEffect(() => {
    if (verifyResult?.suggestedName) {
      phoneCompleteForm.setValue('username', verifyResult.suggestedName)
    }
  }, [phoneCompleteForm, verifyResult])

  const handleTabChange = (value: SigninType) => {
    setCurrTab(value)
    setCodeSent(false)
    setCodeVerified(false)
    setVerifyResult(null)
    setPhoneTempToken('')
    contact.current = ''
  }

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

  const sendPhoneSigninCode = async (phone: string) => {
    if (loading) return

    setLoading(true)
    try {
      const data = await postSignup({ phone })
      if (!data.code) {
        contact.current = phone
        setCodeSent(true)
        setCodeVerified(false)
        setVerifyResult(null)
        setPhoneTempToken('')
      }
    } catch (e) {
      console.error('post phone signin code error: ', e)
    } finally {
      setLoading(false)
    }
  }

  const onPhoneSubmit = (values: PhoneSchema) => {
    void sendPhoneSigninCode(values.phone)
  }

  const onPhoneCodeSubmit = async (values: CodeSchema) => {
    if (loading) return

    setLoading(true)
    try {
      const data = await postVerifyCode({
        phone: contact.current,
        code: values.code,
      })

      if (!data.code) {
        const result = data.data
        if (result.needsUsername) {
          setVerifyResult(result)
          setCodeVerified(true)
          setPhoneTempToken(result.token)
        } else {
          const { token, userID, username, user } = result
          updateAuthState(token, username, userID, user)
          setCodeSent(false)
          setCodeVerified(false)
          setVerifyResult(null)
          setPhoneTempToken('')
          fetchSiteData()
          toSync(siteStore.fetchSiteList)()
          if (onSuccess && typeof onSuccess == 'function') {
            onSuccess()
          }
        }
      }
    } catch (e) {
      console.error('phone signin verify error: ', e)
    } finally {
      setLoading(false)
    }
  }

  const onPhoneCompleteSubmit = async (values: UsernameSchema) => {
    if (loading) return

    if (!phoneTempToken) {
      setCodeVerified(false)
      return
    }

    setLoading(true)
    try {
      const data = await completeSignup({
        phone: contact.current,
        username: values.username,
        tempToken: phoneTempToken,
      })

      if (!data.code) {
        const { token, userID, username, user } = data.data
        updateAuthState(token, username, userID, user)
        setVerifyResult(null)
        setCodeVerified(false)
        setCodeSent(false)
        setPhoneTempToken('')
        fetchSiteData()
        toSync(siteStore.fetchSiteList)()
        if (onSuccess && typeof onSuccess == 'function') {
          onSuccess()
        }
      }
    } catch (e) {
      console.error('complete phone signin error: ', e)
    } finally {
      setLoading(false)
    }
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
        <Tabs
          value={isChinaMobile ? SigninType.phone : currTab}
          onValueChange={(value) => handleTabChange(value as SigninType)}
        >
          {!isMobile ? (
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value={SigninType.password}>
                {t('passwordSignin')}
              </TabsTrigger>
              <TabsTrigger value={SigninType.phone}>
                {t('phoneSignin')}
              </TabsTrigger>
            </TabsList>
          ) : (
            <div className="mb-8" />
          )}

          {!isChinaMobile && (
            <TabsContent value={SigninType.password}>
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
            </TabsContent>
          )}

          {(isChina || !isMobile) && (
            <TabsContent value={SigninType.phone}>
              {codeVerified ? (
                <Form {...phoneCompleteForm}>
                  <form
                    onSubmit={phoneCompleteForm.handleSubmit(
                      onPhoneCompleteSubmit
                    )}
                  >
                    <div className="mb-8 text-gray-800">
                      {t('verifySuccessTip')}
                    </div>
                    <FormField
                      control={phoneCompleteForm.control}
                      name="username"
                      render={({ field, fieldState }) => (
                        <FormItem className="mb-8">
                          <FormControl>
                            <Input
                              placeholder={t('inputTip', {
                                field: t('username'),
                              })}
                              autoComplete="off"
                              state={fieldState.invalid ? 'invalid' : 'default'}
                              {...field}
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
                      {loading && <Spinner />} {t('submit')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full text-center"
                      onClick={() => handleTabChange(SigninType.phone)}
                    >
                      {t('goBack')}
                    </Button>
                  </form>
                </Form>
              ) : codeSent ? (
                <CodeForm
                  isPhone
                  loading={loading}
                  onBackClick={() => {
                    setCodeSent(false)
                    setCodeVerified(false)
                    setVerifyResult(null)
                    setPhoneTempToken('')
                  }}
                  onSubmit={onPhoneCodeSubmit}
                  onResendClick={() => {
                    if (contact.current) {
                      void sendPhoneSigninCode(contact.current)
                    }
                  }}
                />
              ) : (
                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}>
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field, fieldState }) => (
                        <FormItem className="mb-8">
                          <FormControl>
                            <Input
                              placeholder={t('inputTip', {
                                field: t('phoneNumber'),
                              })}
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
                      {loading && <Spinner />} {t('nextStep')}
                    </Button>
                  </form>
                </Form>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* OAuth login section */}
        {!isChinaMobile && oauthProverConfigList.length > 0 && (
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

        {!isChinaMobile && (
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
        )}
      </div>
    </>
  )
}

export default SigninForm
