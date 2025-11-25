import { zodResolver } from '@hookform/resolvers/zod'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import {
  SignupPayload,
  completeSignup,
  postSignup,
  postVerifyCode,
} from '@/api'
import {
  SERVER_ERR_ACCOUNT_EXIST,
  SIGNUP_TEMP_TOKEN_KEY,
} from '@/constants/constants'
import { useIsMobile } from '@/hooks/use-mobile'
import useDocumentTitle from '@/hooks/use-page-title'
import {
  useAuthedUserStore,
  useDialogStore,
  useGeoInfoStore,
} from '@/state/global'
import { AuthedDataResponse } from '@/types/types'

import CodeForm, { CodeSchema } from './CodeForm'
import { Button } from './ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

const emailSchema = z.object({
  email: z.string().email(),
})

const PHONE_REGEX = /^1\d{10}$/

const phoneSchema = z.object({
  phone: z.string(),
})

type EmailSchema = z.infer<typeof emailSchema>
type PhoneSchema = z.infer<typeof phoneSchema>

type SignupSchema = {
  username: string
  password?: string
}

enum SignupType {
  email = 'email',
  phone = 'phone',
}

interface SignupFormProps {
  dialog?: boolean
  email?: string
  setEmail?: (x: string) => void
  onSuccess?: () => void
}

const SignupForm: React.FC<SignupFormProps> = ({
  dialog = false,
  email: propEmail,
  setEmail = noop,
  onSuccess,
}) => {
  const [isPhone, setIsPhone] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [verifyResult, setVerifyResult] = useState<AuthedDataResponse | null>(
    null
  )
  const [tempToken, setTempToken] = useState('')
  const [currTab, setCurrTab] = useState<SignupType>(SignupType.email)
  const [loading, setLoading] = useState(false)
  const { updateSignin, updateSignup } = useDialogStore()

  const autheState = useAuthedUserStore()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { t } = useTranslation()
  const countryCode = useGeoInfoStore((state) => state.countryCode)
  const isChina = countryCode === 'CN'
  const isMobile = useIsMobile()
  const isChinaMobile = isChina && isMobile

  const contact = useRef('')

  useEffect(() => {
    const tokenInStorage = localStorage.getItem(SIGNUP_TEMP_TOKEN_KEY)
    const signupStep = searchParams.get('signup_step')

    if (tokenInStorage && signupStep === 'complete') {
      setTempToken(tokenInStorage)
      setCodeVerified(true)
    }
  }, [searchParams])

  const handleTabChange = (value: SignupType) => {
    setCurrTab(value)
    setIsPhone(value === SignupType.phone)
    setCodeSent(false)
    setCodeVerified(false)
    setVerifyResult(null)
    setTempToken('')
    contact.current = ''
    localStorage.removeItem(SIGNUP_TEMP_TOKEN_KEY)

    searchParams.delete('signup_step')
    setSearchParams(searchParams)
  }

  const reset = () => {
    handleTabChange(SignupType.email)
    setLoading(false)
  }

  const emailForm = useForm<EmailSchema>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: propEmail,
    },
  })

  emailForm.register('email', {
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value)
    },
  })

  const phoneForm = useForm<PhoneSchema>({
    resolver: zodResolver(
      phoneSchema.extend({
        phone: z
          .string()
          .regex(PHONE_REGEX, t('formatError', { field: t('phoneNumber') })),
      })
    ),
    defaultValues: {
      phone: '',
    },
  })

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

  const passwordRule = useMemo(
    () =>
      z
        .string()
        .min(12, t('charMinimum', { field: t('password'), num: 12 }))
        .max(64, t('charMaximum', { field: t('password'), num: 64 }))
        .regex(/[a-z]/, t('passRule1'))
        .regex(/[A-Z]/, t('passRule2'))
        .regex(/\d/, t('passRule3'))
        .regex(/[!@#$%^&*]/, t('passRule4')),
    [t]
  )

  const signupResolver = useMemo(
    () =>
      zodResolver(
        isPhone
          ? z.object({
              username: usernameRule,
            })
          : z.object({
              username: usernameRule,
              password: passwordRule,
            })
      ),
    [isPhone, passwordRule, usernameRule]
  )

  const form = useForm<SignupSchema>({
    resolver: signupResolver,
    defaultValues: {
      username: '',
      password: '',
    },
  })

  useEffect(() => {
    if (verifyResult?.suggestedName) {
      form.setValue('username', verifyResult.suggestedName)
    }
  }, [form, verifyResult])

  const sendSignupCode = async (
    payload: SignupPayload,
    channel: SignupType
  ) => {
    if (loading) return

    setLoading(true)
    try {
      const data = await postSignup(payload)
      if (!data.code) {
        setVerifyResult(null)
        setCodeVerified(false)
        setTempToken('')
        localStorage.removeItem(SIGNUP_TEMP_TOKEN_KEY)
        contact.current =
          channel === SignupType.phone
            ? payload.phone || ''
            : payload.email || ''
        setIsPhone(channel === SignupType.phone)
        setCodeSent(true)
      }
    } catch (e) {
      console.error('post signup error: ', e)
    } finally {
      setLoading(false)
    }
  }

  const onEmailSubmit = (values: EmailSchema) => {
    /* console.log('values: ', values) */
    handleTabChange(SignupType.email)
    void sendSignupCode({ email: values.email }, SignupType.email)
  }

  const onPhoneSubmit = (values: PhoneSchema) => {
    handleTabChange(SignupType.phone)
    void sendSignupCode({ phone: values.phone }, SignupType.phone)
  }

  const onCodeSubmit = async (values: CodeSchema) => {
    if (loading) return

    setLoading(true)
    try {
      const data = await postVerifyCode(
        isPhone
          ? { phone: contact.current, code: values.code }
          : { email: contact.current, code: values.code }
      )

      if (!data.code) {
        const verifyData = data.data
        if (verifyData.needsUsername) {
          setVerifyResult(verifyData)
          setCodeVerified(true)
          setTempToken(verifyData.token)
          localStorage.setItem(SIGNUP_TEMP_TOKEN_KEY, verifyData.token)

          searchParams.set('signup_step', 'complete')
          setSearchParams(searchParams)
        } else {
          const { token, username, userID, user } = verifyData
          autheState.update(token, username, userID, user)
          localStorage.removeItem(SIGNUP_TEMP_TOKEN_KEY)
          setCodeSent(false)
          setCodeVerified(false)
          setVerifyResult(null)
          setTempToken('')
          if (onSuccess && typeof onSuccess == 'function') {
            onSuccess()
          }
        }
      } else {
        if (data.code == SERVER_ERR_ACCOUNT_EXIST) {
          toast.info(t('emailExistsTip'))
          if (dialog) {
            updateSignup(false)
            updateSignin(true)
            setEmail(contact.current)
          } else {
            navigate(`/signin?account=${contact.current}`)
          }
        }
      }
    } catch (e) {
      console.error('post email signup error: ', e)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (values: SignupSchema) => {
    try {
      /* console.log('values: ', values) */

      if (loading) return

      const tokenFromStorage =
        tempToken || localStorage.getItem(SIGNUP_TEMP_TOKEN_KEY) || ''

      if (!tokenFromStorage) {
        toast.error(t('verificationExpired'))
        setCodeVerified(false)
        return
      }

      setLoading(true)

      const data = await completeSignup({
        email: isPhone ? undefined : contact.current,
        phone: isPhone ? contact.current : undefined,
        username: values.username,
        password: isPhone ? undefined : values.password,
        tempToken: tokenFromStorage,
      })
      /* console.log('signup complete data:', data) */

      if (!data.code) {
        setCodeVerified(true)
        const { token, username, userID, user } = data.data
        autheState.update(token, username, userID, user)
        localStorage.removeItem(SIGNUP_TEMP_TOKEN_KEY)
        setVerifyResult(null)
        setTempToken('')

        searchParams.delete('signup_step')
        setSearchParams(searchParams)

        if (onSuccess && typeof onSuccess == 'function') {
          onSuccess()
        }
      }
    } catch (e) {
      console.error('complete email signup error: ', e)
    } finally {
      setLoading(false)
    }
  }

  useDocumentTitle(t('signupTitle'))

  return (
    <>
      <div className="w-[400px] max-sm:w-full space-y-8 mx-auto py-4">
        {codeVerified ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="mb-8 text-gray-800">{t('verifySuccessTip')}</div>
              <FormField
                control={form.control}
                name="username"
                render={({ field, fieldState }) => (
                  <FormItem className="mb-8">
                    <FormControl>
                      <Input
                        placeholder={t('inputTip', { field: t('username') })}
                        autoComplete="off"
                        state={fieldState.invalid ? 'invalid' : 'default'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isPhone && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <FormItem className="mb-8">
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t('inputTip', { field: t('password') })}
                          autoComplete="off"
                          {...field}
                          state={fieldState.invalid ? 'invalid' : 'default'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
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
                onClick={reset}
              >
                {t('reSignup')}
              </Button>
            </form>
          </Form>
        ) : codeSent ? (
          <CodeForm
            isPhone={isPhone}
            loading={loading}
            onBackClick={() => setCodeSent(false)}
            onSubmit={onCodeSubmit}
            onResendClick={() =>
              sendSignupCode(
                isPhone
                  ? { phone: contact.current }
                  : { email: contact.current },
                isPhone ? SignupType.phone : SignupType.email
              )
            }
          />
        ) : (
          <>
            <Tabs
              value={isChinaMobile ? SignupType.phone : currTab}
              onValueChange={(value) => handleTabChange(value as SignupType)}
            >
              {isChina && !isChinaMobile ? (
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value={SignupType.email}>
                    {t('emailSignup')}
                  </TabsTrigger>
                  <TabsTrigger value={SignupType.phone}>
                    {t('phoneSignup')}
                  </TabsTrigger>
                </TabsList>
              ) : (
                <div className="mb-8" />
              )}

              {!isChinaMobile && (
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
                                placeholder={t('inputTip', {
                                  field: t('email'),
                                })}
                                autoComplete="off"
                                {...field}
                                state={
                                  fieldState.invalid ? 'invalid' : 'default'
                                }
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
                </TabsContent>
              )}
              {isChina && (
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
                                placeholder={t('inputTip', {
                                  field: t('phoneNumber'),
                                })}
                                autoComplete="off"
                                {...field}
                                state={
                                  fieldState.invalid ? 'invalid' : 'default'
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full text-center">
                        {t('nextStep')}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              )}
            </Tabs>
            {!isChinaMobile && (
              <div className="text-sm mt-8">
                <Trans
                  i18nKey={'directlySigninTip'}
                  components={{
                    loginLink: (
                      <Link
                        to="/signin"
                        className="b-text-link"
                        onClick={(e) => {
                          if (dialog) {
                            e.preventDefault()
                            updateSignup(false)
                            updateSignin(true)
                            return
                          }
                        }}
                      />
                    ),
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default SignupForm
