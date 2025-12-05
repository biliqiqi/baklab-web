import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
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
} from './components/ui/table'

import BContainer from './components/base/BContainer'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'
import OAuthClientForm from './components/OAuthClientForm'

import { useLocationKey } from '@/hooks/use-location-key'

import {
  deleteOAuthClient,
  listOAuthClients,
  regenerateClientSecret,
  setClientActive,
} from './api/oauth'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import {
  useAlertDialogStore,
  useAuthedUserStore,
  useLoading,
} from './state/global'
import { OAuthClient, OAuthClientResponse } from './types/oauth'
import { ListPageState } from './types/types'

interface SearchFields {
  keywords?: string
}

const defaultSearchData: SearchFields = {
  keywords: '',
}

export default function OAuthClientListPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<OAuthClient | null>(null)
  const [showSecret, setShowSecret] = useState<string | null>(null)
  const [isNewSecret, setIsNewSecret] = useState(false)
  const [list, setList] = useState<OAuthClient[]>([])

  const [params, setParams] = useSearchParams()
  const [searchData, setSearchData] = useState<SearchFields>({
    ...defaultSearchData,
    keywords: params.get('keywords') || '',
  })

  const { setLoading } = useLoading()
  const { t } = useTranslation()
  const { locationKey } = useLocationKey()
  const alertDialog = useAlertDialogStore()

  const { checkPermit } = useAuthedUserStore(
    useShallow(({ permit }) => ({ checkPermit: permit }))
  )

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const fetchClientList = toSync(
    useCallback(
      async (showLoading = false) => {
        if (!checkPermit('oauth', 'manage')) return

        try {
          if (showLoading) {
            setLoading(true)
          }
          const page = Number(params.get('page')) || 1
          const pageSize = Number(params.get('page_size')) || DEFAULT_PAGE_SIZE
          const keywords = params.get('keywords') || ''

          setSearchData((state) => ({ ...state, keywords }))

          const resp = await listOAuthClients(
            page,
            pageSize,
            undefined,
            keywords
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
          }
        } catch (err) {
          console.error('get oauth client list error: ', err)
        } finally {
          setLoading(false)
        }
      },
      [params, checkPermit, setLoading]
    )
  )

  const onDeleteClick = useCallback(
    async (client: OAuthClient) => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('oauthDeleteConfirm', { name: client.name }),
        'danger'
      )
      if (!confirmed) return

      const { code } = await deleteOAuthClient(client.clientID)
      if (!code) {
        fetchClientList(false)
      }
    },
    [alertDialog, fetchClientList, t]
  )

  const onToggleActiveClick = useCallback(
    async (client: OAuthClient) => {
      const action = client.isActive ? 'Deactivate' : 'Activate'
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t(`oauth${action}Confirm`, { name: client.name })
      )
      if (!confirmed) return

      const { code } = await setClientActive(client.clientID, {
        isActive: !client.isActive,
      })
      if (!code) {
        fetchClientList(false)
      }
    },
    [alertDialog, fetchClientList, t]
  )

  const onRegenerateSecretClick = useCallback(
    async (client: OAuthClient) => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('oauthRegenerateSecretConfirm', { name: client.name }),
        'danger'
      )
      if (!confirmed) return

      const { code, data } = await regenerateClientSecret(client.clientID)
      if (!code && data) {
        setIsNewSecret(false)
        setShowSecret(data.clientSecret)
      }
    },
    [alertDialog, t]
  )

  const onFormSuccess = useCallback(
    (client?: OAuthClientResponse, isNewClient?: boolean) => {
      setShowForm(false)
      setEditingClient(null)
      fetchClientList(false)

      // If new client with secret, show secret
      if (isNewClient && client?.clientSecret) {
        setIsNewSecret(true)
        setShowSecret(client.clientSecret)
      }
    },
    [fetchClientList]
  )

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
  }, [setParams, resetParams, searchData])

  const columns: ColumnDef<OAuthClient>[] = [
    {
      accessorKey: 'name',
      header: t('oauthAppName'),
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          {row.original.logoURL && (
            <img
              src={row.original.logoURL}
              alt={row.original.name}
              className="w-6 h-6 rounded"
            />
          )}
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: 'clientID',
      header: t('clientID'),
      cell: ({ row }) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {row.original.clientID}
        </code>
      ),
    },
    {
      accessorKey: 'redirectURI',
      header: t('redirectURI'),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
          {row.original.redirectURI}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: t('status'),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? t('active') : t('inactive')}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: t('createdAt'),
      cell: ({ cell }) => (
        <span>{timeFmt(cell.getValue<string>(), 'YYYY-M-D')}</span>
      ),
    },
    {
      id: 'actions',
      header: t('operations'),
      cell: ({ row }) => (
        <div className="space-x-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingClient(row.original)
              setShowForm(true)
            }}
          >
            {t('edit')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRegenerateSecretClick(row.original)}
          >
            {t('regenerateSecret')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onToggleActiveClick(row.original)}
            className={
              row.original.isActive ? 'text-orange-600' : 'text-green-600'
            }
          >
            {row.original.isActive ? t('deactivate') : t('activate')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDeleteClick(row.original)}
            className="text-red-600"
          >
            {t('delete')}
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: list,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.clientID,
  })

  useEffect(() => {
    fetchClientList(true)
  }, [locationKey])

  if (!checkPermit('oauth', 'manage')) {
    return (
      <BContainer>
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('noPermission')}</p>
        </div>
      </BContainer>
    )
  }

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'oauthClients',
        name: t('oauthApplications'),
        describe: t('oauthApplicationsDescribe'),
      }}
    >
      <Card className="flex flex-wrap justify-between p-2">
        <div className="flex flex-wrap">
          <Input
            placeholder={t('oauthAppName')}
            className="w-[200px] h-[36px] mr-3"
            value={searchData.keywords}
            onChange={(e) =>
              setSearchData((state) => ({
                ...state,
                keywords: e.target.value,
              }))
            }
            onKeyUp={(e) => {
              if (e.key === 'Enter') {
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
          <Button
            variant="outline"
            size="sm"
            onClick={onSearchClick}
            className="mr-3"
          >
            {t('search')}
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            + {t('createOAuthApp')}
          </Button>
        </div>
      </Card>

      <div className="my-4">
        <Badge variant="secondary">
          {t('oauthClientCount', { num: pageState.total })}
        </Badge>
      </div>

      {list.length === 0 ? (
        <Empty />
      ) : (
        <>
          <Card className="mt-4 overflow-hidden">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
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
        </>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? t('editOAuthApp') : t('createOAuthApp')}
            </DialogTitle>
            <DialogDescription>
              {t('oauthAppFormDescription')}
            </DialogDescription>
          </DialogHeader>
          <OAuthClientForm
            client={editingClient}
            onSuccess={onFormSuccess}
            onCancel={() => {
              setShowForm(false)
              setEditingClient(null)
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showSecret} onOpenChange={() => setShowSecret(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isNewSecret ? t('clientSecret') : t('newClientSecret')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('clientSecretWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-4 bg-muted rounded font-mono text-sm break-all">
            {showSecret}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSecret(null)}>
              {t('close')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BContainer>
  )
}
