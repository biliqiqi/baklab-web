import { authRequest } from '@/lib/request'

import {
  Category,
  CategoryExists,
  CustomRequestOptions,
  ResponseData,
  ResponseID,
} from '@/types/types'

interface SubmitCategoryPayload {
  frontID: string
  name: string
  description: string
  visible: boolean
  iconBgColor: string
  iconContent: string
  contentFormId: string
  memberIds?: number[]
  memberRole?: string
}

export const getCategoryList = async (custom?: CustomRequestOptions) =>
  authRequest.get<ResponseData<Category[] | null>>(`categories`, {}, custom)

export const getCategoryWithFrontId = async (
  frontId: string,
  custom?: CustomRequestOptions
) =>
  authRequest.get<ResponseData<Category>>(`categories/${frontId}`, {}, custom)

export const submitCategory = async (
  {
    frontID,
    name,
    description,
    visible,
    iconBgColor,
    iconContent,
    contentFormId,
    memberIds,
    memberRole,
  }: SubmitCategoryPayload,
  custom?: CustomRequestOptions
) =>
  authRequest.post<ResponseData<ResponseID>>(
    `categories`,
    {
      json: {
        frontID,
        name,
        description,
        visible,
        iconBgColor,
        iconContent,
        contentFormId,
        memberIds: memberIds && memberIds.length > 0 ? memberIds : undefined,
        memberRole:
          memberIds && memberIds.length > 0
            ? memberRole || undefined
            : undefined,
        extra: {
          categoryName: name,
        },
      },
    },
    custom
  )

export const updateCategory = async (
  frontID: string,
  name: string,
  description: string,
  visible: boolean,
  iconBgColor: string,
  iconContent: string,
  custom?: CustomRequestOptions
) =>
  authRequest.patch<ResponseData<ResponseID>>(
    `categories/${frontID}`,
    {
      json: {
        name,
        description,
        visible,
        iconBgColor,
        iconContent,
        extra: {
          categoryName: name,
        },
      },
    },
    custom
  )

export const deleteCategory = async (
  frontID: string,
  name: string,
  deletedBy: string,
  custom?: CustomRequestOptions
) => {
  const params = new URLSearchParams()
  // params.set('deletedBy', deletedBy)
  // params.set('name', name)
  params.set(
    'extra',
    JSON.stringify({
      deletedBy,
      categoryName: name,
    })
  )

  return authRequest.delete<ResponseData<null>>(
    `categories/${frontID}`,
    { searchParams: params },
    custom
  )
}

export const checkCategoryExists = async (
  frontID: string,
  custom?: CustomRequestOptions
) => {
  const resp = await authRequest.get<ResponseData<CategoryExists>>(
    `categories/${frontID}/check_exists`,
    {},
    custom
  )
  if (!resp.code) {
    // console.log('exist resp: ', resp)
    return resp.data.exists
  }
  return false
}

export const toggleSubscribe = async (
  categoryId: string,
  custom?: CustomRequestOptions
) =>
  authRequest.post<ResponseData<Category>>(
    `categories/${categoryId}/toggle_subscribe`,
    {},
    custom
  )

export const acceptCategoryInvite = async (
  siteFrontId: string,
  categoryFrontId: string,
  code: string
): Promise<ResponseData<null>> =>
  authRequest.post<ResponseData<null>>(
    `sites/${siteFrontId}/categories/${categoryFrontId}/members/accept_invite`,
    {
      json: { code },
    }
  )
