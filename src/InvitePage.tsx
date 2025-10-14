import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { Button } from './components/ui/button'
import { Card } from './components/ui/card'

import BLoader from './components/base/BLoader'
import BSiteIcon from './components/base/BSiteIcon'

import { getInvite } from './api/invite-code'
import { acceptSiteInvite } from './api/site'
import { SINGUP_RETURN_COOKIE_NAME } from './constants/constants'
import { toSync } from './lib/fire-and-forget'
import {
  useAuthedUserStore,
  useCategorySelectionModalStore,
  useSiteStore,
} from './state/global'
import { InviteCode, Site } from './types/types'

export default function InvitePage() {
  const [site, setSite] = useState<Site | null>(null)
  const [inviteData, setInviteData] = useState<InviteCode | null>(null)
  const [acceptingInvite, setAcceptingInvite] = useState(false)
  const acceptedRef = useRef(false)
  const lastClickTimeRef = useRef(0)

  const { inviteCode } = useParams()
  const [searchParams] = useSearchParams()

  const navigate = useNavigate()

  const { t } = useTranslation()

  const { isLogined } = useAuthedUserStore(
    useShallow(({ isLogined }) => ({ isLogined }))
  )
  const { fetchSiteList } = useSiteStore(
    useShallow(({ fetchSiteList }) => ({ fetchSiteList }))
  )

  const { showCategorySelectionModal } = useCategorySelectionModalStore(
    useShallow(({ show }) => ({ showCategorySelectionModal: show }))
  )

  const expired = useMemo(
    () => (inviteData ? dayjs(inviteData.expiredAt).isBefore(dayjs()) : false),
    [inviteData]
  )

  const accepted = useMemo(() => searchParams.get('accepted'), [searchParams])

  const fetchInvite = toSync(
    useCallback(async () => {
      if (!inviteCode) return

      const {
        code,
        data: { site, invite },
      } = await getInvite(inviteCode)
      if (!code) {
        /* console.log('site: ', site) */
        if (site.currUserState.isMember) {
          navigate(`/z/${site.frontId}`, { replace: true })
        } else {
          setSite(() => site)
          setInviteData(() => invite)
        }
      }
    }, [inviteCode, navigate])
  )

  const acceptInvite = useCallback(async () => {
    try {
      if (!site || !inviteData) {
        throw new Error('lack of site data and invite data')
      }

      if (site && site.currUserState.isMember) {
        navigate(`/z/${site.frontId}`, { replace: true })
        return
      }

      if (acceptingInvite || acceptedRef.current) {
        return
      }

      setAcceptingInvite(true)
      acceptedRef.current = true

      const { code } = await acceptSiteInvite(site.frontId, inviteData.code)
      if (!code) {
        await fetchSiteList()
        showCategorySelectionModal(site.frontId)
        navigate(`/z/${site.frontId}`, { replace: true })
      }
    } catch (err) {
      console.error('accept invite error: ', err)
      acceptedRef.current = false
    } finally {
      setAcceptingInvite(false)
    }
  }, [
    site,
    inviteData,
    acceptingInvite,
    navigate,
    fetchSiteList,
    showCategorySelectionModal,
  ])

  const onAcceptInviteClick = useCallback(() => {
    const now = Date.now()
    if (now - lastClickTimeRef.current < 1000) {
      return
    }
    lastClickTimeRef.current = now

    if (acceptingInvite || acceptedRef.current) {
      return
    }

    const currUrl = new URL(location.href)
    currUrl.searchParams.set('accepted', '1')

    if (!isLogined()) {
      document.cookie = `${SINGUP_RETURN_COOKIE_NAME}=${encodeURIComponent(currUrl.toString())};path=/`
      navigate(`/signin?return=${encodeURIComponent(currUrl.toString())}`, {
        replace: true,
      })
      return
    } else {
      return acceptInvite()
    }
  }, [acceptInvite, isLogined, navigate, acceptingInvite])

  useEffect(() => {
    fetchInvite()
  }, [])

  useEffect(() => {
    if (
      inviteCode &&
      inviteData &&
      isLogined() &&
      accepted == '1' &&
      !acceptingInvite &&
      !acceptedRef.current
    ) {
      toSync(getInvite, ({ code, data: { invite, site } }) => {
        if (!code && invite && site && !acceptedRef.current) {
          if (site.currUserState.isMember) {
            navigate(`/z/${site.frontId}`, { replace: true })
          } else {
            toSync(acceptInvite)()
          }
        }
      })(inviteCode)
    }
  }, [
    inviteCode,
    inviteData,
    expired,
    isLogined,
    accepted,
    acceptInvite,
    navigate,
  ])

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="flex flex-col items-center w-[300px] p-4">
        {site && !expired ? (
          <div className="text-center mb-4">
            <BSiteIcon
              name={site.name}
              logoUrl={site.logoUrl}
              size={54}
              vertical
            />
            <div className="text-sm text-gray-500 mb-2">
              {t('inviteDescribe', { name: inviteData?.creatorName })}
            </div>
            <div>{site.name}</div>
            <div className="mt-1 text-sm text-gray-500">
              {t('onlineCount', { num: site.onlineCount })} /{' '}
              {t('memberCount', { num: site.memberCount })}
            </div>
          </div>
        ) : expired ? (
          <div className="mb-2">{t('invitationExpired')}</div>
        ) : (
          <div className="mb-2">{t('invitationDataRequired')}</div>
        )}
        {site && !expired && (
          <Button
            onClick={onAcceptInviteClick}
            disabled={acceptingInvite || acceptedRef.current}
          >
            {acceptingInvite ? <BLoader /> : t('acceptInvitation')}
          </Button>
        )}
      </Card>
    </div>
  )
}
