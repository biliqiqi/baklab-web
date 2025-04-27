import ClipboardJS from 'clipboard'
import { CheckIcon } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { timeAgo } from '@/lib/dayjs-custom'
import { cn } from '@/lib/utils'

import { FRONT_END_HOST } from '@/constants/constants'
import { InviteCode } from '@/types/types'

import { Button } from './ui/button'
import { Input } from './ui/input'

interface InviteProps {
  data: InviteCode | null
  loading: boolean
  container: HTMLElement | null
}

const Invite: React.FC<InviteProps> = ({ data, loading, container }) => {
  const [copyInviteSuccess, setCopyInviteSuccess] = useState(false)

  const copyInviteBtnRef = useRef<HTMLButtonElement | null>(null)
  const clipboardRef = useRef<ClipboardJS | null>(null)

  const { t } = useTranslation()

  useEffect(() => {
    let timer: number | undefined

    if (container) {
      timer = setTimeout(() => {
        if (
          copyInviteBtnRef.current &&
          !clipboardRef.current &&
          container &&
          data
        ) {
          clipboardRef.current = new ClipboardJS(copyInviteBtnRef.current, {
            container,
          })

          clipboardRef.current.on('success', (e) => {
            setCopyInviteSuccess(true)
            e.clearSelection()
          })
        }
      }, 500) as unknown as number
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }

      if (container && clipboardRef.current) {
        clipboardRef.current.destroy()
        clipboardRef.current = null
      }
    }
  }, [container, data])

  return (
    <>
      <div className="relative">
        <Input
          readOnly
          value={
            loading || !data
              ? t('generattingInviteLink')
              : `${FRONT_END_HOST}/invite/${data.code}`
          }
          className={cn('pr-[54px]', loading && 'text-gray-500')}
        />
        {data && (
          <div className="my-2 text-sm text-gray-500">
            {t('inviteLinkExpiration', { timeAgo: timeAgo(data.expiredAt) })}
          </div>
        )}
        <Button
          size={'sm'}
          className="absolute top-0 right-0 h-[40px] rounded-sm rounded-l-none"
          data-clipboard-text={`${FRONT_END_HOST}/invite/${data?.code || ''}`}
          ref={copyInviteBtnRef}
          disabled={!data}
        >
          {t('copy')}
        </Button>
      </div>
      <div className="flex justify-center py-4">
        {copyInviteSuccess && (
          <span className="inline-block h-[26px]">
            <CheckIcon className="inline-block mr-2 text-primary" />
            <span>{t('copySuccess')}</span>
          </span>
        )}
      </div>
    </>
  )
}

export default Invite
