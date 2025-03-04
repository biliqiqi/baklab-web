import { zodResolver } from '@hookform/resolvers/zod'
import React, { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'

import { noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { submitSiteBlockedWords } from '@/api/site'
import { MAX_BLOCKED_WORD_LEN } from '@/constants/constants'

import { Button } from './ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Textarea } from './ui/textarea'

const wordSchema = z.object({
  words: z.string().min(1, '请输入屏蔽词'),
})

type WordSchema = z.infer<typeof wordSchema>

interface BlockedWordFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  onChange?: (dirty: boolean) => void
}

const BlockedWordForm: React.FC<BlockedWordFormProps> = ({
  onSuccess = noop,
  onCancel = noop,
  onChange = noop,
}) => {
  const { siteFrontId } = useParams()

  const form = useForm<WordSchema>({
    resolver: zodResolver(wordSchema),
    defaultValues: {
      words: '',
    },
  })

  const formVals = form.watch()

  const onSubmit = useCallback(
    async ({ words }: WordSchema) => {
      if (!siteFrontId) return

      const wordArr = words
        .replace(/[\s\n\r\t,，、]/g, ',')
        .split(',')
        .map((word) => word.trim())
        .filter((word) => word != '')

      if (wordArr.length == 0) {
        form.setError('words', { message: '请输入屏蔽词' })
        return
      }

      const tooLongWords = wordArr.filter(
        (word) => word.length > MAX_BLOCKED_WORD_LEN
      )

      if (tooLongWords.length > 0) {
        form.setError('words', {
          message: `以下词汇超过了 ${MAX_BLOCKED_WORD_LEN} 个字符，请调整后重新提交：\n\n${tooLongWords.join('\n')}`,
        })
        return
      }

      const { code } = await submitSiteBlockedWords(siteFrontId, wordArr)
      if (!code) {
        onSuccess()
      }
    },
    [siteFrontId, form, onSuccess]
  )

  useEffect(() => {
    onChange(form.formState.isDirty)
  }, [formVals, form, onChange])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="words"
          key={`words`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>屏蔽词</FormLabel>
              <FormDescription>
                请输入需要屏蔽的词汇，多个词语请使用逗号、空格、顿号或换行符隔开。
                <br />
                单个词汇不得超过 {MAX_BLOCKED_WORD_LEN} 个字符。
              </FormDescription>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage className="whitespace-break-spaces" />
            </FormItem>
          )}
        />
        <div className="flex justify-between mt-4">
          <div></div>
          <div>
            <Button
              variant={'secondary'}
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                onCancel()
              }}
            >
              取消
            </Button>
            <Button
              size="sm"
              disabled={!form.formState.isDirty}
              className="ml-2"
            >
              提交
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default BlockedWordForm
