import { authRequest } from '@/lib/request'

import {
  Category,
  CategoryExists,
  ResponseData,
  ResponseID,
} from '@/types/types'

export const getCategoryList = async () =>
  authRequest.get<ResponseData<Category[]>>(`categories`)

export const submitCategory = async (
  frontID: string,
  name: string,
  description: string
) =>
  authRequest.post<ResponseData<ResponseID>>(`categories`, {
    json: {
      frontID,
      name,
      description,
    },
  })

export const updateCategory = async (
  frontID: string,
  name: string,
  description: string
) =>
  authRequest.patch<ResponseData<ResponseID>>(`categories/${frontID}`, {
    json: {
      name,
      description,
    },
  })

export const deleteCategory = async (frontID: string) =>
  authRequest.delete<ResponseData<null>>(`categories/${frontID}`)

export const checkCategoryExists = async (frontID: string) => {
  const resp = await authRequest.get<ResponseData<CategoryExists>>(
    `categories/${frontID}/check_exists`
  )
  if (!resp.code) {
    // console.log('exist resp: ', resp)
    return resp.data.exists
  }
  return false
}
