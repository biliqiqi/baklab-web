import { zodResolver } from '@hookform/resolvers/zod'
import React, { useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
  words: z.string(),
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

  const { t } = useTranslation()

  const form = useForm<WordSchema>({
    resolver: zodResolver(
      wordSchema.extend({
        words: z.string().min(1, t('inputTip', { field: t('blockedWord') })),
      })
    ),
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
        form.setError('words', {
          message: t('inputTip', { field: t('blockedWord') }),
        })
        return
      }

      const tooLongWords = wordArr.filter(
        (word) => word.length > MAX_BLOCKED_WORD_LEN
      )

      if (tooLongWords.length > 0) {
        form.setError('words', {
          message: t('blockedWordsMaxChar', {
            num: MAX_BLOCKED_WORD_LEN,
            wordList: tooLongWords.join('\n'),
          }),
        })
        return
      }

      const { code } = await submitSiteBlockedWords(siteFrontId, wordArr)
      if (!code) {
        onSuccess()
      }
    },
    [siteFrontId, form, onSuccess, t]
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
              <FormLabel>{t('blockedWord')}</FormLabel>
              <FormDescription>
                {t('blockedWordDescribe1')}
                <br />
                {t('blockedWordDescribe2', { num: MAX_BLOCKED_WORD_LEN })}
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
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              disabled={!form.formState.isDirty}
              className="ml-2"
            >
              {t('submit')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

export default BlockedWordForm
