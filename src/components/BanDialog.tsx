import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChangeEvent,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react'
import { UseFormReturn, useForm } from 'react-hook-form'

import { noop } from '@/lib/utils'
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

import { UserData } from '@/types/types'

import { Button } from './ui/button'
import { Input } from './ui/input'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'

const banDays = [1, 2, 3, 4, 5, 6, 7, -1]
const banReasons = ['广告营销', '不友善', '违反法律法规', 'others']

const banSchema = z.object({
  reason: z.string().min(1, '请输入封禁原因'),
  duration: z.string().min(1, '请输入封禁时长'), // seconds
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

    const banForm = useForm<BanSchema>({
      resolver: zodResolver(banSchema),
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
      () => banForm.setValue('duration', 'custom'),
      [banForm]
    )

    const onBanInputChange = useCallback(
      (inputType: keyof BanCustomInputs) => {
        return (e: ChangeEvent<HTMLInputElement>) => {
          const val = parseInt(e.target.value, 10)
          if (!val || val < 1) {
            banForm.setError('duration', {
              message: '数据有误',
            })
            return
          }

          setBanCustom((state) => ({ ...state, [inputType]: val }))

          banForm.setValue('duration', 'custom')
        }
      },
      [banForm]
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
          banForm.setError('duration', { message: '数据有误' })
          return
        }

        if (!reasonVal.trim()) {
          banForm.setError('reason', { message: '请输入封禁原因' })
          return
        }

        onSubmit({ duration: String(durationVal), reason: reasonVal })
      },
      [banCustom, otherReason]
    )

    return (
      <Dialog defaultOpen={false} open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>封禁</DialogTitle>
            <DialogDescription>
              封禁用户 {users.map((user) => user.name).join(', ')}
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
                    <FormLabel>封禁时长</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue="1"
                        className="flex flex-wrap"
                        value={banForm.getValues('duration')}
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
                              {item == -1 ? '永久' : item + ' 天'}
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
                            天
                            <Input
                              type="number"
                              pattern="/\d+/"
                              className="inline-block w-[80px]"
                              value={banCustom.hours}
                              onFocus={onBanInputFocus}
                              onChange={onBanInputChange('hours')}
                            />{' '}
                            小时
                            <Input
                              type="number"
                              pattern="/\d+/"
                              className="inline-block w-[80px]"
                              value={banCustom.minutes}
                              onFocus={onBanInputFocus}
                              onChange={onBanInputChange('minutes')}
                            />{' '}
                            分
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
                    <FormLabel>封禁原因</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue="广告营销"
                        className="flex flex-wrap"
                        value={banForm.getValues('reason')}
                      >
                        {banReasons.map((item) => (
                          <FormItem
                            className="flex items-center space-x-3 space-y-0 mr-4"
                            key={item}
                          >
                            <FormControl>
                              <RadioGroupItem value={item} />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {item == 'others' ? '其他' : item}
                            </FormLabel>
                          </FormItem>
                        ))}
                        {banForm.getValues('reason') == 'others' && (
                          <Input
                            placeholder="请填写其他原因"
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
              取消
            </Button>
            <Button
              variant={'destructive'}
              onClick={banForm.handleSubmit(handleSubmit)}
            >
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
)

export default BanDialog
