import { STATIC_HOST } from '@/constants/constants'
import { useAuthedUserStore } from '@/state/global'
import { UploadResponse } from '@/types/types'

export const uploadFileBase64 = async (dataUrl: string) => {
  try {
    const resp = await fetch(dataUrl)
    const blob = await resp.blob()

    const formData = new FormData()

    formData.append('file', blob)

    const authToken = useAuthedUserStore.getState().authToken
    const headers: Record<string, string> = {}

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(STATIC_HOST, {
      method: 'POST',
      body: formData,
      headers,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const data = (await response.json()) as UploadResponse
    return data
  } catch (err) {
    console.error('upload file error: ', err)
  }
}
