import { zodResolver } from '@hookform/resolvers/zod'
import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { z } from '@/lib/zod-custom'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Checkbox } from './components/ui/checkbox'
import { Input } from './components/ui/input'
import { Switch } from './components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import BContainer from './components/base/BContainer'
import BSiteIcon from './components/base/BSiteIcon'
import SiteLink from './components/base/SiteLink'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import {
  createSiteDomain,
  deleteSiteDomain,
  getSiteDomainList,
  getSiteList,
  setSiteStatus,
  updateSiteDomainStatus,
} from './api/site'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { getSiteStatusColor, getSiteStatusName } from './lib/utils'
import { useAlertDialogStore, useLoading } from './state/global'
import {
  ListPageState,
  SITE_STATUS,
  SITE_VISIBLE,
  Site,
  SiteDomain,
  SiteStatus,
} from './types/types'

interface SearchFields {
  keywords?: string
  creatorName?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
  creatorName: '',
}

const DOMAIN_REGEX =
  /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/

const tabs: SiteStatus[] = [
  SITE_STATUS.All,
  SITE_STATUS.Normal,
  /* SITE_STATUS.Reject, */
  SITE_STATUS.Banned,
  SITE_STATUS.ReadOnly,
]

const defaultStatus = SITE_STATUS.All

interface EditSiteData {
  rejectting: boolean
  site: Site | null
}

const rejecttingSchema = z.object({
  reason: z.string(),
})

type RejecttingSchema = z.infer<typeof rejecttingSchema>

export default function SiteListPage() {
  /* const [loading, setLoading] = useState(false) */
  const [editSite, setEditSite] = useState<EditSiteData>({
    rejectting: false,
    site: null,
  })

  const [list, setList] = useState<Site[]>([])
  const [params, setParams] = useSearchParams()
  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    keywords: params.get('keywords') || '',
    creatorName: params.get('creator_name') || '',
  })

  const { setLoading } = useLoading()

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const [domainDialog, setDomainDialog] = useState<{
    open: boolean
    site: Site | null
  }>({
    open: false,
    site: null,
  })
  const [domainList, setDomainList] = useState<SiteDomain[]>([])
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainInputVisible, setDomainInputVisible] = useState(false)
  const [domainInputValue, setDomainInputValue] = useState('')
  const [domainSubmitting, setDomainSubmitting] = useState(false)
  const [domainDeletingId, setDomainDeletingId] = useState<number | null>(null)
  const [domainTogglingId, setDomainTogglingId] = useState<number | null>(null)
  const [domainInputError, setDomainInputError] = useState('')

  const currSite = useMemo(() => editSite.site, [editSite])
  const currDomainSite = domainDialog.site

  const { t } = useTranslation()

  const location = useLocation()

  const alertDialog = useAlertDialogStore()

  const tab = params.get('status') || String(defaultStatus)

  const fetchSiteList = toSync(
    useCallback(
      async (showLoading = false) => {
        try {
          if (showLoading) {
            setLoading(true)
          }
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const keywords = params.get('keywords') || ''
          const creatorName = params.get('creator_name') || ''
          const statusStr = params.get('status') || String(defaultStatus)
          const deletedStr = params.get('deleted')

          let status: SiteStatus | undefined = Number(statusStr) as SiteStatus
          if (!Object.values(SITE_STATUS).includes(status)) {
            status = defaultStatus
          }

          let deleted: boolean | undefined = undefined
          if (deletedStr == '1') {
            deleted = true
            status = undefined
          }

          setSearchData((state) => ({ ...state, keywords, creatorName }))

          const resp = await getSiteList(
            page,
            pageSize,
            keywords,
            '0',
            creatorName,
            SITE_VISIBLE.All,
            deleted,
            status
          )
          if (!resp.code) {
            const { data } = resp
            if (data.list) {
              setList([...data.list])
              setPageState({
                currPage: data.currPage,
                pageSize: data.pageSize,
                total: data.total,
                totalPage: data.totalPage,
              })
            } else {
              setList([])
              setPageState({
                currPage: 1,
                pageSize: data.pageSize,
                total: 0,
                totalPage: 0,
              })
            }
            setRowSelection({})
          }
        } catch (err) {
          console.error('get user list error: ', err)
        } finally {
          setLoading(false)
        }
      },
      [params, setLoading]
    )
  )

  const fetchDomainList = useCallback(async (siteFrontId: string) => {
    try {
      setDomainLoading(true)
      const { code, data } = await getSiteDomainList(siteFrontId)
      if (!code) {
        setDomainList(data.list || [])
      }
    } catch (err) {
      console.error('get site domain list error: ', err)
    } finally {
      setDomainLoading(false)
    }
  }, [])

  const onLinkDomainClick = useCallback(
    (site: Site) => {
      setDomainDialog({ open: true, site })
      setDomainInputVisible(false)
      setDomainInputValue('')
      setDomainInputError('')
      void fetchDomainList(site.frontId)
    },
    [fetchDomainList]
  )

  const onDomainDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDomainDialog({ open: false, site: null })
      setDomainList([])
      setDomainInputVisible(false)
      setDomainInputValue('')
      setDomainSubmitting(false)
      setDomainDeletingId(null)
      setDomainInputError('')
    }
  }, [])

  const onConfirmAddDomain = useCallback(async () => {
    const domain = domainInputValue.trim()
    if (!domain || !currDomainSite) {
      return
    }
    if (!DOMAIN_REGEX.test(domain)) {
      setDomainInputError(t('domainFormatError'))
      return
    }
    setDomainInputError('')
    const confirmed = await alertDialog.confirm(
      t('confirm'),
      t('addDomainConfirm', { domain, siteName: currDomainSite.name })
    )
    if (!confirmed) {
      return
    }
    try {
      setDomainSubmitting(true)
      const { code } = await createSiteDomain(
        currDomainSite.frontId,
        domain,
        true
      )
      if (!code) {
        setDomainInputValue('')
        setDomainInputVisible(false)
        void fetchDomainList(currDomainSite.frontId)
      }
    } catch (err) {
      console.error('create site domain error: ', err)
    } finally {
      setDomainSubmitting(false)
    }
  }, [alertDialog, currDomainSite, domainInputValue, fetchDomainList, t])

  const onDeleteDomain = useCallback(
    async (domainItem: SiteDomain) => {
      if (!currDomainSite) {
        return
      }
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('deleteDomainConfirm', { domain: domainItem.domain }),
        'danger'
      )
      if (!confirmed) {
        return
      }
      try {
        setDomainDeletingId(domainItem.id)
        const { code } = await deleteSiteDomain(domainItem.id)
        if (!code) {
          void fetchDomainList(currDomainSite.frontId)
        }
      } catch (err) {
        console.error('delete site domain error: ', err)
      } finally {
        setDomainDeletingId(null)
      }
    },
    [alertDialog, currDomainSite, fetchDomainList, t]
  )

  const onToggleDomainActive = useCallback(
    async (domainItem: SiteDomain) => {
      if (!currDomainSite) {
        return
      }
      const nextActive = !domainItem.isActive
      try {
        setDomainTogglingId(domainItem.id)
        const { code } = await updateSiteDomainStatus(
          domainItem.id,
          domainItem.domain,
          nextActive
        )
        if (!code) {
          void fetchDomainList(currDomainSite.frontId)
        }
      } catch (err) {
        console.error('update site domain status error: ', err)
      } finally {
        setDomainTogglingId(null)
      }
    },
    [currDomainSite, fetchDomainList]
  )

  const rejecttingForm = useForm<RejecttingSchema>({
    resolver: zodResolver(
      rejecttingSchema.extend({
        reason: z.string().min(1, t('reasonInputTip')),
      })
    ),
    defaultValues: {
      reason: '',
    },
  })

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('page_size')
      params.delete('keywords')
      params.delete('creator_name')
      return params
    })
  }, [setParams])

  const onResetClick = useCallback(() => {
    setSearchData({ ...defaultSearchData })
    resetParams()
  }, [resetParams])

  const onSearchClick = useCallback(() => {
    resetParams()
    setParams((params) => {
      const { keywords, creatorName } = searchData

      if (keywords) {
        params.set('keywords', keywords)
      }

      if (creatorName) {
        params.set('creator_name', creatorName)
      }

      return params
    })
  }, [setParams, resetParams, searchData])

  const onPassSiteClick = useCallback(
    async (site: Site) => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('siteReviewPassConfirm', { siteName: site.name })
      )
      if (confirmed) {
        const { code } = await setSiteStatus(
          site.frontId,
          SITE_STATUS.Normal,
          '',
          site.status
        )
        if (!code) {
          fetchSiteList(false)
        }
      }
    },
    [t, alertDialog, fetchSiteList]
  )

  const onBanSiteClick = useCallback(
    async (site: Site) => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('siteBanConfirm', { siteName: site.name }),
        'danger'
      )
      if (confirmed) {
        const { code } = await setSiteStatus(
          site.frontId,
          SITE_STATUS.Banned,
          '',
          site.status
        )
        if (!code) {
          fetchSiteList(false)
        }
      }
    },
    [t, alertDialog, fetchSiteList]
  )

  const onSetSiteReadonlyClick = useCallback(
    async (site: Site) => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('siteReadOnlyConfirm', { siteName: site.name })
      )
      if (confirmed) {
        const { code } = await setSiteStatus(
          site.frontId,
          SITE_STATUS.ReadOnly,
          '',
          site.status
        )
        if (!code) {
          fetchSiteList(false)
        }
      }
    },
    [t, alertDialog, fetchSiteList]
  )

  const onRecoverSiteClick = useCallback(
    async (site: Site) => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('siteRecoverConfirm', { siteName: site.name })
      )
      if (confirmed) {
        const { code } = await setSiteStatus(
          site.frontId,
          SITE_STATUS.Normal,
          '',
          site.status
        )
        if (!code) {
          fetchSiteList(false)
        }
      }
    },
    [t, alertDialog, fetchSiteList]
  )

  const columns: ColumnDef<Site>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          disabled={!row.getCanSelect()}
        />
      ),
    },
    {
      accessorKey: 'name',
      header: t('siteName'),
      cell: ({ row }) => (
        <SiteLink to="/" siteFrontId={row.original.frontId}>
          <BSiteIcon
            logoUrl={row.original.logoUrl}
            name={row.original.name}
            size={36}
            showSiteName
            className="w-[100px]"
          />
        </SiteLink>
      ),
    },
    {
      accessorKey: 'visible',
      header: t('visibility'),
      cell: ({ row }) => (
        <span>{row.original.visible ? t('public') : t('private')}</span>
      ),
    },
    {
      accessorKey: 'creatorName',
      header: t('creator'),
      cell: ({ row }) => (
        <Link to={'/users/' + row.original.creatorName}>
          {row.original.creatorName}
        </Link>
      ),
    },
    {
      accessorKey: 'memberCount',
      header: t('memberNum'),
      cell: ({ row }) => <span>{row.original.memberCount}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: t('createdAt'),
      cell: ({ cell }) => (
        <span>{timeFmt(cell.getValue<string>(), 'YYYY-M-D')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('status'),
      cell: ({ row }) => (
        <>
          <span className={getSiteStatusColor(row.original.status)}>
            {getSiteStatusName(row.original.status) || '-'}
          </span>
          {row.original.deleted && (
            <span className="text-gray-500">&nbsp;({t('deleted')})</span>
          )}
        </>
      ),
    },
    {
      accessorKey: 'contorles',
      header: t('operations'),
      cell: ({ row: { original } }) => (
        <>
          <Button
            variant="secondary"
            className="mr-1"
            size="sm"
            onClick={() => onLinkDomainClick(original)}
          >
            {t('linkDomain')}
          </Button>
          {original.status == SITE_STATUS.Pending && (
            <>
              <Button
                variant="secondary"
                className="mr-1"
                size="sm"
                onClick={() => onPassSiteClick(original)}
              >
                {t('pass')}
              </Button>
              <Button
                variant="secondary"
                className="mr-1"
                size="sm"
                onClick={() =>
                  setEditSite({ rejectting: true, site: original })
                }
              >
                {t('reject')}
              </Button>
            </>
          )}
          {original.status == SITE_STATUS.Normal && (
            <>
              <Button
                variant="secondary"
                className="mr-1"
                size="sm"
                onClick={() => onBanSiteClick(original)}
              >
                {t('ban')}
              </Button>
              <Button
                variant="secondary"
                className="mr-1"
                size="sm"
                onClick={() => onSetSiteReadonlyClick(original)}
              >
                {t('setReadOnly')}
              </Button>
            </>
          )}
          {original.status == SITE_STATUS.Banned && (
            <Button
              variant="secondary"
              className="mr-1"
              size="sm"
              onClick={() => onRecoverSiteClick(original)}
            >
              {t('unban')}
            </Button>
          )}
          {(original.status == SITE_STATUS.ReadOnly ||
            original.status == SITE_STATUS.Reject) && (
            <Button
              variant="secondary"
              className="mr-1"
              size="sm"
              onClick={() => onRecoverSiteClick(original)}
            >
              {t('recover')}
            </Button>
          )}
        </>
      ),
    },
  ]

  const table = useReactTable({
    data: list,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => row.name,
  })

  const selectedRows = table.getSelectedRowModel().rows

  const onTabChange = (tab: string) => {
    setParams((prevParams) => {
      prevParams.delete('page')
      prevParams.set('status', tab)
      if (tab == 'deleted') {
        prevParams.set('deleted', '1')
      } else {
        prevParams.delete('deleted')
      }
      return prevParams
    })
  }

  const handleSubmit = useCallback(
    async (vals: RejecttingSchema) => {
      /* console.log('submit vals: ', vals) */
      if (!currSite) return
      const { code } = await setSiteStatus(
        currSite.frontId,
        SITE_STATUS.Reject,
        vals.reason,
        currSite.status
      )
      if (!code) {
        fetchSiteList()
        setEditSite({ rejectting: false, site: null })
      }
    },
    [currSite, fetchSiteList]
  )

  useEffect(() => {
    fetchSiteList(true)
  }, [location])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'site_list',
        name: t('siteManagement'),
        describe: t('allSites'),
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder={t('siteName')}
            className="w-[140px] h-[36px] mr-3"
            value={searchData.keywords}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                keywords: e.target.value,
              }))
            }
            onKeyUp={(e) => {
              if (e.key == 'Enter') {
                onSearchClick()
              }
            }}
          />
          <Input
            placeholder={t('creator')}
            className="w-[140px] h-[36px] mr-3"
            value={searchData.creatorName}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                creatorName: e.target.value,
              }))
            }
            onKeyUp={(e) => {
              if (e.key == 'Enter') {
                onSearchClick()
              }
            }}
          />
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={onResetClick}
            className="mr-3"
          >
            {t('reset')}
          </Button>
          <Button variant="outline" size="sm" onClick={onSearchClick}>
            {t('search')}
          </Button>
        </div>
      </Card>
      <Tabs
        defaultValue={String(defaultStatus)}
        value={tab}
        onValueChange={onTabChange}
        className="mt-4"
      >
        <TabsList className="overflow-x-auto overflow-y-hidden max-w-full">
          {tabs.map((item) => (
            <TabsTrigger value={String(item)} key={item}>
              {getSiteStatusName(item)}
            </TabsTrigger>
          ))}
          <TabsTrigger value={`deleted`} key={`deleted`}>
            {t('deleted')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="my-4">
        <Badge variant="secondary">
          {t('siteCount', { num: pageState.total })}
        </Badge>
      </div>

      {list.length == 0 ? (
        <Empty />
      ) : (
        <>
          <Card className="mt-4 overflow-hidden">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      <Empty />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <ListPagination pageState={pageState} />
          </Card>
          {selectedRows.length > 0 && (
            <Card className="sticky bottom-0 mt-4 p-2">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  {t('selectedSiteCouont', { num: selectedRows.length })}
                </div>
                <div></div>
              </div>
            </Card>
          )}
        </>
      )}

      <Dialog open={domainDialog.open} onOpenChange={onDomainDialogOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('siteDomainManage')}</DialogTitle>
            {currDomainSite && (
              <DialogDescription>
                {t('siteDomainForSite', { siteName: currDomainSite.name })}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('siteDomainDesc')}
            </p>
            {domainInputVisible ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    autoFocus
                    placeholder={t('addDomainPlaceholder')}
                    value={domainInputValue}
                    onChange={(e) => {
                      const nextValue = e.target.value
                      setDomainInputValue(nextValue)
                      if (
                        domainInputError &&
                        DOMAIN_REGEX.test(nextValue.trim())
                      ) {
                        setDomainInputError('')
                      }
                    }}
                    className="flex-1 min-w-[200px]"
                    disabled={domainSubmitting}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter') {
                        void onConfirmAddDomain()
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={onConfirmAddDomain}
                    disabled={
                      domainSubmitting || domainInputValue.trim().length === 0
                    }
                  >
                    {t('confirm')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDomainInputVisible(false)
                      setDomainInputValue('')
                    }}
                    disabled={domainSubmitting}
                  >
                    {t('cancel')}
                  </Button>
                </div>
                {domainInputError && (
                  <p className="text-sm text-destructive">{domainInputError}</p>
                )}
              </>
            ) : (
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setDomainInputVisible(true)}>
                  {t('add')}
                </Button>
              </div>
            )}
            <div className="rounded-md border">
              {domainLoading ? (
                <div className="p-4 text-sm text-muted-foreground">
                  {t('loading')}
                </div>
              ) : domainList.length === 0 ? (
                <div className="p-4">
                  <Empty />
                </div>
              ) : (
                <div className="divide-y">
                  {domainList.map((item) => {
                    const busy =
                      domainDeletingId === item.id ||
                      domainTogglingId === item.id
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={() =>
                              void onToggleDomainActive(item)
                            }
                            disabled={busy}
                            aria-label={t('siteDomainSwitchLabel', {
                              domain: item.domain,
                            })}
                          />
                          <div>
                            <div className="font-medium">{item.domain}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.isActive ? t('enabled') : t('disabled')}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDeleteDomain(item)}
                          disabled={busy}
                        >
                          {t('delete')}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        defaultOpen={false}
        open={editSite.rejectting}
        onOpenChange={(val) => setEditSite({ rejectting: val, site: null })}
      >
        <AlertDialogContent>
          {currSite && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('rejectSite')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('rejectSite', { siteName: currSite.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Form {...rejecttingForm}>
                <form
                  onSubmit={rejecttingForm.handleSubmit(handleSubmit)}
                  className="py-4 space-y-8"
                >
                  <FormField
                    control={rejecttingForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('rejectReason')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('reasonInputTip')}
                            className="mt-4"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setEditSite({ rejectting: false, site: null })}
                >
                  {t('cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={rejecttingForm.handleSubmit(handleSubmit)}
                >
                  {t('confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </BContainer>
  )
}
