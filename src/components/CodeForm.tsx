import { zodResolver } from '@hookform/resolvers/zod'
import { MouseEvent, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

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

const REGEXP_CODE = /^\d{6}$/

const codeScheme = z.object({
  code: z.string().regex(REGEXP_CODE, '验证码格式错误'),
})

export type CodeScheme = z.infer<typeof codeScheme>

interface CodeFormProps {
  isPhone: boolean
  loading: boolean
  onBackClick?: () => void
  onSubmit?: SubmitHandler<CodeScheme>
  onResendClick?: () => void
}

const CodeForm: React.FC<CodeFormProps> = ({
  isPhone,
  loading,
  onSubmit = () => {},
  onBackClick = () => {},
  onResendClick = () => {},
}) => {
  const codeForm = useForm<CodeScheme>({
    resolver: zodResolver(codeScheme),
    defaultValues: {
      code: '686868',
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
          验证码已发送到你的{isPhone ? '手机' : '邮箱'}，5分钟内有效。
        </div>
        <FormField
          control={codeForm.control}
          name="code"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormControl>
                <Input
                  placeholder="请输入验证码"
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
          下一步
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full text-center"
          onClick={onBackClick}
        >
          返回
        </Button>
        <div className="my-4 py-2 text-sm">
          未收到验证码？
          <Button
            onClick={reSendCode}
            variant="link"
            className="m-0 p-0"
            disabled={disableResend}
          >
            {disableResend ? '已发送' : '点击重新发送'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default CodeForm
