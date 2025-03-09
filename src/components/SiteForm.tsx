import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import sanitize from 'sanitize-html'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'

import { noop, summryText } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { getArticleList } from '@/api/article'
import { uploadFileBase64 } from '@/api/file'
import { checkSiteExists, deleteSite, submitSite, updateSite } from '@/api/site'
import { STATIC_HOST_NAME } from '@/constants/constants'
import { defaultSite } from '@/constants/defaults'
import { useAlertDialogStore, useAuthedUserStore } from '@/state/global'
import { ResponseData, ResponseID, Site } from '@/types/types'

import BCropper from './base/BCropper'
import BSiteIcon from './base/BSiteIcon'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
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
import { Textarea } from './ui/textarea'

const MAX_SITE_FRONT_ID_LENGTH = 20
const MAX_SITE_NAME_LENGTH = 12

const frontIDScheme = z
  .string()
  .min(1, '请输入站点标识')
  .max(
    MAX_SITE_FRONT_ID_LENGTH,
    `站点标识不得超过${MAX_SITE_FRONT_ID_LENGTH}个字符`
  )
  .regex(/^[a-zA-Z0-9_]+$/, '站点标识由数字、字母和下划线组成，不区分大小写')

const nameScheme = z
  .string()
  .min(1, '请输入站点名称')
  .max(MAX_SITE_NAME_LENGTH, `站点名称不得超过${MAX_SITE_NAME_LENGTH}个字符`)
const descriptionScheme = z.string()

const siteScheme = z.object({
  frontID: frontIDScheme,
  name: nameScheme,
  keywords: z.string(),
  description: descriptionScheme,
  logoUrl: z.string().min(1, '请设置 LOGO'),
  logoBrandHTML: z.string(),
  nonMemberInteract: z.boolean(),
  visible: z.boolean(),
  homePage: z.string(),
  reviewBeforePublish: z.boolean(),
})

const siteEditScheme = z.object({
  name: nameScheme,
  keywords: z.string(),
  description: descriptionScheme,
  logoUrl: z.string().min(1, '请设置 LOGO'),
  logoBrandHTML: z.string(),
  nonMemberInteract: z.boolean(),
  visible: z.boolean(),
  homePage: z.string(),
  reviewBeforePublish: z.boolean(),
})

const htmlSanitizeOpts: sanitize.IOptions = {
  allowedTags: ['span', 'b', 'img'],
  allowedAttributes: {
    span: ['style', 'title'],
    b: ['style', 'title'],
    img: ['style', 'src', 'alt', 'title', 'width', 'height'],
  },
  disallowedTagsMode: 'discard',
}

type SiteScheme = z.infer<typeof siteScheme>

interface SiteFormProps {
  isEdit?: boolean
  site?: Site
  onSuccess?: (frontId: string) => void
  onChange?: (isDirty: boolean) => void
}

const defaultSiteData: SiteScheme = {
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

  const alertDialog = useAlertDialogStore()
  const { checkPermit, isLogined } = useAuthedUserStore(
    useShallow(({ isLogined, permit }) => ({
      checkPermit: permit,
      isLogined,
    }))
  )

  const form = useForm<SiteScheme>({
    resolver: zodResolver(
      isEdit ? siteEditScheme : siteScheme,
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
    }: SiteScheme) => {
      /* console.log('site vals: ', frontID) */
      try {
        let resp: ResponseData<ResponseID> | undefined

        if (logoBrandHTML) {
          logoBrandHTML = sanitize(logoBrandHTML, htmlSanitizeOpts)
        }

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
            reviewBeforePublish
          )
        } else {
          const exists = await checkSiteExists(frontID)
          /* console.log('frontID exists: ', exists) */
          if (exists) {
            form.setError(
              'frontID',
              { message: '站点标识已存在' },
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
            reviewBeforePublish
          )
        }
        if (!resp?.code) {
          onSuccess(frontID)
        }
      } catch (err) {
        console.error('validate front id error: ', err)
      }
    },
    [form, isEdit, onSuccess, site]
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
          alertDialog.alert('无法删除', '该站点下存在内容，无法删除')
          return
        }
      }

      const confirmed = await alertDialog.confirm(
        '确认',
        '删除之后无法撤回，确认删除？',
        'danger'
      )

      if (!confirmed) return

      const respD = await deleteSite(site.frontId)
      if (!respD.code) {
        onSuccess('')
      }
    },
    [isEdit, site, alertDialog, onSuccess]
  )

  const onCropSuccess = useCallback(
    async (imgData: string, logoType: 'logo' | 'logoBrand') => {
      try {
        if (!isLogined()) {
          toast.error('请认证或登录后再试')
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
          /* setImgUrl(data) */
          if (logoType == 'logo') {
            form.setValue('logoUrl', data)
          } else {
            form.setValue(
              'logoBrandHTML',
              `<img alt="${formVals.name}" title="${formVals.name}" src="${data}" style="max-height:100%;max-width:100%;" />`,
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
    [form, isLogined, formVals]
  )

  const onLogoHtmlPreview = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      let cleanHtml = sanitize(formVals.logoBrandHTML, htmlSanitizeOpts)
      const divEl = document.createElement('div')
      divEl.innerHTML = cleanHtml
      const imgEls = divEl.getElementsByTagName('img')
      if (imgEls.length > 0) {
        for (const imgEl of imgEls) {
          const imgUrl = new URL(imgEl.src)
          if (imgUrl.hostname != STATIC_HOST_NAME) {
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
              {'/' +
                (isEdit
                  ? site.frontId
                  : (formVals.frontID || '').toLowerCase())}
            </div>
            <div className="h-6">{formVals.name}</div>
            <div className="text-sm text-gray-500 h-6 overflow-hidden text-ellipsis">
              {summryText(formVals.description, 20)}
            </div>
          </div>
        </div>
        <FormField
          control={form.control}
          name="logoUrl"
          key="logoUrl"
          render={() => (
            <FormItem className="mb-8">
              <FormLabel>图标</FormLabel>
              <FormDescription>
                用于作为浏览器标签图标、应用安装图标、站点按钮标识等，图片限制为正方形
              </FormDescription>
              <FormControl>
                <div>
                  <BCropper
                    btnText="上传站点图标"
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
        {!isEdit && (
          <FormField
            control={form.control}
            name="frontID"
            key="frontID"
            render={({ field, fieldState }) => (
              <FormItem className="mb-8">
                <FormLabel>标识</FormLabel>
                <FormControl>
                  <Input
                    placeholder="请输入站点标识"
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
          name="name"
          key="name"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>名称</FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入站点名称"
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
              <FormLabel>
                品牌 LOGO <span className="text-gray-500">(选填)</span>
              </FormLabel>
              <FormDescription>
                用于顶部导航栏或其他地方用到的品牌标识，可以为图片或纯文本，如果没有设置品牌
                LOGO 则默认使用站点图标和站点名称来代替
              </FormDescription>
              <FormControl>
                <div>
                  <div className="flex items-center">
                    <BCropper
                      cropShape="rect"
                      btnText="上传 LOGO 图片"
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
                      编辑 LOGO 源码
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
                          仅支持 img、span、b 标签，可使用 style 和 title
                          属性，img 标签额外支持 src、width、height、alt
                          属性，其他未提及的标签和属性均不支持，图片资源仅支持本站上传
                        </div>
                        <Button size={'sm'} onClick={onLogoHtmlPreview}>
                          预览
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
          name="visible"
          key="visible"
          render={({ field }) => (
            <FormItem className="mb-8">
              <FormLabel>可见性</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(val) => {
                    if (val == '1') {
                      field.onChange(true)
                    } else {
                      field.onChange(false)
                      form.setValue('nonMemberInteract', false)
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
                    <FormLabel className="font-normal">公开</FormLabel>
                  </FormItem>
                  <FormItem
                    className="flex items-center space-y-0 mr-4 mb-4"
                    key="0"
                  >
                    <FormControl>
                      <RadioGroupItem value="0" className="mr-1" />
                    </FormControl>
                    <FormLabel className="font-normal">私有</FormLabel>
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
                <FormLabel>是否允许非成员交互</FormLabel>
                <FormDescription>
                  是否允许未加入的用户进行投票、订阅、收藏、评论等操作，若不允许，则只能浏览内容
                </FormDescription>
                <FormControl>
                  <div className="flex items-center">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="允许"
                      className="mr-1"
                      id="allowNonMemberInteract"
                    />{' '}
                    <label htmlFor="allowNonMemberInteract" className="text-sm">
                      允许
                    </label>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="reviewBeforePublish"
          key="reviewBeforePublish"
          render={({ field }) => (
            <FormItem className="mb-8">
              <FormLabel>内容审核</FormLabel>
              <FormDescription>是否在发布内容之前进行审核</FormDescription>
              <FormControl>
                <div className="flex items-center">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="开启先审后发"
                    className="mr-1"
                    id="reviewBeforePublish"
                  />{' '}
                  <label htmlFor="reviewBeforePublish" className="text-sm">
                    开启先审后发
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isEdit && (
          <FormField
            control={form.control}
            name="homePage"
            key="homePage"
            render={({ field }) => (
              <FormItem className="mb-8">
                <FormLabel>首页</FormLabel>
                <FormDescription>从以下页面中选择一个作为首页</FormDescription>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue="/feed"
                    className="flex flex-wrap"
                    value={field.value == '/' ? '/feed' : field.value}
                  >
                    <FormItem
                      className="flex items-center space-y-0 mr-4 mb-4"
                      key="feed"
                    >
                      <FormControl>
                        <RadioGroupItem value="/feed" className="mr-1" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        信息流 (&nbsp;
                        <span className="text-sm text-gray-500">
                          {`/${site.frontId}/feed`}
                        </span>
                        &nbsp;)
                      </FormLabel>
                    </FormItem>
                    <FormItem
                      className="flex items-center space-y-0 mr-4 mb-4"
                      key="categories"
                    >
                      <FormControl>
                        <RadioGroupItem value="/categories" className="mr-1" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        分类 (&nbsp;
                        <span className="text-sm text-gray-500">
                          {`/${site.frontId}/categories`}
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
        <FormField
          control={form.control}
          name="keywords"
          key="keywords"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormLabel>关键词</FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入站点关键字词，用逗号 ( , ) 隔开"
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
          key="description"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
              <FormControl>
                <FormItem className="mb-8">
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入站点描述"
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
        <div className="flex justify-between">
          <span>
            {isEdit && checkPermit('site', 'delete') && (
              <Button
                variant="outline"
                className="border-destructive outline-destructive"
                size="sm"
                onClick={onDeleteClick}
              >
                删除
              </Button>
            )}
          </span>
          <Button type="submit" size="sm" disabled={!form.formState.isDirty}>
            提交
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default SiteForm
