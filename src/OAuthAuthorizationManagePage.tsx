import { useQuery } from '@tanstack/react-query'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './components/ui/tooltip'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'

import {
  getUserAuthorizations,
  revokeAllUserAuthorizations,
  revokeUserAuthorization,
} from './api/oauth'
import { DEFAULT_PAGE_SIZE } from './constants/constants'
import { timeFmt } from './lib/dayjs-custom'
import { useAlertDialogStore } from './state/global'
import { UserOAuthAuthorization } from './types/oauth'
import { ListPageState } from './types/types'

// Simplified default permission scopes (deduplicated and optimized)
const getDefaultScopes = (): string[] => {
  return ['profile', 'email']
}

// Permission display component
const PermissionBadges = ({
  authorization,
}: {
  authorization: UserOAuthAuthorization
}) => {
  const { t } = useTranslation()

  // Permission scope mapping (simplified core permissions after deduplication)
  const getScopeDisplayName = (scope: string): string => {
    const scopeMap: Record<string, string> = {
      profile: t('oauthScopeProfile'),
      email: t('oauthScopeEmail'),
      write: t('oauthScopeWrite'),
    }

    return scopeMap[scope] || scope
  }

  // Use stored permissions or default permissions
  const scopes = authorization.scopes || getDefaultScopes()

  if (scopes.length === 0) {
    return (
      <Badge variant="secondary" className="text-xs">
        {t('oauthScopeDefaultAccess')}
      </Badge>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex flex-wrap gap-1 max-w-[200px] cursor-help">
            {scopes.map((scope, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {getScopeDisplayName(scope)}
              </Badge>
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-medium text-xs">{t('oauthPermissions')}:</div>
            {scopes.map((scope, index) => (
              <div key={index} className="text-xs">
                • {getScopeDisplayName(scope)}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default function OAuthAuthorizationManagePage() {
  const [list, setList] = useState<UserOAuthAuthorization[]>([])
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false)

  const { t } = useTranslation()
  const alertDialog = useAlertDialogStore()

  const [pageState, setPageState] = useState<ListPageState>({
    currPage: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPage: 0,
  })

  const page = 1
  const size = DEFAULT_PAGE_SIZE

  const { data: authorizationsData, refetch: refetchAuthorizations } = useQuery(
    {
      queryKey: ['oauthAuthorizations', page, size],
      queryFn: async () => {
        const resp = await getUserAuthorizations(page, size, true)

        if (!resp.code) {
          const { data } = resp
          if (data.list) {
            return {
              list: data.list,
              currPage: data.currPage,
              pageSize: data.pageSize,
              total: data.total,
              totalPage: data.totalPage,
            }
          } else {
            return {
              list: [],
              currPage: 1,
              pageSize: size,
              total: 0,
              totalPage: 0,
            }
          }
        }
        return null
      },
    }
  )

  useEffect(() => {
    if (authorizationsData) {
      setList(authorizationsData.list || [])
      setPageState({
        currPage: authorizationsData.currPage,
        pageSize: authorizationsData.pageSize,
        total: authorizationsData.total,
        totalPage: authorizationsData.totalPage,
      })
    }
  }, [authorizationsData])

  const onRevokeClick = useCallback(
    async (authorization: UserOAuthAuthorization) => {
      const confirmed = await alertDialog.confirm(
        t('confirm'),
        t('oauthRevokeAuthorizationConfirm', {
          name: authorization.clientName,
        }),
        'danger'
      )
      if (!confirmed) return

      const { code } = await revokeUserAuthorization(authorization.clientID)
      if (!code) {
        void refetchAuthorizations()
      }
    },
    [alertDialog, t, refetchAuthorizations]
  )

  const onRevokeAllClick = useCallback(async () => {
    setShowRevokeAllDialog(false)

    const { code } = await revokeAllUserAuthorizations()
    if (!code) {
      void refetchAuthorizations()
    }
  }, [refetchAuthorizations])

  const columns: ColumnDef<UserOAuthAuthorization>[] = [
    {
      accessorKey: 'clientName',
      header: t('oauthAppName'),
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          {row.original.client?.logoURL && (
            <img
              src={row.original.client.logoURL}
              alt={row.original.clientName}
              className="w-8 h-8 rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          )}
          <div>
            <div className="font-medium">{row.original.clientName}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.clientID}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'authorizedAt',
      header: t('oauthAuthorizedAt'),
      cell: ({ cell }) => (
        <span>{timeFmt(cell.getValue<string>(), 'YYYY-M-D HH:mm')}</span>
      ),
    },
    {
      accessorKey: 'lastUsedAt',
      header: t('oauthLastUsedAt'),
      cell: ({ row }) => {
        const lastUsedAt = row.original.lastUsedAt
        return (
          <span className="text-muted-foreground">
            {lastUsedAt ? timeFmt(lastUsedAt, 'YYYY-M-D HH:mm') : t('never')}
          </span>
        )
      },
    },
    {
      accessorKey: 'permissions',
      header: t('oauthPermissions'),
      cell: ({ row }) => <PermissionBadges authorization={row.original} />,
    },
    {
      accessorKey: 'isActive',
      header: t('status'),
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? t('active') : t('revoked')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: t('operations'),
      cell: ({ row }) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onRevokeClick(row.original)}
          className="text-red-600"
          disabled={!row.original.isActive}
        >
          {t('revoke')}
        </Button>
      ),
    },
  ]

  const table = useReactTable({
    data: list,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => `${row.clientID}-${row.id}`,
  })

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Badge variant="secondary">
            {t('oauthAuthorizationCount', { num: pageState.total })}
          </Badge>
        </div>

        {list.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRevokeAllDialog(true)}
          >
            {t('revokeAll')}
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <div className="text-center space-y-4 py-8">
          <Empty text={t('oauthNoAuthorizations')} />
          <p className="text-sm text-muted-foreground">
            {t('oauthNoAuthorizationsNote')}
          </p>
        </div>
      ) : (
        <div className="border rounded-md">
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
        </div>
      )}

      <AlertDialog
        open={showRevokeAllDialog}
        onOpenChange={setShowRevokeAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('oauthRevokeAllConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onRevokeAllClick}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('revokeAll')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
