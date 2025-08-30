import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Separator } from './components/ui/separator'

import BAvatar from './components/base/BAvatar'
import BSiteIcon from './components/base/BSiteIcon'

import { authorizeOAuth, handleAuthorizeConfirm } from './api/oauth'
import {
  NAV_HEIGHT,
  PLATFORM_NAME,
  SITE_LOGO_IMAGE,
} from './constants/constants'
import useDocumentTitle from './hooks/use-page-title'
import { useAuthedUserStore, useLoading } from './state/global'
import { OAuthAuthorizeResponse } from './types/oauth'

export default function OAuthAuthorizePage() {
  const [searchParams] = useSearchParams()
  const [authData, setAuthData] = useState<OAuthAuthorizeResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const navigate = useNavigate()
  const location = useLocation()
  const { setLoading } = useLoading()
  const { t } = useTranslation()
  const { currUsername } = useAuthedUserStore(
    useShallow(({ username }) => ({ currUsername: username }))
  )

  const responseType = searchParams.get('response_type')
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const scope = searchParams.get('scope')
  const state = searchParams.get('state')

  useDocumentTitle(t('oauthAuthorization'))

  const handleAuthorization = useCallback(async () => {
    // 检查必要参数
    if (!responseType || !clientId || !redirectUri) {
      setError(t('oauthInvalidRequest'))
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await authorizeOAuth({
        response_type: responseType,
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope || undefined,
        state: state || undefined,
      })

      if (response.code) {
        setError(t('oauthError'))
        return
      }

      const { data } = response

      // 如果有错误，显示错误信息并重定向
      if (data.error) {
        setError(data.error_description || data.error)
        if (data.redirect_url) {
          redirectTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              window.location.href = data.redirect_url!
            }
          }, 3000)
        }
        return
      }

      // 如果已经授权，直接重定向
      if (data.success && data.redirect_url) {
        window.location.href = data.redirect_url
        return
      }

      // 需要用户授权确认
      if (data.needsAuthorization) {
        setAuthData(data)
      } else {
        // 如果没有明确的授权需求，可能是服务器错误
        setError(t('oauthError'))
      }
    } catch (err) {
      console.error('OAuth authorization error: ', err)
      setError(t('oauthError'))
    } finally {
      setLoading(false)
    }
  }, [responseType, clientId, redirectUri, scope, state, setLoading, t])

  const handleConfirm = useCallback(
    async (approved: boolean) => {
      if (!clientId || !redirectUri || submitting) return

      try {
        setSubmitting(true)
        const response = await handleAuthorizeConfirm({
          client_id: clientId,
          redirect_uri: redirectUri,
          state: state || undefined,
          approved,
        })

        if (response.code) {
          setError(t('oauthError'))
          return
        }

        const { data } = response
        if (data.redirect_url) {
          window.location.href = data.redirect_url
        }
      } catch (err) {
        console.error('OAuth confirm error: ', err)
        setError(t('oauthError'))
      } finally {
        setSubmitting(false)
      }
    },
    [clientId, redirectUri, state, submitting, t]
  )

  // 初始化OAuth授权流程
  useEffect(() => {
    // 检查必要参数
    if (!responseType || !clientId || !redirectUri) {
      setError(t('oauthInvalidRequest'))
      setLoading(false)
      return
    }

    // 路由已经保证用户已登录，直接处理授权
    handleAuthorization().catch((err) => {
      console.error('Authorization initialization error:', err)
      setError(t('oauthError'))
    })
  }, [
    handleAuthorization,
    setError,
    setLoading,
    t,
    responseType,
    clientId,
    redirectUri,
  ])

  // 清理定时器和标记组件卸载
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
        redirectTimerRef.current = null
      }
    }
  }, [location])

  // 简化的导航组件
  const renderNav = () => (
    <div
      className="flex justify-between items-center py-2 px-4 bg-white dark:bg-slate-900 sticky top-0 z-10 border-b-2 shadow-sm"
      style={{ height: `${NAV_HEIGHT - 2}px` }}
    >
      <Link 
        className="flex-shrink-0 font-bold text-2xl leading-3" 
        to="/"
        onClick={() => {
          mountedRef.current = false
        }}
      >
        <BSiteIcon
          className="max-w-[180px]"
          logoUrl={SITE_LOGO_IMAGE}
          name={PLATFORM_NAME}
          size={42}
        />
      </Link>

      <div className="flex items-center">
        <BAvatar username={currUsername} className="cursor-pointer" size={32} />
      </div>
    </div>
  )

  // 路由已经保证用户已登录，无需再检查登录状态

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {renderNav()}
        <div className="flex justify-center py-8 px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600 text-base">
                {t('oauthError')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground mb-4">{error}</p>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    mountedRef.current = false
                    navigate('/')
                  }}
                >
                  {t('backToHome')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 如果没有授权数据且没有错误，显示加载状态
  if (!authData?.needsAuthorization && !error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {renderNav()}
        <div className="flex justify-center py-8 px-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t('processing')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 如果没有需要授权的数据，说明出现了问题
  if (!authData?.needsAuthorization) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {renderNav()}
        <div className="flex justify-center py-8 px-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-red-600 text-base">
                {t('oauthError')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground mb-4">
                {error || t('oauthInvalidRequest')}
              </p>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    mountedRef.current = false
                    navigate('/')
                  }}
                >
                  {t('backToHome')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { client, user } = authData

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {renderNav()}
      <div className="flex justify-center py-8 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Badge variant="outline" className="text-sm">
                {PLATFORM_NAME}
              </Badge>
            </div>
            <CardTitle className="text-xl">
              {t('oauthAuthorizeTitle')}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 应用信息 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {client?.logoURL && (
                  <img
                    src={client.logoURL}
                    alt={client.name}
                    className="w-12 h-12 rounded-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                )}
                <div>
                  <h3 className="font-semibold text-lg">{client?.name}</h3>
                  {client?.description && (
                    <p className="text-sm text-muted-foreground">
                      {client.description}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="text-sm">
                <p className="mb-2">
                  <strong>{client?.name}</strong> {t('oauthRequestAccess')}
                </p>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t('oauthWillHaveAccess')}:
                  </p>
                  <ul className="text-xs space-y-1">
                    <li>• {t('oauthAccessProfile')}</li>
                    <li>• {t('oauthAccessBasicInfo')}</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* 用户信息 */}
            <div className="text-sm">
              <p className="text-muted-foreground mb-2">
                {t('oauthSignedInAs')}:
              </p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{user?.username}</Badge>
              </div>
            </div>

            <Separator />

            {/* 操作按钮 */}
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => handleConfirm(true)}
                disabled={submitting}
              >
                {submitting ? t('processing') : t('oauthAuthorize')}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleConfirm(false)}
                disabled={submitting}
              >
                {t('cancel')}
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground">
              {t('oauthAuthorizationNote')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
