import { zodResolver } from '@hookform/resolvers/zod'
import { MouseEvent, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { getModeReasons, noop } from '@/lib/utils'
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

const reasonSchema = z.object({
  reason: z.string(),
  extra: z.string(),
})

export type ReasonSchema = z.infer<typeof reasonSchema>

interface ModerationFormProps {
  reasonLable: string
  destructive: boolean
  onSubmit: (data: ReasonSchema) => void
  onCancel: () => void
}

const ModerationForm: React.FC<ModerationFormProps> = ({
  reasonLable,
  destructive,
  onSubmit = noop,
  onCancel = noop,
}) => {
  const [otherReason, setOtherReason] = useState('')
  const { t } = useTranslation()

  const form = useForm<ReasonSchema>({
    resolver: zodResolver(
      reasonSchema.extend({
        reason: z.string().min(1, t('selectTip', { field: t('deleteReason') })),
        extra: z.string().max(500, t('charMaximum', { num: 500 })),
      })
    ),
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
    (data: ReasonSchema) => {
      if (data.reason == 'other') {
        if (!otherReason.trim()) {
          form.setError('reason', {
            message: t('inputTip', { field: t('otherReason') }),
          })
          return
        } else {
          data.reason = otherReason
        }
      }
      onSubmit(data)
    },
    [otherReason, form, onSubmit, t]
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
                  {getModeReasons().map((item) => (
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
                      {t('others')}：
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
              <FormLabel>{t('additions')}</FormLabel>
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
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={destructive ? 'destructive' : 'default'}
              className="ml-2"
            >
              {t('confirm')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default ModerationForm
