import { authRequest } from '@/lib/request'

import {
  Category,
  CategoryExists,
  CustomRequestOptions,
  ResponseData,
  ResponseID,
} from '@/types/types'

export const getCategoryList = async (custom?: CustomRequestOptions) =>
  authRequest.get<ResponseData<Category[] | null>>(`categories`, {}, custom)

export const getCategoryWithFrontId = async (
  frontId: string,
  custom?: CustomRequestOptions
) =>
  authRequest.get<ResponseData<Category>>(`categories/${frontId}`, {}, custom)

export const submitCategory = async (
  frontID: string,
  name: string,
  description: string,
  iconBgColor: string,
  iconContent: string,
  contentFormId: string,
  custom?: CustomRequestOptions
) =>
  authRequest.post<ResponseData<ResponseID>>(
    `categories`,
    {
      json: {
        frontID,
        name,
        description,
        iconBgColor,
        iconContent,
        contentFormId,
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
