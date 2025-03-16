import { zodResolver } from '@hookform/resolvers/zod'
import { MouseEvent, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'

import { noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { Button } from './ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Input } from './ui/input'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Textarea } from './ui/textarea'

const reasonScheme = z.object({
  reason: z.string().min(1, '请选择删除原因'),
  extra: z.string().max(500, '不要超过500各字符'),
})

export type ReasonScheme = z.infer<typeof reasonScheme>

interface ModerationFormProps {
  reasonLable: string
  destructive: boolean
  onSubmit: (data: ReasonScheme) => void
  onCancel: () => void
}

const REASONS = [
  '广告营销',
  '不友善',
  '虚假信息或谣言',
  '色情暴力',
  '激进意识形态',
  '歧视性言论',
  '隐私侵犯',
  '刻意煽动对立',
  '盗版侵权',
  '自残或危险行为引导',
  '未注明是AI生成',
]

const ModerationForm: React.FC<ModerationFormProps> = ({
  reasonLable,
  destructive,
  onSubmit = noop,
  onCancel = noop,
}) => {
  const [otherReason, setOtherReason] = useState('')

  const form = useForm<ReasonScheme>({
    resolver: zodResolver(reasonScheme),
    defaultValues: {
      reason: '',
      extra: '',
    },
  })

  const onCancelClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      form.reset({
        reason: '',
        extra: '',
      })
      onCancel()
    },
    [form, onCancel]
  )

  const onInnerSubmit = useCallback(
    (data: ReasonScheme) => {
      if (data.reason == 'other') {
        if (!otherReason.trim()) {
          form.setError('reason', { message: '请填写其他原因' })
          return
        } else {
          data.reason = otherReason
        }
      }
      onSubmit(data)
    },
    [otherReason, form, onSubmit]
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onInnerSubmit)} className="py-4">
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{reasonLable}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  className="flex flex-wrap"
                  value={field.value}
                >
                  {REASONS.map((item) => (
                    <FormItem
                      key={item}
                      className="flex items-center space-y-0 mr-4 mb-2"
                    >
                      <FormControl>
                        <RadioGroupItem value={item} className="mr-1" />
                      </FormControl>
                      <FormLabel className="font-normal">{item}</FormLabel>
                    </FormItem>
                  ))}
                  <FormItem
                    key={'others'}
                    className="flex items-center space-y-0 mr-4 mb-2"
                  >
                    <FormControl>
                      <RadioGroupItem value={'other'} className="mr-1" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      其他：
                      <Input
                        className="inline-block w-[120px]"
                        onFocus={() =>
                          form.setValue('reason', 'other', {
                            shouldDirty: true,
                          })
                        }
                        onChange={(e) => setOtherReason(e.target.value)}
                      />
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="extra"
          render={({ field }) => (
            <FormItem>
              <FormLabel>补充说明</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        ></FormField>
        <div className="flex justify-between items-center mt-4">
          <div></div>
          <div>
            <Button size="sm" variant={'secondary'} onClick={onCancelClick}>
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={destructive ? 'destructive' : 'default'}
              className="ml-2"
            >
              确认
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default ModerationForm
