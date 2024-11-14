import { authRequest } from '@/lib/request'
import { ResponseData } from '@/types/types'

interface ArticleSubmitResponse {
  id: string
}

export const submitArticle = (
  title: string,
  categoryId: string,
  link?: string,
  content?: string
): Promise<ResponseData<ArticleSubmitResponse>> =>
  authRequest
    .post(`articles/submit`, {
      json: {
        title,
        category: categoryId,
        link,
        content,
      },
    })
    .json()
