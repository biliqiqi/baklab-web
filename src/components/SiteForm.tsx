import { zodResolver } from '@hookform/resolvers/zod'
import { Collapsible } from '@radix-ui/react-collapsible'
import { ChevronDownIcon } from 'lucide-react'
import { MouseEvent, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import sanitize from 'sanitize-html'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

import { cn, noop, summaryText } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { getArticleList } from '@/api/article'
import { uploadFileBase64 } from '@/api/file'
import { checkSiteExists, deleteSite, submitSite, updateSite } from '@/api/site'
import { STATIC_HOST } from '@/constants/constants'
import { defaultSite } from '@/constants/defaults'
import { I18n } from '@/constants/types'
import i18n from '@/i18n'
import { useAlertDialogStore, useAuthedUserStore } from '@/state/global'
import { ResponseData, ResponseID, Site } from '@/types/types'

import BCropper from './base/BCropper'
import BSiteIcon from './base/BSiteIcon'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form'
import { Input } from './ui/input'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'

const MAX_SITE_FRONT_ID_LENGTH = 20
const MAX_SITE_NAME_LENGTH = 12

const createSiteSchema = (i: I18n) =>
  z
    .object({
      frontID: z
        .string()
        .min(1, i.t('siteFrontIdInputTip'))
        .max(
          MAX_SITE_FRONT_ID_LENGTH,
          i.t('charMaximum', {
            field: i.t('siteFrontId'),
            num: MAX_SITE_FRONT_ID_LENGTH,
          })
        )
        .regex(/^[a-zA-Z0-9_]+$/, i.t('siteFrontIdRule')),
      name: z
        .string()
        .min(1, i.t('siteNameInputTip'))
        .max(
          MAX_SITE_NAME_LENGTH,
          i.t('charMaximum', {
            field: i.t('siteName'),
            num: MAX_SITE_NAME_LENGTH,
          })
        ),
      keywords: z.string(),
      description: z.string(),
      logoUrl: z.string().min(1, i.t('settingTip', { name: 'LOGO' })),
      logoBrandHTML: z.string(),
      nonMemberInteract: z.boolean(),
      visible: z.boolean(),
      homePage: z.string(),
      reviewBeforePublish: z.boolean(),
      rateLimitTokens: z.string().optional(),
      rateLimitInterval: z.string().optional(),
      rateLimitEnabled: z.boolean(),
    })
    .refine(
      (data) => {
        if (data.rateLimitEnabled) {
          return (
            data.rateLimitTokens &&
            data.rateLimitTokens.trim() !== '' &&
            data.rateLimitInterval &&
            data.rateLimitInterval.trim() !== ''
          )
        }
        return true
      },
      {
        message: i.t('inputTip', { field: i.t('rateLimitTokens') }),
        path: ['rateLimitTokens'],
      }
    )
    .refine(
      (data) => {
        if (data.rateLimitEnabled) {
          return data.rateLimitInterval && data.rateLimitInterval.trim() !== ''
        }
        return true
      },
      {
        message: i.t('inputTip', { field: i.t('rateLimitInterval') }),
        path: ['rateLimitInterval'],
      }
    )

const createSiteEditSchema = (i: I18n) =>
  z
    .object({
      name: z.string(),
      keywords: z.string(),
      description: z.string(),
      logoUrl: z.string().min(1, i.t('settingTip', { name: 'LOGO' })),
      logoBrandHTML: z.string(),
      nonMemberInteract: z.boolean(),
      visible: z.boolean(),
      homePage: z.string(),
      reviewBeforePublish: z.boolean(),
      rateLimitTokens: z.string().optional(),
      rateLimitInterval: z.string().optional(),
      rateLimitEnabled: z.boolean(),
    })
    .refine(
      (data) => {
        if (data.rateLimitEnabled) {
          return (
            data.rateLimitTokens &&
            data.rateLimitTokens.trim() !== '' &&
            data.rateLimitInterval &&
            data.rateLimitInterval.trim() !== ''
          )
        }
        return true
      },
      {
        message: i.t('inputTip', { field: i.t('rateLimitTokens') }),
        path: ['rateLimitTokens'],
      }
    )
    .refine(
      (data) => {
        if (data.rateLimitEnabled) {
          return data.rateLimitInterval && data.rateLimitInterval.trim() !== ''
        }
        return true
      },
      {
        message: i.t('inputTip', { field: i.t('rateLimitInterval') }),
        path: ['rateLimitInterval'],
      }
    )

type SiteSchema = z.infer<ReturnType<typeof createSiteSchema>>

const htmlSanitizeOpts: sanitize.IOptions = {
  allowedTags: ['span', 'b', 'img'],
  allowedAttributes: {
    span: ['style', 'title'],
    b: ['style', 'title'],
    img: ['style', 'src', 'alt', 'title', 'width', 'height'],
  },
  disallowedTagsMode: 'discard',
}

interface SiteFormProps {
  isEdit?: boolean
  site?: Site
  onSuccess?: (frontId: string) => void
  onChange?: (isDirty: boolean) => void
}

const defaultSiteData: SiteSchema = {
  frontID: '',
  name: '',
  keywords: '',
  description: '',
  logoUrl: '',
  logoBrandHTML: '',
  visible: true,
  nonMemberInteract: true,
  homePage: '/',
  reviewBeforePublish: false,
  rateLimitTokens: '15',
  rateLimitInterval: '60',
  rateLimitEnabled: false,
}

const SiteForm: React.FC<SiteFormProps> = ({
  isEdit = false,
  site = defaultSite,
  onSuccess = noop,
  onChange = noop,
}) => {
  const [uploading, setUploading] = useState(false)
  const [brandUploading, setBrandUploading] = useState(false)
  const [edittingLogo, setEdittingLogo] = useState(false)
  const [showMoreSettings, setShowMoreSettings] = useState(isEdit)

  const { t } = useTranslation()

  const alertDialog = useAlertDialogStore()
  const { checkPermit, isLogined } = useAuthedUserStore(
    useShallow(({ isLogined, permit }) => ({
      checkPermit: permit,
      isLogined,
    }))
  )

  const form = useForm<SiteSchema>({
    resolver: zodResolver(
      isEdit ? createSiteEditSchema(i18n) : createSiteSchema(i18n),
      {},
      { mode: 'async' }
    ),
    defaultValues: {
      ...(isEdit
        ? {
            logoUrl: site.logoUrl,
            logoBrandHTML: site.logoHtmlStr,
            visible: site.visible,
            nonMemberInteract: site.allowNonMemberInteract,
            name: site.name,
            keywords: site.keywords,
            description: site.description,
            homePage: site.homePage,
            reviewBeforePublish: site.reviewBeforePublish,
            rateLimitTokens:
              site.rateLimitTokens != null
                ? String(site.rateLimitTokens)
                : '15',
            rateLimitInterval:
              site.rateLimitInterval != null
                ? String(site.rateLimitInterval)
                : '60',
            rateLimitEnabled: site.rateLimitEnabled || false,
          }
        : defaultSiteData),
    },
    mode: 'onChange',
  })

  const formVals = form.watch()

  const onSubmit = useCallback(
    async ({
      frontID,
      name,
      description,
      keywords,
      logoUrl,
      logoBrandHTML,
      visible,
      nonMemberInteract,
      homePage,
      reviewBeforePublish,
      rateLimitTokens,
      rateLimitInterval,
      rateLimitEnabled,
    }: SiteSchema) => {
      /* console.log('site vals: ', frontID) */
      try {
        let resp: ResponseData<ResponseID> | undefined

        if (logoBrandHTML) {
          logoBrandHTML = sanitize(logoBrandHTML, htmlSanitizeOpts)
        }

        const rateLimitTokensNum = parseInt(rateLimitTokens || '10', 10) || 10
        const rateLimitIntervalNum =
          parseInt(rateLimitInterval || '60', 10) || 60

        if (isEdit) {
          resp = await updateSite(
            site.frontId,
            name,
            description,
            keywords,
            visible,
            nonMemberInteract,
            logoUrl,
            logoBrandHTML,
            homePage,
            reviewBeforePublish,
            rateLimitTokensNum,
            rateLimitIntervalNum,
            rateLimitEnabled
          )
        } else {
          const exists = await checkSiteExists(frontID)
          /* console.log('frontID exists: ', exists) */
          if (exists) {
            form.setError(
              'frontID',
              { message: t('dataExist', { field: t('siteFrontId') }) },
              { shouldFocus: true }
            )
            return
          } else {
            form.clearErrors('frontID')
          }

          resp = await submitSite(
            name,
            frontID,
            description,
            keywords,
            visible,
            nonMemberInteract,
            logoUrl,
            logoBrandHTML,
            reviewBeforePublish,
            rateLimitTokensNum,
            rateLimitIntervalNum,
            rateLimitEnabled
          )
        }
        if (!resp?.code) {
          onSuccess(frontID)
        }
      } catch (err) {
        console.error('validate front id error: ', err)
      }
    },
    [form, isEdit, onSuccess, site, t]
  )

  const onDeleteClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (!isEdit || !site.frontId) return

      const resp = await getArticleList(
        1,
        1,
        'latest',
        '',
        '',
        'article',
        '',
        ['published'],
        {
          siteFrontId: site.frontId,
        }
      )
      if (!resp.code) {
        if (resp.data.articleTotal > 0) {
          const inputName = await alertDialog.prompt(
            t('confirm'),
            t('siteContentExistDeleteConfirm', { siteName: site.name }),
            '',
            (value) => value === site.name,
            t('siteNameNotMatch'),
            'danger'
          )

          if (!inputName) return

          const respD = await deleteSite(site.frontId)
          if (!respD.code) {
            onSuccess('')
          }
          return
        }
      }

      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('deleteConfirm'),
        'danger'
      )

      if (!confirmed) return

      const respD = await deleteSite(site.frontId)
      if (!respD.code) {
        onSuccess('')
      }
    },
    [isEdit, site, alertDialog, onSuccess, t]
  )

  const onCropSuccess = useCallback(
    async (imgData: string, logoType: 'logo' | 'logoBrand') => {
      try {
        if (!isLogined()) {
          toast.error(t('unAuthorizedError'))
          return
        }

        if (logoType == 'logo') {
          setUploading(true)
        } else {
          setBrandUploading(true)
        }

        const resp = await uploadFileBase64(imgData)
        if (!resp) return
        /* console.log('upload resp: ', resp) */
        const { success, data } = resp

        if (success) {
          /* setImgUrl(data.customUrl) */
          if (logoType == 'logo') {
            form.setValue('logoUrl', data.customUrl, { shouldDirty: true })
          } else {
            form.setValue(
              'logoBrandHTML',
              `<img alt="${formVals.name}" title="${formVals.name}" src="${data.customUrl}" style="max-height:100%;max-width:100%;" />`,
              { shouldDirty: true }
            )
          }
        }
      } catch (err) {
        console.error('upload icon error: ', err)
      } finally {
        if (logoType == 'logo') {
          setUploading(false)
        } else {
          setBrandUploading(false)
        }
      }
    },
    [form, isLogined, formVals, t]
  )

  const onLogoHtmlPreview = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      let cleanHtml = sanitize(formVals.logoBrandHTML, htmlSanitizeOpts)
      const divEl = document.createElement('div')
      divEl.innerHTML = cleanHtml
      const imgEls = divEl.getElementsByTagName('img')
      if (imgEls.length > 0) {
        const allowedHost = new URL(STATIC_HOST).hostname
        for (const imgEl of imgEls) {
          const imgUrl = new URL(imgEl.src)
          if (imgUrl.hostname !== allowedHost) {
            imgEl.src = ''
            cleanHtml = divEl.innerHTML
          }
        }
      }

      form.setValue('logoBrandHTML', cleanHtml, { shouldDirty: true })
    },
    [form, formVals]
  )

  useEffect(() => {
    onChange(form.formState.isDirty)
  }, [form, formVals, onChange])

  /* console.log('curr site: ', site) */

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="relative max-w-full"
      >
        <div className="flex items-start mb-4">
          <BSiteIcon
            logoUrl={formVals.logoUrl}
            name={formVals.name}
            size={60}
          />
          <div className="pl-4 flex-grow max-w-[calc(100%-82px)] overflow-hidden">
            <div className="text-sm text-gray-500 h-5">
              {'/z/' +
                (isEdit
                  ? site.frontId
                  : (formVals.frontID || '').toLowerCase())}
            </div>
            <div className="h-6">{formVals.name}</div>
            <div className="text-sm text-gray-500 h-6 overflow-hidden text-ellipsis">
              {summaryText(formVals.description, 20)}
            </div>
          </div>
        </div>
        <FormField
          control={form.control}
          name="logoUrl"
          key="logoUrl"
          render={() => (
            <FormItem className="mb-8">
              <FormLabel>{t('icon')}</FormLabel>
              <FormDescription>{t('iconDescribe')}</FormDescription>
              <FormControl>
                <div>
                  <BCropper
                    btnText={t('iconUploadTip')}
                    disabled={uploading}
                    loading={uploading}
                    onSuccess={(data) => onCropSuccess(data, 'logo')}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          key="name"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('siteNameInputTip')}
                  autoComplete="off"
                  state={fieldState.invalid ? 'invalid' : 'default'}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isEdit && (
          <FormField
            control={form.control}
            name="frontID"
            key="frontID"
            render={({ field, fieldState }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('frontId')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('siteFrontIdInputTip')}
                    autoComplete="off"
                    state={fieldState.invalid ? 'invalid' : 'default'}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="description"
          key="description"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormControl>
                <FormItem className="mb-8">
                  <FormLabel>{t('description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('siteDescriptionInputTip')}
                      autoComplete="off"
                      state={fieldState.invalid ? 'invalid' : 'default'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="visible"
          key="visible"
          render={({ field }) => (
            <FormItem className="mb-8">
              <FormLabel>{t('visibility')}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(val) => {
                    if (val == '1') {
                      field.onChange(true)
                    } else {
                      field.onChange(false)
                      form.setValue('nonMemberInteract', false, {
                        shouldDirty: true,
                      })
                    }
                  }}
                  defaultValue="1"
                  className="flex flex-wrap"
                  value={field.value ? '1' : '0'}
                >
                  <FormItem
                    className="flex items-center space-y-0 mr-4 mb-4"
                    key="1"
                  >
                    <FormControl>
                      <RadioGroupItem value="1" className="mr-1" />
                    </FormControl>
                    <FormLabel className="font-normal mr-1">
                      {t('public')}
                    </FormLabel>
                    <FormDescription>
                      {t('publicVisibilityDescription')}
                    </FormDescription>
                  </FormItem>
                  <FormItem
                    className="flex items-center space-y-0 mr-4 mb-4"
                    key="0"
                  >
                    <FormControl>
                      <RadioGroupItem value="0" className="mr-1" />
                    </FormControl>
                    <FormLabel className="font-normal mr-1">
                      {t('private')}
                    </FormLabel>
                    <FormDescription>
                      {t('privateVisibilityDescription')}
                    </FormDescription>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {formVals.visible && (
          <FormField
            control={form.control}
            name="nonMemberInteract"
            key="nonMemberInteract"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>{t('nonMemberInteract')}</FormLabel>
                <FormDescription>
                  {t('nonMemberInteractDescribe')}
                </FormDescription>
                <FormControl>
                  <div className="flex items-center">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t('allow')}
                      className="mr-1"
                      id="allowNonMemberInteract"
                    />{' '}
                    <label htmlFor="allowNonMemberInteract" className="text-sm">
                      {t('allow')}
                    </label>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Collapsible open={showMoreSettings} onOpenChange={setShowMoreSettings}>
          <CollapsibleTrigger asChild>
            <Button
              size={'sm'}
              variant={'link'}
              className="text-gray-500 px-0 mb-4 hover:no-underline"
            >
              <ChevronDownIcon
                size={14}
                className={cn(
                  'transition-transform duration-200 ease-in-out rotate-0 inline-block align-bottom mr-1',
                  !showMoreSettings && '-rotate-90'
                )}
              />
              {t('moreSettings')}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="CollapsibleContent">
            <FormField
              control={form.control}
              name="keywords"
              key="keywords"
              render={({ field, fieldState }) => (
                <FormItem className="mb-8">
                  <FormLabel>{t('keywords')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('keywordDescribe')}
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
              name="logoBrandHTML"
              key="logoBrandHTML"
              render={({ field }) => (
                <FormItem className="mb-8">
                  <FormLabel>LOGO</FormLabel>
                  <FormDescription>{t('logoDescribe')}</FormDescription>
                  <FormControl>
                    <div>
                      <div className="flex items-center">
                        <BCropper
                          cropShape="rect"
                          btnText={t('logoUploadTip')}
                          settingAspect
                          disabled={brandUploading || edittingLogo}
                          loading={brandUploading}
                          onSuccess={(data) => onCropSuccess(data, 'logoBrand')}
                        />
                        <Button
                          size={'sm'}
                          className="ml-2"
                          onClick={(e) => {
                            e.preventDefault()
                            setEdittingLogo((state) => !state)
                          }}
                        >
                          {t('editLogoSourceCode')}
                        </Button>
                      </div>
                      <div
                        dangerouslySetInnerHTML={{ __html: field.value }}
                        className="flex items-center h-[58px] max-w-[500px] mt-4 logo-preview"
                      ></div>
                      {edittingLogo && (
                        <div className="text-sm mt-4">
                          <Textarea
                            value={field.value}
                            className="text-sm whitespace-break-spaces h-[240px]"
                            onChange={field.onChange}
                          />
                          <div className="flex justify-between items-start mt-1">
                            <div className="text-gray-500 pr-2">
                              {t('logoSourceCodeTip')}
                            </div>
                            <Button size={'sm'} onClick={onLogoHtmlPreview}>
                              {t('preview')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reviewBeforePublish"
              key="reviewBeforePublish"
              render={({ field }) => (
                <FormItem className="mb-8">
                  <FormLabel>{t('contentReview')}</FormLabel>
                  <FormDescription>
                    {t('contentReviewDescribe')}
                  </FormDescription>
                  <FormControl>
                    <div className="flex items-center">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label={t('reviewBeforePublish')}
                        className="mr-1"
                        id="reviewBeforePublish"
                      />{' '}
                      <label htmlFor="reviewBeforePublish" className="text-sm">
                        {t('reviewBeforePublish')}
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rateLimitEnabled"
              key="rateLimitEnabled"
              render={({ field }) => (
                <FormItem className="mb-8">
                  <FormLabel>{t('siteRateLimitEnabled')}</FormLabel>
                  <FormDescription>
                    {t('siteRateLimitEnabledDescribe')}
                  </FormDescription>
                  <FormControl>
                    <div className="flex items-center">
                      <Switch
                        id="rate-limit-enabled"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label
                        htmlFor="rate-limit-enabled"
                        className="inline-block pl-2 leading-[24px] text-sm"
                      >
                        {t('siteRateLimitEnabledLabel')}
                      </label>
                    </div>
                  </FormControl>
                  {formVals.rateLimitEnabled &&
                    formVals.rateLimitTokens &&
                    formVals.rateLimitInterval && (
                      <div className="text-sm text-gray-500 mt-2">
                        {t('rateLimitPolicy', {
                          tokens: formVals.rateLimitTokens,
                          interval: formVals.rateLimitInterval,
                        })}
                      </div>
                    )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {formVals.rateLimitEnabled && (
              <>
                <FormField
                  control={form.control}
                  name="rateLimitTokens"
                  key="rateLimitTokens"
                  render={({ field, fieldState }) => (
                    <FormItem className="mb-8">
                      <FormLabel>{t('rateLimitTokens')}</FormLabel>
                      <FormDescription>
                        {t('rateLimitTokensDescribe')}
                      </FormDescription>
                      <FormControl>
                        <Input
                          placeholder={t('inputTip', {
                            field: t('rateLimitTokens'),
                          })}
                          autoComplete="off"
                          pattern="^\d+$"
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
                  name="rateLimitInterval"
                  key="rateLimitInterval"
                  render={({ field, fieldState }) => (
                    <FormItem className="mb-8">
                      <FormLabel>{t('rateLimitInterval')}</FormLabel>
                      <FormDescription>
                        {t('rateLimitIntervalDescribe')}
                      </FormDescription>
                      <FormControl>
                        <Input
                          placeholder={t('inputTip', {
                            field: t('rateLimitInterval'),
                          })}
                          autoComplete="off"
                          pattern="^\d+$"
                          state={fieldState.invalid ? 'invalid' : 'default'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {isEdit && (
              <FormField
                control={form.control}
                name="homePage"
                key="homePage"
                render={({ field }) => (
                  <FormItem className="mb-8">
                    <FormLabel>{t('homePage')}</FormLabel>
                    <FormDescription>{t('homePageDescribe')}</FormDescription>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue="/"
                        className="flex flex-wrap"
                        value={field.value}
                      >
                        <FormItem
                          className="flex items-center space-y-0 mr-4 mb-4"
                          key="homepage"
                        >
                          <FormControl>
                            <RadioGroupItem value="/" className="mr-1" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t('feed')} (&nbsp;
                            <span className="text-sm text-gray-500">
                              {`/z/${site.frontId}`}
                            </span>
                            &nbsp;)
                          </FormLabel>
                        </FormItem>
                        <FormItem
                          className="flex items-center space-y-0 mr-4 mb-4"
                          key="categories"
                        >
                          <FormControl>
                            <RadioGroupItem value="/bankuai" className="mr-1" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {t('category')} (&nbsp;
                            <span className="text-sm text-gray-500">
                              {`/z/${site.frontId}/bankuai`}
                            </span>
                            &nbsp;)
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CollapsibleContent>
        </Collapsible>
        <div className="flex justify-between">
          <span>
            {isEdit && checkPermit('site', 'delete') && (
              <Button
                variant="outline"
                className="border-destructive outline-destructive"
                size="sm"
                onClick={onDeleteClick}
              >
                {t('delete')}
              </Button>
            )}
          </span>
          <Button type="submit" size="sm" disabled={!form.formState.isDirty}>
            {t('submit')}
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default SiteForm
