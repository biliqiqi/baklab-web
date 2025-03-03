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
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { z } from '@/lib/zod-custom'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Checkbox } from './components/ui/checkbox'
import { Input } from './components/ui/input'
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
import BLoader from './components/base/BLoader'
import BSiteIcon from './components/base/BSiteIcon'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { getSiteList, setSiteStatus } from './api/site'
import { DEFAULT_PAGE_SIZE, SITE_STATUS_NAME_MAP } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { getSiteStatusColor, getSiteStatusName } from './lib/utils'
import { useAlertDialogStore } from './state/global'
import {
  ListPageState,
  SITE_STATUS,
  SITE_VISIBLE,
  Site,
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
  reason: z.string().min(1, '请输入驳回原因'),
})

type RejecttingSchema = z.infer<typeof rejecttingSchema>

export default function SiteListPage() {
  const [loading, setLoading] = useState(false)
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

  const currSite = useMemo(() => editSite.site, [editSite])

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const location = useLocation()

  const alertDialog = useAlertDialogStore()

  const tab = params.get('status') || String(defaultStatus)

  const rejecttingForm = useForm<RejecttingSchema>({
    resolver: zodResolver(rejecttingSchema),
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

  const onPassSiteClick = async (site: Site) => {
    const confirmed = await alertDialog.confirm(
      '确认',
      `确定审核通过站点 "${site.name}" ？`
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
  }

  const onBanSiteClick = async (site: Site) => {
    const confirmed = await alertDialog.confirm(
      '确认',
      `确定封禁站点 "${site.name}" ？`,
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
  }

  const onSetSiteReadonlyClick = async (site: Site) => {
    const confirmed = await alertDialog.confirm(
      '确认',
      `确定设置站点 "${site.name}" 为只读？`
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
  }

  const onRecoverSiteClick = async (site: Site) => {
    const confirmed = await alertDialog.confirm(
      '确认',
      `确定恢复/解封站点 "${site.name}" ？`
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
  }

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
      header: '站点名称',
      cell: ({ row }) => (
        <Link to={'/' + row.original.frontId}>
          <BSiteIcon
            logoUrl={row.original.logoUrl}
            name={row.original.name}
            size={36}
            showSiteName
            className="w-[100px]"
          />
        </Link>
      ),
    },
    {
      accessorKey: 'visible',
      header: '可见性',
      cell: ({ row }) => <span>{row.original.visible ? '公开' : '私有'}</span>,
    },
    {
      accessorKey: 'creatorName',
      header: '创建人',
      cell: ({ row }) => (
        <Link to={'/users/' + row.original.creatorName}>
          {row.original.creatorName}
        </Link>
      ),
    },
    {
      accessorKey: 'memberCount',
      header: '成员数',
      cell: ({ row }) => <span>{row.original.memberCount}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: '创建时间',
      cell: ({ cell }) => (
        <span>{timeFmt(cell.getValue<string>(), 'YYYY-M-D')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <>
          <span className={getSiteStatusColor(row.original.status)}>
            {SITE_STATUS_NAME_MAP[row.original.status] || '-'}
          </span>
          {row.original.deleted && (
            <span className="text-gray-500">&nbsp;(已删除)</span>
          )}
        </>
      ),
    },
    {
      accessorKey: 'contorles',
      header: '操作',
      cell: ({ row: { original } }) => (
        <>
          {original.status == SITE_STATUS.Pending && (
            <>
              <Button
                variant="secondary"
                className="mr-1"
                size="sm"
                onClick={() => onPassSiteClick(original)}
              >
                通过
              </Button>
              <Button
                variant="secondary"
                className="mr-1"
                size="sm"
                onClick={() =>
                  setEditSite({ rejectting: true, site: original })
                }
              >
                驳回
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
                封禁
              </Button>
              <Button
                variant="secondary"
                className="mr-1"
                size="sm"
                onClick={() => onSetSiteReadonlyClick(original)}
              >
                设置为只读
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
              解封
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
              恢复
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
      [params]
    )
  )

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
        name: '站点管理',
        describe: '全部站点',
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder="站点名称"
            className="w-[140px] h-[36px] mr-3"
            value={searchData.keywords}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                keywords: e.target.value,
              }))
            }
          />
          <Input
            placeholder="创建人"
            className="w-[140px] h-[36px] mr-3"
            value={searchData.creatorName}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                creatorName: e.target.value,
              }))
            }
          />
        </div>
        <div>
          <Button size="sm" onClick={onResetClick} className="mr-3">
            重置
          </Button>
          <Button size="sm" onClick={onSearchClick}>
            搜索
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
            已删除
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="my-4">
        <Badge variant="secondary">{pageState.total} 个站点</Badge>
      </div>
      {loading && (
        <div className="flex justify-center">
          <BLoader />
        </div>
      )}

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
            <Card className="mt-4 p-2">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  已选中 {selectedRows.length} 个站点
                </div>
                <div></div>
              </div>
            </Card>
          )}
        </>
      )}

      <AlertDialog
        defaultOpen={false}
        open={editSite.rejectting}
        onOpenChange={(val) => setEditSite({ rejectting: val, site: null })}
      >
        <AlertDialogContent>
          {currSite && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>驳回</AlertDialogTitle>
                <AlertDialogDescription>
                  驳回站点 "{currSite.name}"
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
                        <FormLabel>驳回原因</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="请填写驳回原因"
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
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={rejecttingForm.handleSubmit(handleSubmit)}
                >
                  确认
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </BContainer>
  )
}
