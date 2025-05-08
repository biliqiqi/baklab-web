import {
  ChangeEvent,
  MouseEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import Cropper, { Area, CropperProps } from 'react-easy-crop'
import { useTranslation } from 'react-i18next'

import i18n from '@/i18n'
import { StringFn } from '@/types/types'

import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import BLoader from './BLoader'

export interface BCropperProps extends Partial<CropperProps> {
  disabled?: boolean
  loading?: boolean
  btnText?: string | StringFn
  targetWidth?: number
  targetHeight?: number
  settingAspect?: boolean
  onSuccess?: (data: string) => void
}

export interface BCropperObj {
  fileInputElement: HTMLInputElement | null
}

interface ImageSize {
  width: number
  height: number
}

const BCropper = forwardRef<BCropperObj, BCropperProps>(
  (
    {
      disabled = false,
      loading = false,
      settingAspect = false,
      btnText = () => i18n.t('uploadImage'),
      targetWidth = 500,
      targetHeight = 500,
      onSuccess,
      aspect = 1,
      cropShape = 'round',
      ...props
    },
    ref
  ) => {
    /* 'https://static.biliqiqi.net/eO_-WF8KXDNrLJWw_e_wBDPlhWsJAlID' */
    const [imgUrl, setImgUrl] = useState('')
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [customAspect, setCustomAspect] = useState(aspect)

    const { t } = useTranslation()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [computedSize, setComputedSize] = useState<ImageSize>({
      width: targetWidth,
      height: targetHeight,
    })
    /* const [cropperArea, setCropperArea] = useState<Area | null>(null) */
    const [cropperAreaPixels, setCropperAreaPixels] = useState<Area | null>(
      null
    )
    const [showCropperDialog, setShowCropperDialog] = useState(false)
    const [showCropper, setShowCropper] = useState(false)
    const cropperImgRef = useRef<HTMLImageElement | null>(null)

    useImperativeHandle(ref, () => ({ fileInputElement: fileInputRef.current }))

    const onCropperClose = () => {
      reset()
      setShowCropperDialog(false)
    }

    const reset = useCallback(() => {
      setImgUrl('')
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCustomAspect(aspect)
      /* setCropperAreaPixels(null) */
      /* setCropperArea(null) */
    }, [aspect])

    const onCropComplete = (_area: Area, areaPixels: Area) => {
      /* console.log(area, areaPixels) */
      /* setCropperArea(() => ({ ...area })) */
      setCropperAreaPixels(() => ({ ...areaPixels }))
    }

    const onShowCropperClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      /* setShowCropperDialog(true) */
    }

    const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
      /* console.log('file: ', e.currentTarget.files) */
      if (!e.currentTarget.files?.length) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const url = (e.target?.result as string) || ''
        /* console.log('img url: ', url) */
        setImgUrl(url || '')
      }

      reader.readAsDataURL(e.currentTarget.files[0])
    }

    const onCropConfirm = useCallback(() => {
      /* console.log('img url: ', imgUrl)
       * console.log('cropper area: ', cropperArea)
       * console.log('cropper img ref: ', cropperImgRef.current) */

      if (!imgUrl || !cropperAreaPixels || !cropperImgRef.current) {
        throw new Error('image data and cropper area data is required')
      }

      const { x: pX, y: pY, width: pWidth, height: pHeight } = cropperAreaPixels
      const canvas = document.createElement('canvas')

      const ctx = canvas.getContext('2d')
      const img = new Image()

      if (!ctx) {
        throw new Error('get canvas context failed')
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      img.onload = () => {
        canvas.width = computedSize.width
        canvas.height = computedSize.height

        ctx.drawImage(
          img,
          pX,
          pY,
          pWidth,
          pHeight,
          0,
          0,
          computedSize.width,
          computedSize.height
        )

        if (typeof onSuccess == 'function') {
          onSuccess(canvas.toDataURL('image/png', 1))
        }
        setShowCropperDialog(false)
        reset()
      }

      img.src = imgUrl
    }, [imgUrl, cropperAreaPixels, onSuccess, computedSize, reset])

    useEffect(() => {
      if (imgUrl) {
        setShowCropperDialog(true)
      }
    }, [imgUrl])

    useEffect(() => {
      let computedHeight = targetWidth / customAspect
      let computedWidth = targetWidth

      if (customAspect < 1) {
        computedHeight = targetHeight
        computedWidth = targetHeight * customAspect
      }

      setComputedSize((state) => ({
        ...state,
        width: computedWidth,
        height: computedHeight,
      }))
    }, [targetWidth, targetHeight, customAspect])

    useEffect(() => {
      let timer: NodeJS.Timeout | null = null
      if (showCropperDialog) {
        timer = setTimeout(() => {
          /* console.log('show cropper!') */
          setShowCropper(true)
        }, 500)
      } else {
        setShowCropper(false)
      }

      return () => {
        if (timer) {
          clearTimeout(timer)
        }
      }
    }, [showCropperDialog])

    /* console.log('zoom: ', zoom)
     * console.log('aspect: ', customAspect) */

    return (
      <>
        <span className="relative inline-block">
          <Button
            size="sm"
            onClick={onShowCropperClick}
            disabled={disabled}
            className="min-w-[80px]"
          >
            {loading ? (
              <BLoader />
            ) : typeof btnText == 'function' ? (
              btnText()
            ) : (
              btnText
            )}
          </Button>
          <Input
            disabled={disabled}
            type="file"
            onChange={onFileChange}
            placeholder={t('selectImage')}
            title={t('selectImage')}
            className="absolute left-0 top-0 w-full h-full opacity-0 z-10"
            style={{ opacity: 0 }}
            ref={fileInputRef}
          />
        </span>
        <Dialog open={showCropperDialog} onOpenChange={onCropperClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('cropImage')}</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>

            <div className="relative w-full h-[360px]">
              {showCropper && (
                <Cropper
                  cropShape={cropShape}
                  aspect={customAspect}
                  {...props}
                  showGrid={false}
                  image={imgUrl}
                  crop={crop}
                  zoom={zoom}
                  setImageRef={(imgRef) => {
                    cropperImgRef.current = imgRef.current
                  }}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <span>{t('zoom')}：</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={10}
                step={0.1}
                autoComplete="false"
                className="md:w-[380px] mr-1"
                aria-labelledby="Zoom"
                onChange={(e) => {
                  e.preventDefault()
                  setZoom(Number(e.target.value) || 0)
                }}
              />
              <span>{Number(zoom).toFixed(1)}</span>
            </div>
            {settingAspect && (
              <div className="flex items-center text-sm text-gray-500">
                <span>{t('aspect')}：</span>
                <input
                  type="range"
                  value={customAspect}
                  min={0.1}
                  max={10}
                  step={0.01}
                  autoComplete="false"
                  className="md:w-[380px] mr-1"
                  aria-labelledby="Aspect"
                  onChange={(e) => {
                    e.preventDefault()
                    setCustomAspect(Number(e.target.value) || 0.5)
                  }}
                />
                <span>{Number(customAspect).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between mt-2">
              <div></div>
              <div>
                <Button onClick={onCropConfirm}>{t('confirm')}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }
)

export default BCropper
