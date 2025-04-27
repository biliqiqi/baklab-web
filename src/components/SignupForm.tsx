import { zodResolver } from '@hookform/resolvers/zod'
import { ChangeEvent, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { completeEmailSign, postEmailSinup, postEmailVerify } from '@/api'
import { SERVER_ERR_ACCOUNT_EXIST } from '@/constants/constants'
import {
  emailRule,
  passwordRule,
  phoneRule,
  usernameRule,
} from '@/constants/rules'
import useDocumentTitle from '@/hooks/use-page-title'
import { useAuthedUserStore, useDialogStore } from '@/state/global'

import CodeForm, { CodeScheme } from './CodeForm'
import BLoader from './base/BLoader'
import { Button } from './ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form'
import { Input } from './ui/input'
import { Tabs, TabsContent } from './ui/tabs'

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
  const [currTab, setCurrTab] = useState<SignupType>(SignupType.email)
  const [loading, setLoading] = useState(false)
  const { updateSignin, updateSignup } = useDialogStore()

  const autheState = useAuthedUserStore()
  const navigate = useNavigate()

  const { t } = useTranslation()

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
      email: propEmail,
    },
  })

  emailForm.register('email', {
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value)
    },
  })

  const phoneForm = useForm<PhoneScheme>({
    resolver: zodResolver(phoneScheme),
    defaultValues: {
      phone: '',
    },
  })

  const form = useForm<SignupScheme>({
    resolver: zodResolver(signupScheme),
    defaultValues: {
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

    /* eslint-disable-next-line */
    signWithEmail(values.email)
  }

  const onPhoneSubmit = (_values: PhoneScheme) => {
    /* console.log('values: ', values) */
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
        autheState.update(data.data.token, '', '', null)
      } else {
        if (data.code == SERVER_ERR_ACCOUNT_EXIST) {
          toast.info(t('emailExistsTip'))
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
      /* console.log('values: ', values) */

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
        const { token, username, userID, user } = data.data
        autheState.update(token, username, userID, user)

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
              <Button
                type="submit"
                className="w-full text-center mb-4"
                disabled={loading}
              >
                {loading ? <BLoader /> : t('submit')}
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
            onResendClick={() => signWithEmail(email.current)}
          />
        ) : (
          <Tabs defaultValue={currTab}>
            {/* <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger
                  value={SignupType.email}
                  onClick={() => setCurrTab(SignupType.email)}
                >
                  {t('emailSignup')}
                </TabsTrigger>
                <TabsTrigger
                  value={SignupType.phone}
                  onClick={() => setCurrTab(SignupType.phone)}
                >
                  {t('phoneSignup')}
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
                            placeholder={t('inputTip', { field: t('email') })}
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
                    {loading ? <BLoader /> : t('nextStep')}
                  </Button>
                </form>
              </Form>
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
                  <Button type="submit" className="w-full text-center">
                    {t('nextStep')}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  )
}

export default SignupForm
