import { zodResolver } from '@hookform/resolvers/zod'
import { MouseEvent, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { z } from '@/lib/zod-custom'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

import { DEBUG } from '@/constants/constants'

const REGEXP_CODE = /^\d{6}$/

const codeSchema = z.object({
  code: z.string(),
})

export type CodeSchema = z.infer<typeof codeSchema>

interface CodeFormProps {
  isPhone: boolean
  loading: boolean
  onBackClick?: () => void
  onSubmit?: SubmitHandler<CodeSchema>
  onResendClick?: () => void
}

const DEBUG_CODE = '686868'

const CodeForm: React.FC<CodeFormProps> = ({
  isPhone,
  loading,
  onSubmit = () => {},
  onBackClick = () => {},
  onResendClick = () => {},
}) => {
  const { t } = useTranslation()
  const codeForm = useForm<CodeSchema>({
    resolver: zodResolver(
      codeSchema.extend({
        code: z
          .string()
          .regex(REGEXP_CODE, t('formatError', { field: t('verifyCode') })),
      })
    ),
    defaultValues: {
      code: DEBUG ? DEBUG_CODE : '',
    },
  })

  const [disableResend, setDisableResend] = useState(false)

  const reSendCode = (e: MouseEvent) => {
    if (disableResend) return
    e.preventDefault()
    onResendClick()
    setDisableResend(true)
  }

  return (
    <Form {...codeForm}>
      <form onSubmit={codeForm.handleSubmit(onSubmit)}>
        <div className="mb-8 text-gray-800">
          {t('verifyCodeSent', { name: isPhone ? t('phone') : t('email') })}
        </div>
        <FormField
          control={codeForm.control}
          name="code"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormControl>
                <Input
                  placeholder={t('inputTip', { field: t('verifyCode') })}
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
          {t('nextStep')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full text-center"
          onClick={onBackClick}
        >
          {t('goBack')}
        </Button>
        <div className="my-4 py-2 text-sm">
          {t('noVerifyCodeRecieved')}
          <Button
            onClick={reSendCode}
            variant="link"
            className="m-0 p-0"
            disabled={disableResend}
          >
            {disableResend ? t('sent') : t('reSent')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default CodeForm
