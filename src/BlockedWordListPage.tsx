import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Checkbox } from './components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog'
import { Input } from './components/ui/input'
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

import BlockedWordForm from './components/BlockedWordForm'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { getSiteBlockedWords, removeSiteBlockedWords } from './api/site'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { useAlertDialogStore, useAuthedUserStore } from './state/global'
import { ListPageState, SiteBlockedWord } from './types/types'

interface SearchFields {
  keywords?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
}

export default function BlockedWordListPage() {
  const [loading, setLoading] = useState(false)
  const [showBlockedWordForm, setShowBlockedWordForm] = useState(false)
  const [wordFormDirty, setWordFormDirty] = useState(false)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const dialogConfirm = useAlertDialogStore((state) => state.confirm)

  const { siteFrontId } = useParams()

  const [list, setList] = useState<SiteBlockedWord[]>([])

  const alertDialog = useAlertDialogStore()

  const { checkPermit } = useAuthedUserStore(
    useShallow(({ permit }) => ({
      checkPermit: permit,
    }))
  )

  const fetchBlockedWordList = toSync(
    useCallback(
      async (showLoading = false) => {
        try {
          if (!siteFrontId) return

          if (showLoading) {
            setLoading(true)
          }

          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const keywords = params.get('keywords') || ''

          setSearchData((state) => ({ ...state, keywords }))

          const { code, data } = await getSiteBlockedWords(
            siteFrontId,
            keywords,
            page,
            pageSize
          )

          /* console.log('list: ', data) */

          if (!code && data.list) {
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
        } catch (err) {
          console.error('get user list error: ', err)
        } finally {
          setLoading(false)
        }
      },
      [params, siteFrontId]
    )
  )

  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    keywords: params.get('keywords') || '',
  })

  const columns: ColumnDef<SiteBlockedWord>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选中该行"
          disabled={!row.getCanSelect()}
        />
      ),
    },
    {
      id: 'word',
      accessorKey: 'word',
      header: '内容',
      cell: ({ row }) => row.original.word.content,
    },
    {
      id: 'creatorName',
      accessorKey: 'creatorName',
      header: '添加人',
      cell: ({ row }) => row.original.creatorName,
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: '添加时间',
      cell: ({ row }) => timeFmt(row.original.createdAt, 'YYYY-M-D'),
    },
    {
      id: 'contorles',
      accessorKey: 'contorles',
      header: '',
      cell: ({ row }) => (
        <>
          <Button
            variant="secondary"
            size="sm"
            className="m-1 text-destructive"
            onClick={async () => {
              await onRemoveClick(row.original)
            }}
          >
            移除
          </Button>
        </>
      ),
    },
  ]

  const table = useReactTable({
    data: list,
    columns: columns,
    enableMultiRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    getRowId: (row) => String(row.word.id),
    enableRowSelection: () => true,
  })

  const selectedRows = table.getSelectedRowModel().rows

  const onRemoveClick = useCallback(
    async (word: SiteBlockedWord) => {
      if (!siteFrontId) return

      const confirmed = await alertDialog.confirm(
        `确认`,
        `确定把屏蔽词 "${word.word.content}" 从本站移除？`,
        'danger'
      )
      if (!confirmed) return

      const { code } = await removeSiteBlockedWords(siteFrontId, [word.word.id])
      if (!code) {
        fetchBlockedWordList()
      }
    },
    [siteFrontId, alertDialog, fetchBlockedWordList]
  )

  const onRemoveSelectedClick = useCallback(async () => {
    if (!siteFrontId) return

    if (selectedRows.length == 0) return

    const wordIdList = selectedRows.map((item) => item.original.word.id)
    const words = selectedRows.map((item) => item.original.word.content)

    const confirmed = await alertDialog.confirm(
      `确认`,
      `确定把屏蔽词 "${words.join(', ')}" 从本站移除？`,
      'danger'
    )
    if (!confirmed) return

    const { code } = await removeSiteBlockedWords(siteFrontId, wordIdList)
    if (!code) {
      fetchBlockedWordList()
    }
  }, [siteFrontId, alertDialog, fetchBlockedWordList, selectedRows])

  const resetParams = useCallback(() => {
    setParams((params) => {
      params.delete('page')
      params.delete('page_size')
      params.delete('keywords')
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
      const { keywords } = searchData

      if (keywords) {
        params.set('keywords', keywords)
      }
      return params
    })
  }, [setParams, searchData, resetParams])

  const onWordFormClose = useCallback(async () => {
    if (wordFormDirty) {
      const confirmed = await dialogConfirm(
        '确认',
        '有未提交数据，确认舍弃？',
        'normal',
        {
          confirmBtnText: '确定舍弃',
          cancelBtnText: '继续添加',
        }
      )

      if (!confirmed) return

      setShowBlockedWordForm(false)
    }

    setShowBlockedWordForm(false)
  }, [wordFormDirty, dialogConfirm])

  const onAddWordsSuccess = useCallback(() => {
    fetchBlockedWordList()
    setShowBlockedWordForm(false)
  }, [fetchBlockedWordList])

  useEffect(() => {
    fetchBlockedWordList(true)
  }, [location])

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'blockedWords',
        name: '屏蔽词列表',
        describe: '',
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder="关键词"
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

      <div className="flex justify-between items-center my-4">
        <Badge variant="secondary">{pageState.total} 个屏蔽词</Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowBlockedWordForm(true)
          }}
        >
          + 添加
        </Button>
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
            <Card className="sticky bottom-0 mt-4 p-2">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  已选中 {selectedRows.length} 个词汇
                </div>
                <div>
                  {checkPermit('site', 'manage') && (
                    <Button
                      size="sm"
                      onClick={onRemoveSelectedClick}
                      className="ml-1"
                      variant={'destructive'}
                    >
                      移除 {selectedRows.length} 个已选词汇
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      <Dialog open={showBlockedWordForm} onOpenChange={onWordFormClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加屏蔽词</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <BlockedWordForm
            onChange={setWordFormDirty}
            onSuccess={onAddWordsSuccess}
            onCancel={onWordFormClose}
          />
        </DialogContent>
      </Dialog>
    </BContainer>
  )
}
