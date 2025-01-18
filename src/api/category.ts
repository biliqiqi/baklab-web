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

export const submitCategory = async (
  frontID: string,
  name: string,
  description: string,
  siteId: number,
  custom?: CustomRequestOptions
) =>
  authRequest.post<ResponseData<ResponseID>>(
    `categories`,
    {
      json: {
        frontID,
        name,
        description,
        siteId,
      },
    },
    custom
  )

export const updateCategory = async (
  frontID: string,
  name: string,
  description: string,
  custom?: CustomRequestOptions
) =>
  authRequest.patch<ResponseData<ResponseID>>(
    `categories/${frontID}`,
    {
      json: {
        name,
        description,
      },
    },
    custom
  )

export const deleteCategory = async (
  frontID: string,
  custom?: CustomRequestOptions
) => authRequest.delete<ResponseData<null>>(`categories/${frontID}`, {}, custom)

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
