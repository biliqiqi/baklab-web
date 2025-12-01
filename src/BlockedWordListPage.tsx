import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
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

import BlockedWordForm from './components/BlockedWordForm'
import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import { useSiteParams } from '@/hooks/use-site-params'

import { getSiteBlockedWords, removeSiteBlockedWords } from './api/site'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useLoading,
} from './state/global'
import { ListPageState, SiteBlockedWord } from './types/types'

interface SearchFields {
  keywords?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
}

export default function BlockedWordListPage() {
  /* const [loading, setLoading] = useState(false) */
  const [showBlockedWordForm, setShowBlockedWordForm] = useState(false)
  const [wordFormDirty, setWordFormDirty] = useState(false)

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const { t } = useTranslation()

  const { setLoading } = useLoading()

  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const dialogConfirm = useAlertDialogStore((state) => state.confirm)

  const { siteFrontId } = useSiteParams()

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
      [params, siteFrontId, setLoading]
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
          aria-label={t('selectAll')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('selectRow')}
          disabled={!row.getCanSelect()}
        />
      ),
    },
    {
      id: 'word',
      accessorKey: 'word',
      header: t('content'),
      cell: ({ row }) => row.original.word.content,
    },
    {
      id: 'creatorName',
      accessorKey: 'creatorName',
      header: t('creator'),
      cell: ({ row }) => row.original.creatorName,
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: t('createdAt'),
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
            {t('remove')}
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
        t('confirm'),
        t('removeBlockedWordsConfirm', { word: word.word.content }),
        'danger'
      )
      if (!confirmed) return

      const { code } = await removeSiteBlockedWords(siteFrontId, [word.word.id])
      if (!code) {
        fetchBlockedWordList()
      }
    },
    [siteFrontId, alertDialog, fetchBlockedWordList, t]
  )

  const onRemoveSelectedClick = useCallback(async () => {
    if (!siteFrontId) return

    if (selectedRows.length == 0) return

    const wordIdList = selectedRows.map((item) => item.original.word.id)
    const words = selectedRows.map((item) => item.original.word.content)

    const confirmed = await alertDialog.confirm(
      t('confirm'),
      t('removeBlockedWordsConfirm', { word: words.join(', ') }),
      'danger'
    )
    if (!confirmed) return

    const { code } = await removeSiteBlockedWords(siteFrontId, wordIdList)
    if (!code) {
      fetchBlockedWordList()
    }
  }, [siteFrontId, alertDialog, fetchBlockedWordList, selectedRows, t])

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
        t('confirm'),
        t('unsubmitDropConfirm'),
        'normal',
        {
          confirmBtnText: t('dropConfirm'),
          cancelBtnText: t('continueAdding'),
        }
      )

      if (!confirmed) return

      setShowBlockedWordForm(false)
    }

    setShowBlockedWordForm(false)
  }, [wordFormDirty, dialogConfirm, t])

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
        name: t('blockedWordList'),
        describe: '',
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder={t('keywords')}
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

      <div className="flex justify-between items-center my-4">
        <Badge variant="secondary">
          {t('blockedWordCount', { num: pageState.total })}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowBlockedWordForm(true)
          }}
        >
          + {t('add')}
        </Button>
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
                  {t('selectedWordCount', { num: selectedRows.length })}
                </div>
                <div>
                  {checkPermit('site', 'manage') && (
                    <Button
                      size="sm"
                      onClick={onRemoveSelectedClick}
                      className="ml-1"
                      variant={'destructive'}
                    >
                      {t('removeWordCount', { num: selectedRows.length })}
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
            <DialogTitle>{t('addBlockedWords')}</DialogTitle>
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
