import { useQuery } from '@tanstack/react-query'
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import sanitize from 'sanitize-html'
import { useDebouncedCallback } from 'use-debounce'
import { useShallow } from 'zustand/react/shallow'

import { timeAgo } from '@/lib/dayjs-custom'
import { cn } from '@/lib/utils'

import { searchArticles } from '@/api/article'
import SITE_LOGO_IMAGE from '@/assets/logo.png'
import { useRem2PxNum } from '@/hooks/use-rem-num'
import { useSiteFrontId } from '@/hooks/use-site-front-id'
import { useContextStore, useSiteStore } from '@/state/global'
import { Article, Site } from '@/types/types'

import BLoader from './base/BLoader'
import BSiteIcon from './base/BSiteIcon'
import SiteLink from './base/SiteLink'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select'

const MIN_KEYWORD_LENGTH = 2
const ALL_SITES_OPTION = '__all_sites__'
const SEARCH_SNIPPET_SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: ['em', 'strong', 'mark', 'span', 'p', 'br'],
  allowedAttributes: {
    span: ['class'],
    p: ['class'],
  },
}

type SearchState = 'idle' | 'loading' | 'success' | 'error'

interface ArticleSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ArticleSearchDialog = ({
  open,
  onOpenChange,
}: ArticleSearchDialogProps) => {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [keywords, setKeywords] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [showContent, setShowContent] = useState(false)
  const [selectedSite, setSelectedSite] = useState<string>(ALL_SITES_OPTION)
  const [activeResultIndex, setActiveResultIndex] = useState(-1)
  const [siteSelectOpen, setSiteSelectOpen] = useState(false)
  const rem2pxNum = useRem2PxNum()
  const currentSiteFrontId = useSiteFrontId()
  const selectIconSize = rem2pxNum(2)
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const selectContainerRef = useRef<HTMLDivElement | null>(null)

  const handleDialogKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape') return
      if (!siteSelectOpen) return
      if (
        selectContainerRef.current &&
        selectContainerRef.current.contains(event.target as Node)
      ) {
        event.stopPropagation()
        setSiteSelectOpen(false)
      }
    },
    [siteSelectOpen]
  )

  const { siteList, fetchSiteList, site } = useSiteStore(
    useShallow(({ siteList, fetchSiteList, site }) => ({
      siteList,
      fetchSiteList,
      site,
    }))
  )
  const { contextSite, isSingleSite } = useContextStore(
    useShallow((state) => ({
      contextSite: state.site,
      isSingleSite: state.isSingleSite,
    }))
  )

  const fallbackSites = useMemo(() => {
    const values: Site[] = []
    if (site) {
      values.push(site)
    }
    if (
      contextSite &&
      !values.some((item) => item.frontId === contextSite.frontId)
    ) {
      values.push(contextSite)
    }
    return values
  }, [site, contextSite])

  const resolvedSiteFilter = useMemo(
    () => (selectedSite === ALL_SITES_OPTION ? undefined : selectedSite),
    [selectedSite]
  )

  const siteOptions = useMemo(() => {
    const baseOptions = siteList && siteList.length > 0 ? [...siteList] : []

    fallbackSites.forEach((candidate) => {
      if (!baseOptions.some((item) => item.frontId === candidate.frontId)) {
        baseOptions.push(candidate)
      }
    })

    return baseOptions
  }, [siteList, fallbackSites])

  const selectedSiteOption = useMemo(() => {
    if (selectedSite === ALL_SITES_OPTION) {
      return null
    }

    const matchedOption =
      siteOptions.find((site) => site.frontId === selectedSite) ||
      fallbackSites.find((site) => site.frontId === selectedSite) ||
      null

    return matchedOption
  }, [selectedSite, siteOptions, fallbackSites])

  const trimmedKeywords = keywords.trim()
  const shouldSearch = trimmedKeywords.length >= MIN_KEYWORD_LENGTH

  const { refetch: fetchArticles } = useQuery({
    queryKey: ['searchArticles', trimmedKeywords, resolvedSiteFilter],
    queryFn: async () => {
      if (trimmedKeywords.length < MIN_KEYWORD_LENGTH) {
        setArticles([])
        setSearchState('idle')
        return null
      }

      setSearchState('loading')
      try {
        const resp = await searchArticles(
          trimmedKeywords,
          1,
          8,
          resolvedSiteFilter
        )
        setArticles(resp.data.articles ?? [])
        setSearchState('success')
        return resp.data.articles ?? []
      } catch (err) {
        console.error('search articles failed: ', err)
        setArticles([])
        setSearchState('error')
        return null
      }
    },
    enabled: shouldSearch && open,
  })

  const debouncedSearch = useDebouncedCallback(() => {
    void fetchArticles()
  }, 400)

  const showDropdown = useMemo(
    () =>
      keywords.trim().length >= MIN_KEYWORD_LENGTH || searchState === 'loading',
    [keywords, searchState]
  )

  const focusResultItem = useCallback(
    (index: number) => {
      if (index < 0) {
        setActiveResultIndex(-1)
        inputRef.current?.focus()
        return
      }

      const maxIndex = articles.length - 1
      if (maxIndex < 0) return

      const clamped = Math.max(0, Math.min(index, maxIndex))
      setActiveResultIndex(clamped)
      requestAnimationFrame(() => {
        const target = resultRefs.current[clamped]
        target?.focus()
        target?.scrollIntoView({ block: 'nearest' })
      })
    },
    [articles.length]
  )

  const moveResultFocus = useCallback(
    (delta: number) => {
      if (!articles.length) return
      const nextIndex =
        activeResultIndex === -1
          ? delta > 0
            ? 0
            : articles.length - 1
          : (activeResultIndex + delta + articles.length) % articles.length
      focusResultItem(nextIndex)
    },
    [activeResultIndex, articles.length, focusResultItem]
  )

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 80)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (siteSelectOpen) {
          return
        }
        if (
          selectContainerRef.current &&
          selectContainerRef.current.contains(event.target as Node)
        ) {
          return
        }
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange, siteSelectOpen])

  useEffect(() => {
    if (open) return
    setKeywords('')
    setArticles([])
    setSearchState('idle')
    setSelectedSite(ALL_SITES_OPTION)
    setActiveResultIndex(-1)
    debouncedSearch.cancel()
  }, [open, debouncedSearch])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const raf = requestAnimationFrame(() => setShowContent(true))
    return () => {
      cancelAnimationFrame(raf)
      setShowContent(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    if (trimmedKeywords.length >= MIN_KEYWORD_LENGTH) {
      debouncedSearch()
    } else {
      debouncedSearch.cancel()
      setArticles([])
      setSearchState('idle')
    }
  }, [keywords, open, debouncedSearch, trimmedKeywords])

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  useEffect(() => {
    if (siteList === null) {
      void fetchSiteList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteList])

  useEffect(() => {
    if (!open) return
    if (!currentSiteFrontId) return
    setSelectedSite(currentSiteFrontId)
  }, [open, currentSiteFrontId])

  useEffect(() => {
    resultRefs.current = []
    setActiveResultIndex(-1)
  }, [articles])

  useEffect(() => {
    if (!open) {
      setSiteSelectOpen(false)
    }
  }, [open])

  useEffect(() => {
    if (!siteSelectOpen) return
    const handleSelectEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      event.preventDefault()
      setSiteSelectOpen(false)
    }

    window.addEventListener('keydown', handleSelectEscape, true)
    return () => {
      window.removeEventListener('keydown', handleSelectEscape, true)
    }
  }, [siteSelectOpen])

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || articles.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveResultFocus(1)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveResultFocus(-1)
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        focusResultItem(0)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        focusResultItem(articles.length - 1)
      }
    },
    [showDropdown, articles.length, moveResultFocus, focusResultItem]
  )

  const handleResultKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onOpenChange(false)
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveResultFocus(1)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (index === 0) {
          focusResultItem(-1)
        } else {
          moveResultFocus(-1)
        }
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        focusResultItem(0)
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        focusResultItem(articles.length - 1)
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        const target = resultRefs.current[index]
        if (target?.href) {
          window.open(target.href, '_blank', 'noopener')
        }
      }
    },
    [moveResultFocus, focusResultItem, onOpenChange, articles.length]
  )

  const renderDropdownContent = () => {
    if (searchState === 'loading') {
      return (
        <div className="flex justify-center py-8">
          <BLoader className="w-[22px] h-[22px]" />
        </div>
      )
    }

    if (searchState === 'error') {
      return (
        <div className="py-6 px-4 text-sm text-center text-muted-foreground">
          {t('searchFailed')}
        </div>
      )
    }

    if (searchState === 'success' && articles.length === 0) {
      return (
        <div className="py-6 px-4 text-sm text-center text-muted-foreground">
          {t('searchResultsEmpty')}
        </div>
      )
    }

    if (articles.length === 0) {
      return (
        <div className="py-6 px-4 text-sm text-center text-muted-foreground">
          {t('searchInputHint', { count: MIN_KEYWORD_LENGTH })}
        </div>
      )
    }

    return (
      <div className="max-h-80 overflow-y-auto">
        {articles.map((article, index) => {
          const siteName = article.site?.name
          const categoryName = article.category?.name
          const publishedLabel = article.createdAt
            ? timeAgo(article.createdAt)
            : null
          const searchSnippetHtml = article.searchSnippet
            ? sanitize(article.searchSnippet, SEARCH_SNIPPET_SANITIZE_OPTIONS)
            : null
          const isActive = index === activeResultIndex
          return (
            <SiteLink
              key={article.id}
              to={`/articles/${article.id}`}
              siteFrontId={article.siteFrontId}
              className={cn(
                'block px-4 py-3 no-underline hover:bg-gray-100 hover:no-underline focus:bg-gray-100 focus:no-underline focus-visible:outline-none focus-visible:ring-0 dark:hover:bg-slate-800 dark:focus:bg-slate-800',
                isActive && 'bg-gray-100 dark:bg-slate-800'
              )}
              ref={(element) => {
                resultRefs.current[index] = element
              }}
              onFocus={() => setActiveResultIndex(index)}
              onKeyDown={(event: ReactKeyboardEvent<HTMLAnchorElement>) =>
                handleResultKeyDown(event, index)
              }
              onClick={() => onOpenChange(false)}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {article.displayTitle || article.title}
              </p>
              {(siteName || categoryName) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {siteName && article.site && (
                    <span className="flex items-center gap-2">
                      <BSiteIcon
                        logoUrl={article.site.logoUrl}
                        name={siteName}
                        size={rem2pxNum(1.25)}
                        fontSize={12}
                        className="shrink-0"
                      />
                      <span className="truncate">{siteName}</span>
                    </span>
                  )}
                  {categoryName && (
                    <span className="truncate">· {categoryName}</span>
                  )}
                  {publishedLabel && (
                    <time
                      className="truncate"
                      title={article.createdAt}
                      dateTime={article.createdAt}
                    >
                      · {publishedLabel}
                    </time>
                  )}
                </div>
              )}
              {searchSnippetHtml && (
                <div
                  className="mt-2 text-xs text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: searchSnippetHtml }}
                ></div>
              )}
            </SiteLink>
          )
        })}
      </div>
    )
  }

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onClick={() => onOpenChange(false)}
      aria-modal="true"
      role="dialog"
      onKeyDownCapture={handleDialogKeyDownCapture}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/80 transition-opacity duration-200',
          showContent ? 'opacity-100' : 'opacity-0'
        )}
      ></div>
      <div className="absolute left-1/2 top-[100px] w-full max-w-full -translate-x-1/2 px-4">
        <div
          className={cn(
            'mx-auto w-full max-w-[640px] overflow-hidden rounded-sm border border-black/20 bg-white/95 shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-900/90',
            showContent
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-2'
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div>
            <div className="flex items-stretch gap-3 rounded-tl-sm rounded-tr-sm border-b border-b-black/10 bg-white/80 px-3 py-2 dark:border-b-slate-700 dark:bg-slate-900">
              {!isSingleSite && (
                <>
                  <div
                    ref={selectContainerRef}
                    className={cn(
                      'flex w-[80px] flex-[1] items-center rounded-sm transition-colors focus-within:bg-black/5 focus-within:dark:bg-white/10',
                      siteSelectOpen && 'bg-black/5 dark:bg-white/10'
                    )}
                  >
                    <Select
                      open={siteSelectOpen}
                      onOpenChange={setSiteSelectOpen}
                      value={selectedSite}
                      onValueChange={(value) => setSelectedSite(value)}
                    >
                      <SelectTrigger
                        hideIndicator={siteOptions.length === 0}
                        className="h-11 w-full border-none bg-transparent px-0 text-sm focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        aria-label={selectedSiteOption?.name || t('allSites')}
                      >
                        <div className="flex w-full items-center justify-center">
                          <BSiteIcon
                            logoUrl={
                              selectedSite === ALL_SITES_OPTION
                                ? SITE_LOGO_IMAGE
                                : selectedSiteOption?.logoUrl || ''
                            }
                            name={selectedSiteOption?.name || t('allSites')}
                            size={selectIconSize}
                            fontSize={12}
                            className="shrink-0"
                          />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value={ALL_SITES_OPTION}>
                          <span className="flex items-center gap-2">
                            <BSiteIcon
                              logoUrl={SITE_LOGO_IMAGE}
                              name={t('allSites')}
                              size={selectIconSize}
                              fontSize={12}
                              className="shrink-0"
                            />
                            <span>{t('allSites')}</span>
                          </span>
                        </SelectItem>
                        {siteOptions.map((site) => (
                          <SelectItem key={site.frontId} value={site.frontId}>
                            <span className="flex items-center gap-2">
                              <BSiteIcon
                                logoUrl={site.logoUrl}
                                name={site.name}
                                size={selectIconSize}
                                fontSize={12}
                                className="shrink-0"
                              />
                              <span className="truncate">{site.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-px -my-[10px] self-stretch bg-black/10 dark:bg-slate-700/70"></div>
                </>
              )}
              <div
                className={cn(
                  'flex items-center',
                  isSingleSite ? 'flex-1' : 'flex-[9]'
                )}
              >
                <Input
                  ref={inputRef}
                  placeholder={t('searchArticlesPlaceholder')}
                  value={keywords}
                  className={cn(
                    'h-11 w-full border-none bg-transparent px-2 text-base transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-0',
                    showContent
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 -translate-y-1'
                  )}
                  onChange={(event) => setKeywords(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  onFocus={() => setActiveResultIndex(-1)}
                />
              </div>
            </div>
          </div>
          {showDropdown && (
            <div className="bg-white/95 px-1 pb-2 transition-opacity duration-200 dark:bg-slate-900">
              {renderDropdownContent()}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ArticleSearchDialog
