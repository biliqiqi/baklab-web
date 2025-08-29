import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { noop } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { createOAuthClient, updateOAuthClient } from '@/api/oauth'
import { I18n } from '@/constants/types'
import { OAuthClient, OAuthClientResponse } from '@/types/oauth'

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
import { Textarea } from './ui/textarea'

interface OAuthClientFormProps {
  client?: OAuthClient | null
  onSuccess?: (client?: OAuthClientResponse, isNewClient?: boolean) => void
  onCancel?: () => void
  onChange?: (isDirty: boolean) => void
}

const nameSchema = (i: I18n) =>
  z.string().min(1, i.t('inputTip', { field: i.t('name') }))

const redirectURISchema = (i: I18n) =>
  z
    .string()
    .min(1, i.t('inputTip', { field: i.t('redirectURI') }))
    .url(i.t('invalidUrl'))

const logoURLSchema = z.string().url().optional().or(z.literal(''))

const descriptionSchema = z.string()

const oauthClientSchema = (i: I18n) => z.object({
  name: nameSchema(i),
  description: descriptionSchema,
  redirectURI: redirectURISchema(i),
  logoURL: logoURLSchema,
})

type OAuthClientSchema = z.infer<ReturnType<typeof oauthClientSchema>>

const defaultClientData: OAuthClientSchema = {
  name: '',
  description: '',
  redirectURI: '',
  logoURL: '',
}

const OAuthClientForm: React.FC<OAuthClientFormProps> = ({
  client = null,
  onSuccess = noop,
  onCancel = noop,
  onChange = noop,
}) => {
  const [submitting, setSubmitting] = useState(false)
  const { t, i18n: i18nInstance } = useTranslation()

  const isEdit = useMemo(() => !!client, [client])

  const form = useForm<OAuthClientSchema>({
    resolver: zodResolver(oauthClientSchema(i18nInstance)),
    defaultValues: isEdit
      ? {
          name: client?.name || '',
          description: client?.description || '',
          redirectURI: client?.redirectURI || '',
          logoURL: client?.logoURL || '',
        }
      : defaultClientData,
  })

  const formVals = form.watch()

  const onSubmit = useCallback(
    async (vals: OAuthClientSchema) => {
      if (submitting) return

      try {
        setSubmitting(true)

        if (isEdit && client) {
          const resp = await updateOAuthClient(client.clientID, {
            name: vals.name,
            description: vals.description,
            redirectURI: vals.redirectURI,
            logoURL: vals.logoURL || '',
          })
          
          if (!resp?.code) {
            onSuccess(undefined, false)
          }
        } else {
          const resp = await createOAuthClient({
            name: vals.name,
            description: vals.description,
            redirectURI: vals.redirectURI,
            logoURL: vals.logoURL || '',
          })
          
          if (!resp?.code) {
            onSuccess(resp?.data, true)
          }
        }
      } catch (err) {
        console.error('OAuth client form submit error: ', err)
      } finally {
        setSubmitting(false)
      }
    },
    [isEdit, client, submitting, onSuccess]
  )

  useEffect(() => {
    onChange(form.formState.isDirty)
  }, [form, formVals, onChange])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('oauthAppName')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('inputTip', { field: t('oauthAppName') })}
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
          name="description"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('description')}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('inputTip', { field: t('description') })}
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
          name="redirectURI"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('redirectURI')}</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/callback"
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
          name="logoURL"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('logoURL')} ({t('optional')})</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://example.com/logo.png"
                  autoComplete="off"
                  state={fieldState.invalid ? 'invalid' : 'default'}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={!form.formState.isDirty || submitting}
          >
            {submitting
              ? t('submitting')
              : isEdit
              ? t('update')
              : t('create')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default OAuthClientForm