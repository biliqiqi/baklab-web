import {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import Cropper, { Area } from 'react-easy-crop'

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

interface CropperProps {
  disabled?: boolean
  loading?: boolean
  btnText?: string
  onSuccess?: (data: string) => void
}

const BCropper = ({
  disabled = false,
  loading = false,
  btnText = '上传图片',
  onSuccess,
}: CropperProps) => {
  /* 'https://static.biliqiqi.net/eO_-WF8KXDNrLJWw_e_wBDPlhWsJAlID' */
  const [imgUrl, setImgUrl] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropperArea, setCropperArea] = useState<Area | null>(null)
  const [cropperAreaPixels, setCropperAreaPixels] = useState<Area | null>(null)
  const [showCropperDialog, setShowCropperDialog] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const cropperImgRef = useRef<HTMLImageElement | null>(null)

  const onCropperClose = () => {
    reset()
    setShowCropperDialog(false)
  }

  const reset = () => {
    setImgUrl('')
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    /* setCropperAreaPixels(null) */
    setCropperArea(null)
  }

  const onCropComplete = (area: Area, areaPixels: Area) => {
    /* console.log(area, areaPixels) */
    setCropperArea(() => ({ ...area }))
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

    const targetSize = 500

    img.onload = () => {
      canvas.width = targetSize
      canvas.height = targetSize

      /* ctx.beginPath()
       * ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2)
       * ctx.closePath()
       * ctx.clip() */

      ctx.drawImage(img, pX, pY, pWidth, pHeight, 0, 0, targetSize, targetSize)

      if (typeof onSuccess == 'function') {
        onSuccess(canvas.toDataURL('image/png', 1))
      }
      setShowCropperDialog(false)
      reset()
    }

    img.src = imgUrl
  }, [imgUrl, cropperArea])

  useEffect(() => {
    if (imgUrl) {
      setShowCropperDialog(true)
    }
  }, [imgUrl])

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

  return (
    <>
      <span className="relative inline-block">
        <Button
          size="sm"
          onClick={onShowCropperClick}
          disabled={disabled}
          className="min-w-[80px]"
        >
          {loading ? <BLoader /> : btnText}
        </Button>
        <Input
          disabled={disabled}
          type="file"
          onChange={onFileChange}
          placeholder="选择图片"
          title="选择图片"
          className="absolute left-0 top-0 w-full h-full opacity-0 z-10"
          style={{ opacity: 0 }}
        />
      </span>
      <Dialog open={showCropperDialog} onOpenChange={onCropperClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>裁剪图片</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>

          <div className="relative w-full h-[360px]">
            {showCropper && (
              <Cropper
                cropShape="round"
                showGrid={false}
                aspect={1}
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
          <input
            type="range"
            value={zoom}
            min={1}
            max={10}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => {
              setZoom(Number(e.target.value) || 0)
            }}
            className="zoom-range"
          />
          <canvas id="previewCanvas"></canvas>
          <div className="flex justify-between mt-2">
            <div></div>
            <div>
              <Button onClick={onCropConfirm}>确定</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default BCropper
