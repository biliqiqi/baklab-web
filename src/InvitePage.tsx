import { useCallback, useEffect, useState } from 'react'
import { redirect, useNavigate, useParams } from 'react-router-dom'

import { Button } from './components/ui/button'
import { Card } from './components/ui/card'

import BLoader from './components/base/BLoader'
import BSiteIcon from './components/base/BSiteIcon'

import { getInvite } from './api/invite-code'
import { acceptSiteInvite } from './api/site'
import { toSync } from './lib/fire-and-forget'
import { getCookie } from './lib/utils'
import { useAuthedUserStore, useSiteStore } from './state/global'
import { InviteCode, Site } from './types/types'

export default function InvitePage() {
  const [site, setSite] = useState<Site | null>(null)
  const [inviteData, setInviteData] = useState<InviteCode | null>(null)
  const [loading, setLoading] = useState(false)
  const { inviteCode } = useParams()

  const navigate = useNavigate()

  const authStore = useAuthedUserStore()
  const siteStore = useSiteStore()

  /* console.log('invite code: ', inviteCode) */

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
          setSite(site)
          setInviteData(invite)
        }
      }
    }, [inviteCode, navigate])
  )

  const acceptInvite = useCallback(async () => {
    if (!authStore.isLogined()) {
      document.cookie = `invite_accept:${inviteCode}=1;path=/`
      navigate(`/signin?return=${encodeURIComponent(location.href)}`, {
        replace: true,
      })
      return
    }
    try {
      if (!site || !inviteData) {
        throw new Error('lack of site data and invite data')
      }

      if (loading) {
        throw new Error('prevent duplicate request')
      }

      setLoading(true)
      const { code } = await acceptSiteInvite(site.frontId, inviteData.code)
      if (!code) {
        navigate(`/${site.frontId}`, { replace: true })
        await siteStore.fetchSiteList()
      }
    } catch (err) {
      console.error('accept invite error: ', err)
    } finally {
      setLoading(false)
    }
  }, [site, inviteData, loading, inviteCode, navigate, authStore, siteStore])

  const onAcceptInviteClick = acceptInvite

  useEffect(() => {
    fetchInvite()
  }, [inviteCode])

  useEffect(() => {
    console.log('cookie: ', getCookie(`invite_accept:${inviteCode}`))
    if (getCookie(`invite_accept:${inviteCode}`) == '1') {
      toSync(acceptInvite)()
    }
  }, [site, inviteData, inviteCode, acceptInvite])

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="flex flex-col items-center w-[300px] p-4">
        {site ? (
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
              300 在线 / 2000 成员
            </div>
          </div>
        ) : (
          !loading && <div className="mb-2">缺少邀请数据</div>
        )}
        <Button onClick={onAcceptInviteClick} disabled={loading || !site}>
          {loading ? <BLoader /> : '接受邀请'}
        </Button>
      </Card>
    </div>
  )
}
