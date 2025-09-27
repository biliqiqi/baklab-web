import { STATIC_HOST } from '@/constants/constants'
import { useAuthedUserStore } from '@/state/global'
import { UploadResponse } from '@/types/types'

export const uploadFileBase64 = async (dataUrl: string) => {
  try {
    const [header, base64Data] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
    const binary = atob(base64Data)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i)
    }
    const blob = new Blob([array], { type: mime })

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
