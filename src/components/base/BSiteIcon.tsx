import React, { SyntheticEvent, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export interface BSiteIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  logoUrl: string
  name?: string
  size?: number
  fontSize?: number
  showSiteName?: boolean
  border?: boolean
}

const BSiteIcon: React.FC<BSiteIconProps> = ({
  logoUrl,
  name,
  size = 30,
  fontSize = 16,
  className,
  showSiteName = false,
  border = false,
  ...props
}) => {
  const [imgComplete, setImgComplete] = useState(false)

  useEffect(() => {
    if (!logoUrl) return
    const img = new Image()

    img.onload = (ev: Event) => {
      const target = ev.target as HTMLImageElement
      setImgComplete(target.complete)
    }
    img.src = logoUrl
  }, [logoUrl])

  return (
    <span
      className={cn('inline-flex items-center align-middle', className)}
      title={name}
    >
      <span
        className={cn(
          `inline-flex flex-shrink-0 flex-grow-0 items-center justify-center rounded-full overflow-hidden bg-slate-300 text-center text-base leading-3`,
          border && `border-primary border-2`
        )}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
        {...props}
      >
        {imgComplete ? (
          <img className="w-max-full" src={logoUrl} alt={name} />
        ) : (
          name
        )}
      </span>
      {showSiteName && (
        <span
          className="inline-block ml-1 whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.2 }}
        >
          {name}
        </span>
      )}
    </span>
  )
}

export default BSiteIcon
