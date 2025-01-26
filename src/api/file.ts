import { UploadResponse } from '@/types/types'

const STATIC_HOST = `https://static.biliqiqi.net`
const UPLOAD_AUTH_TOKEN = '2e9353af-b210-40ae-baa4-76b220296aec'

export const uploadFileBase64 = async (dataUrl: string) => {
  try {
    const resp = await fetch(dataUrl)
    const blob = await resp.blob()

    const formData = new FormData()

    formData.append('file', blob)

    const response = await fetch(STATIC_HOST, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Custom-Auth-Key': UPLOAD_AUTH_TOKEN,
      },
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
