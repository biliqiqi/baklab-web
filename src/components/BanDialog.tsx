import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChangeEvent,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react'
import { UseFormReturn, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

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

import { I18n } from '@/constants/types'
import i18n from '@/i18n'
import { UserData } from '@/types/types'

import { Button } from './ui/button'
import { Input } from './ui/input'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

const banDays = [1, 2, 3, 4, 5, 6, 7, -1]

const reasonSchema = (i: I18n) =>
  z.string().min(1, i.t('inputTip', { field: i.t('banReason') }))
const durationSchema = (i: I18n) =>
  z.string().min(1, i.t('inputTip', { field: i.t('bannedDuration') }))

const banSchema = z.object({
  reason: reasonSchema(i18n),
  duration: durationSchema(i18n),
})

export type BanSchema = z.infer<typeof banSchema>

const defaultBanCustomInputs: BanCustomInputs = {
  days: 0,
  hours: 0,
  minutes: 0,
}

const defaultBanData: BanSchema = {
  reason: '',
  duration: '',
}

export interface BanCustomInputs {
  days: number
  hours: number
  minutes: number
}

export interface BanDialogProps {
  users: UserData[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: BanSchema) => void
  onCancel?: () => void
}

export interface BanDialogRef {
  form: UseFormReturn<BanSchema>
}

const BanDialog = forwardRef<BanDialogRef, BanDialogProps>(
  (
    {
      users,
      onSubmit = noop,
      onCancel = noop,
      open = false,
      onOpenChange = noop,
    },
    ref
  ) => {
    const [banCustom, setBanCustom] = useState<BanCustomInputs>({
      ...defaultBanCustomInputs,
    })

    const [otherReason, setOtherReason] = useState('')

    const { t, i18n } = useTranslation()

    const banForm = useForm<BanSchema>({
      resolver: zodResolver(
        banSchema.extend({
          reason: reasonSchema(i18n),
          duration: durationSchema(i18n),
        })
      ),
      defaultValues: {
        ...defaultBanData,
      },
    })

    useImperativeHandle(ref, () => {
      return {
        form: banForm,
      }
    }, [banForm])

    const onBanInputFocus = useCallback(
      () => banForm.setValue('duration', 'custom', { shouldDirty: true }),
      [banForm]
    )

    const onBanInputChange = useCallback(
      (inputType: keyof BanCustomInputs) => {
        return (e: ChangeEvent<HTMLInputElement>) => {
          const val = parseInt(e.target.value, 10)
          if (!val || val < 1) {
            banForm.setError('duration', {
              message: t('wrongData'),
            })
            return
          }

          setBanCustom((state) => ({ ...state, [inputType]: val }))

          banForm.setValue('duration', 'custom', { shouldDirty: true })
        }
      },
      [banForm, t]
    )

    const handleSubmit = useCallback(
      ({ duration, reason }: BanSchema) => {
        const durationVal =
          duration == 'custom'
            ? banCustom.days * 24 * 60 +
              banCustom.hours * 60 +
              banCustom.minutes
            : Number(duration) * 24 * 60

        const reasonVal = reason == 'others' ? otherReason : reason

        if (!durationVal || durationVal < -1) {
          banForm.setError('duration', { message: t('wrongData') })
          return
        }

        if (!reasonVal.trim()) {
          banForm.setError('reason', {
            message: t('inputTip', { field: t('bannedDuration') }),
          })
          return
        }

        onSubmit({ duration: String(durationVal), reason: reasonVal })
      },
      [banCustom, otherReason, banForm, onSubmit, t]
    )

    return (
      <Dialog defaultOpen={false} open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ban')}</DialogTitle>
            <DialogDescription>
              {t('banUser1', {
                name: users.map((user) => user.name).join(', '),
              })}
            </DialogDescription>
          </DialogHeader>
          <Form {...banForm}>
            <form
              onSubmit={banForm.handleSubmit(handleSubmit)}
              className="py-4 space-y-8"
            >
              <FormField
                control={banForm.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('bannedDuration')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue="1"
                        className="flex flex-wrap"
                        value={field.value}
                      >
                        {banDays.map((item) => (
                          <FormItem
                            className="flex items-center space-y-0 mr-4 mb-4"
                            key={item}
                          >
                            <FormControl>
                              <RadioGroupItem
                                value={String(item)}
                                className="mr-1"
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {item == -1
                                ? t('forever')
                                : t('dayCount', { num: item })}
                            </FormLabel>
                          </FormItem>
                        ))}
                        <FormItem
                          className="flex items-center space-x-3 space-y-0"
                          key="custom"
                        >
                          <FormControl>
                            <RadioGroupItem value="custom" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            <Input
                              type="number"
                              pattern="/\d+/"
                              className="inline-block w-[80px]"
                              value={banCustom.days}
                              onFocus={onBanInputFocus}
                              onChange={onBanInputChange('days')}
                            />{' '}
                            {t('days')}
                            <Input
                              type="number"
                              pattern="/\d+/"
                              className="inline-block w-[80px]"
                              value={banCustom.hours}
                              onFocus={onBanInputFocus}
                              onChange={onBanInputChange('hours')}
                            />{' '}
                            {t('hours')}
                            <Input
                              type="number"
                              pattern="/\d+/"
                              className="inline-block w-[80px]"
                              value={banCustom.minutes}
                              onFocus={onBanInputFocus}
                              onChange={onBanInputChange('minutes')}
                            />{' '}
                            {t('minutes')}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={banForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('banReason')}</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        className="flex flex-wrap"
                        value={banForm.getValues('reason')}
                      >
                        {getModeReasons().map((item) => (
                          <FormItem
                            className="flex items-center space-x-3 space-y-0 mr-4"
                            key={item}
                          >
                            <FormControl>
                              <RadioGroupItem value={item} />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {item == 'others' ? t('others') : item}
                            </FormLabel>
                          </FormItem>
                        ))}
                        {banForm.getValues('reason') == 'others' && (
                          <Input
                            placeholder={t('inputTip', {
                              field: t('otherReason'),
                            })}
                            className="mt-4"
                            onChange={(e) => setOtherReason(e.target.value)}
                          />
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button variant={'secondary'} onClick={onCancel}>
              {t('cancel')}
            </Button>
            <Button
              variant={'destructive'}
              onClick={banForm.handleSubmit(handleSubmit)}
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
)

export default BanDialog
