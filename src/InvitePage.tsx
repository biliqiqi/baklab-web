import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useAuthedUserStore, useSiteStore } from './state/global'
import { InviteCode, Site } from './types/types'

export default function InvitePage() {
  const [site, setSite] = useState<Site | null>(null)
  const [inviteData, setInviteData] = useState<InviteCode | null>(null)
  const [loading, setLoading] = useState(false)

  const { inviteCode } = useParams()
  const [searchParams] = useSearchParams()

  const navigate = useNavigate()

  const { isLogined } = useAuthedUserStore(
    useShallow(({ isLogined }) => ({ isLogined }))
  )
  const { fetchSiteList } = useSiteStore(
    useShallow(({ fetchSiteList }) => ({ fetchSiteList }))
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
          navigate(`/${site.frontId}`, { replace: true })
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
        navigate(`/${site.frontId}`, { replace: true })
        return
      }

      if (loading) {
        throw new Error('prevent duplicate request')
      }

      setLoading(true)
      const { code } = await acceptSiteInvite(site.frontId, inviteData.code)
      if (!code) {
        navigate(`/${site.frontId}`, { replace: true })
        await fetchSiteList()
      }
    } catch (err) {
      console.error('accept invite error: ', err)
    } finally {
      setLoading(false)
    }
  }, [site, inviteData, loading, navigate, fetchSiteList])

  const onAcceptInviteClick = useCallback(() => {
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
  }, [acceptInvite, isLogined, navigate])

  useEffect(() => {
    fetchInvite()
  }, [])

  useEffect(() => {
    if (
      inviteCode &&
      inviteData &&
      isLogined() &&
      accepted == '1' &&
      !loading
    ) {
      toSync(getInvite, ({ code, data: { invite, site } }) => {
        if (!code && invite && site) {
          if (site.currUserState.isMember) {
            navigate(`/${site.frontId}`, { replace: true })
          } else {
            toSync(acceptInvite)()
          }
        }
      })(inviteCode)
    }
  }, [inviteCode, inviteData, expired, isLogined, accepted, loading, navigate])

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
              {inviteData?.creatorName} 邀请你加入
            </div>
            <div>{site.name}</div>
            <div className="mt-1 text-sm text-gray-500">
              {site.onlineCount} 在线 / {site.memberCount} 成员
            </div>
          </div>
        ) : expired ? (
          <div className="mb-2">邀请已过期</div>
        ) : (
          !loading && <div className="mb-2">缺少邀请数据</div>
        )}
        {site && !expired && (
          <Button onClick={onAcceptInviteClick} disabled={loading}>
            {loading ? <BLoader /> : '接受邀请'}
          </Button>
        )}
      </Card>
    </div>
  )
}
