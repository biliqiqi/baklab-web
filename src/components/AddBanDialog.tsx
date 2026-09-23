import { zodResolver } from '@hookform/resolvers/zod'
import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getModeReasons, noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

import { banIP, banUserByBody } from '@/api/user'
import i18n from '@/i18n'

import { Button } from './ui/button'

const banDays = [1, 2, 3, 4, 5, 6, 7, -1]

const addBanSchema = z.object({
  targetType: z.enum(['user', 'ip']),
  target: z.string().min(1, i18n.t('required')),
  duration: z.string().min(1, i18n.t('required')),
  reason: z.string().min(1, i18n.t('required')),
})

type AddBanFormSchema = z.infer<typeof addBanSchema>

interface BanCustomInputs {
  days: number
  hours: number
  minutes: number
}

const defaultBanCustomInputs: BanCustomInputs = {
  days: 0,
  hours: 0,
  minutes: 0,
}

export interface AddBanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTargetType?: 'user' | 'ip'
  lockTargetType?: boolean
  defaultTargetValue?: string
  onSuccess?: () => void
}

export default function AddBanDialog({
  open,
  onOpenChange = noop,
  defaultTargetType = 'user',
  lockTargetType = false,
  defaultTargetValue = '',
  onSuccess = noop,
}: AddBanDialogProps) {
  const { t } = useTranslation()
  const [banCustom, setBanCustom] = useState<BanCustomInputs>({
    ...defaultBanCustomInputs,
  })
  const [otherReason, setOtherReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<AddBanFormSchema>({
    resolver: zodResolver(addBanSchema),
    defaultValues: {
      targetType: defaultTargetType,
      target: defaultTargetValue,
      duration: '1',
      reason: '',
    },
  })

  const targetType = form.watch('targetType')

  useEffect(() => {
    if (open) {
      form.reset({
        targetType: defaultTargetType,
        target: defaultTargetValue,
        duration: '1',
        reason: '',
      })
      setBanCustom({ ...defaultBanCustomInputs })
      setOtherReason('')
    }
  }, [open, defaultTargetType, defaultTargetValue, form])

  const onBanInputFocus = useCallback(
    () => form.setValue('duration', 'custom', { shouldDirty: true }),
    [form]
  )

  const onBanInputChange = useCallback(
    (inputType: keyof BanCustomInputs) => {
      return (e: ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10)
        if (isNaN(val) || val < 0) {
          form.setError('duration', {
            message: t('wrongData'),
          })
          return
        }

        setBanCustom((state) => ({ ...state, [inputType]: val }))
        form.clearErrors('duration')
        form.setValue('duration', 'custom', { shouldDirty: true })
      }
    },
    [form, t]
  )

  const handleSubmit = useCallback(
    async (values: AddBanFormSchema) => {
      const { targetType, target, duration, reason } = values
      const trimmedTarget = target.trim()
      if (!trimmedTarget) {
        form.setError('target', { message: t('required') })
        return
      }

      if (targetType === 'ip') {
        const ipRegex =
          /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$/
        if (!ipRegex.test(trimmedTarget)) {
          form.setError('target', { message: t('invalidIPFormat') })
          return
        }
        if (trimmedTarget === '127.0.0.1' || trimmedTarget === '::1') {
          form.setError('target', { message: t('cannotBanLocalhost') })
          return
        }
      }

      const durationVal =
        duration === 'custom'
          ? banCustom.days * 24 * 60 + banCustom.hours * 60 + banCustom.minutes
          : duration === '-1'
            ? -1
            : Number(duration) * 24 * 60

      const reasonVal = reason === 'others' ? otherReason.trim() : reason

      if (!durationVal || durationVal < -1) {
        form.setError('duration', { message: t('wrongData') })
        return
      }

      if (!reasonVal) {
        form.setError('reason', {
          message: t('inputTip', { field: t('banReason') }),
        })
        return
      }

      setSubmitting(true)
      try {
        if (targetType === 'user') {
          const resp = await banUserByBody(
            trimmedTarget,
            durationVal,
            reasonVal
          )
          if (!resp.code) {
            toast.success(t('banUserSuccess'))
            onOpenChange(false)
            onSuccess()
          }
        } else {
          const resp = await banIP(trimmedTarget, durationVal, reasonVal)
          if (!resp.code) {
            toast.success(t('banIPSuccess'))
            onOpenChange(false)
            onSuccess()
          }
        }
      } catch (err) {
        console.error('ban submit error:', err)
      } finally {
        setSubmitting(false)
      }
    },
    [form, banCustom, otherReason, onOpenChange, onSuccess, t]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{t('addBan')}</DialogTitle>
          <DialogDescription>{t('addBanDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="py-2 space-y-6"
          >
            {!lockTargetType && (
              <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('banTarget')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(val) => {
                          field.onChange(val)
                          form.setValue('target', '')
                        }}
                        className="flex space-x-6"
                        value={field.value}
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="user" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {t('user')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="ip" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {t('ipAddress')}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {targetType === 'user' ? t('username') : t('ipAddress')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        targetType === 'user'
                          ? t('inputUsernameToBan')
                          : t('inputIPToBan')
                      }
                      disabled={lockTargetType && !!defaultTargetValue}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bannedDuration')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      className="flex flex-wrap"
                      value={field.value}
                    >
                      {banDays.map((item) => (
                        <FormItem
                          className="flex items-center space-y-0 mr-4 mb-3"
                          key={item}
                        >
                          <FormControl>
                            <RadioGroupItem
                              value={String(item)}
                              className="mr-1"
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {item === -1
                              ? t('forever')
                              : t('dayCount', { num: item })}
                          </FormLabel>
                        </FormItem>
                      ))}
                      <FormItem
                        className="flex items-center space-x-2 space-y-0 mb-3"
                        key="custom"
                      >
                        <FormControl>
                          <RadioGroupItem value="custom" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center flex-wrap gap-1">
                          <Input
                            type="number"
                            min="0"
                            className="inline-block w-[60px] h-[30px]"
                            value={banCustom.days}
                            onFocus={onBanInputFocus}
                            onChange={onBanInputChange('days')}
                          />
                          <span>{t('days')}</span>
                          <Input
                            type="number"
                            min="0"
                            className="inline-block w-[60px] h-[30px]"
                            value={banCustom.hours}
                            onFocus={onBanInputFocus}
                            onChange={onBanInputChange('hours')}
                          />
                          <span>{t('hours')}</span>
                          <Input
                            type="number"
                            min="0"
                            className="inline-block w-[60px] h-[30px]"
                            value={banCustom.minutes}
                            onFocus={onBanInputFocus}
                            onChange={onBanInputChange('minutes')}
                          />
                          <span>{t('minutes')}</span>
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('banReason')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      className="flex flex-wrap"
                      value={field.value}
                    >
                      {getModeReasons().map((item) => (
                        <FormItem
                          className="flex items-center space-x-2 space-y-0 mr-4 mb-2"
                          key={item}
                        >
                          <FormControl>
                            <RadioGroupItem value={item} />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {item === 'others' ? t('others') : item}
                          </FormLabel>
                        </FormItem>
                      ))}
                      {field.value === 'others' && (
                        <Input
                          placeholder={t('inputTip', {
                            field: t('otherReason'),
                          })}
                          className="mt-2 w-full"
                          value={otherReason}
                          onChange={(e) => setOtherReason(e.target.value)}
                        />
                      )}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting ? t('saving') : t('confirm')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
