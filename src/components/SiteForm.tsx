import { zodResolver } from '@hookform/resolvers/zod'
import { MouseEvent, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

import { noop, summryText } from '@/lib/utils'
import { z } from '@/lib/zod-custom'

import { getArticleList } from '@/api/article'
import { uploadFileBase64 } from '@/api/file'
import { checkSiteExists, deleteSite, submitSite, updateSite } from '@/api/site'
import { defaultSite } from '@/constants/defaults'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useSiteStore,
} from '@/state/global'
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
  nonMemberInteract: z.boolean(),
  visible: z.boolean(),
})

const siteEditScheme = z.object({
  name: nameScheme,
  keywords: z.string(),
  description: descriptionScheme,
  logoUrl: z.string().min(1, '请设置 LOGO'),
  nonMemberInteract: z.boolean(),
  visible: z.boolean(),
})

type SiteScheme = z.infer<typeof siteScheme>

interface SiteFormProps {
  isEdit?: boolean
  site?: Site
  onSuccess?: () => void
  onChange?: (isDirty: boolean) => void
}

const defaultSiteData: SiteScheme = {
  frontID: '',
  name: '',
  keywords: '',
  description: '',
  logoUrl: '',
  visible: true,
  nonMemberInteract: true,
}

const SiteForm: React.FC<SiteFormProps> = ({
  isEdit = false,
  site = defaultSite,
  onSuccess = noop,
  onChange = noop,
}) => {
  const [imgUrl, setImgUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const alertDialog = useAlertDialogStore()
  const authStore = useAuthedUserStore()
  const siteStore = useSiteStore()

  const form = useForm<SiteScheme>({
    resolver: zodResolver(
      isEdit ? siteEditScheme : siteScheme,
      {},
      { mode: 'async' }
    ),
    defaultValues: {
      ...(isEdit
        ? {
            name: site.name,
            keywords: site.keywords,
            description: site.description,
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
      visible,
      nonMemberInteract,
    }: SiteScheme) => {
      /* console.log('site vals: ', frontID) */
      try {
        let resp: ResponseData<ResponseID> | undefined

        if (isEdit) {
          resp = await updateSite(
            site.frontId,
            name,
            description,
            keywords,
            visible,
            nonMemberInteract,
            logoUrl
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
            logoUrl
          )
        }
        if (!resp?.code) {
          onSuccess()
        }
      } catch (err) {
        console.error('validate front id error: ', err)
      }
    },
    [form, isEdit, onSuccess, site, siteStore]
  )

  const onDeleteClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      if (!isEdit || !site.frontId) return

      const resp = await getArticleList(1, 1, 'latest', '', '', 'article', '', {
        siteFrontId: site.frontId,
      })
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
        onSuccess()
      }
    },
    [isEdit, site, alertDialog, onSuccess]
  )

  const onCropSuccess = useCallback(
    async (imgData: string) => {
      try {
        setUploading(true)
        const resp = await uploadFileBase64(imgData)
        if (!resp) return
        /* console.log('upload resp: ', resp) */
        const { success, data } = resp

        if (success) {
          setImgUrl(data)
          form.setValue('logoUrl', data)
        }
      } catch (err) {
        console.error('upload icon error: ', err)
      } finally {
        setUploading(false)
      }
    },
    [form]
  )

  useEffect(() => {
    onChange(form.formState.isDirty)
  }, [form, formVals])

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
              {'/' + (isEdit ? site.frontId : formVals.frontID.toLowerCase())}
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
              <FormControl>
                <>
                  <BCropper
                    btnText="上传站点图标"
                    disabled={uploading}
                    loading={uploading}
                    onSuccess={onCropSuccess}
                  />
                </>
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
              <FormLabel>站点可见性</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(val) => {
                    if (val == '1') {
                      form.setValue('visible', true)
                    } else {
                      form.setValue('visible', false)
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
        {!isEdit && (
          <FormField
            control={form.control}
            name="frontID"
            key="frontID"
            render={({ field, fieldState }) => (
              <FormItem className="mb-8">
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
          name="keywords"
          key="keywords"
          render={({ field, fieldState }) => (
            <FormItem className="mb-8">
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
            {isEdit && authStore.permit('site', 'delete') && (
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
          <Button type="submit" size="sm">
            提交
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default SiteForm
