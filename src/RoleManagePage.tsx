import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import BContainer from './components/base/BContainer'
import { BLoaderBlock } from './components/base/BLoader'

import { Empty } from './components/Empty'
import { ListPagination } from './components/ListPagination'
import RoleForm from './components/RoleForm'

import { getRoles } from './api/role'
import { defaultPageState } from './constants/defaults'
import { toSync } from './lib/fire-and-forget'
import { useAlertDialogStore } from './state/global'
import { ListPageState, Role } from './types/types'

interface EditRoleState {
  editting: boolean
  role?: Role
}

export default function RoleManagePage() {
  const [loading, setLoading] = useState(false)
  const [pageState, setPageState] = useState<ListPageState>({
    ...defaultPageState,
  })
  const [roleList, setRoleList] = useState<Role[]>([])
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleFormDirty, setRoleFormDirty] = useState(false)

  const [editRole, setEditRole] = useState<EditRoleState>({
    editting: false,
    role: undefined,
  })

  const [params] = useSearchParams()

  const alertDialog = useAlertDialogStore()

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'name',
      header: '名称',
    },
    {
      accessorKey: 'level',
      header: '权限级别',
    },
    {
      accessorKey: 'relateUserCount',
      header: '关联用户',
    },
    {
      accessorKey: 'contorles',
      header: '操作',
      cell: ({ row }) => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditRole({
                editting: true,
                role: row.original,
              })
              setShowRoleForm(true)
            }}
          >
            详细
          </Button>
        </>
      ),
    },
  ]

  const table = useReactTable({
    data: roleList,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const fetchRoleList = toSync(
    useCallback(async () => {
      setLoading(true)
      const page = parseInt(params.get('page') || '', 10) || 1
      const { code, data } = await getRoles(page)
      if (!code) {
        console.log('role list: ', data)
        setRoleList([...data.list])
        setPageState({
          currPage: data.currPage,
          pageSize: data.pageSize,
          total: data.total,
          totalPage: data.totalPage,
        })
      } else {
        setRoleList([])
        setPageState({ ...defaultPageState })
      }
      setLoading(false)
    }, [params])
  )

  const onRoleFormClose = useCallback(async () => {
    if (roleFormDirty) {
      const { editting } = editRole
      alertDialog.setState((state) => ({
        ...state,
        confirmBtnText: '确定舍弃',
        cancelBtnText: editting ? '继续设置' : '继续添加',
      }))
      const confirmed = await alertDialog.confirm(
        '确认',
        editting ? '角色数据有改动，确认舍弃？' : '角色添加未完成，确认舍弃？'
      )
      if (confirmed) {
        setShowRoleForm(false)
      }
    } else {
      setShowRoleForm(false)
    }
  }, [roleFormDirty, editRole])

  useEffect(() => {
    fetchRoleList()
  }, [params])

  /* useEffect(() => {
   *   fetchRoleList()
   * }, []) */

  return (
    <BContainer
      category={{
        isFront: true,
        frontId: 'role_manage',
        name: '角色',
        describe: '',
      }}
    >
      <div className="flex justify-between items-center">
        <div>
          <Badge variant="secondary">{pageState.total} 个用户角色</Badge>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditRole({
                editting: false,
                role: undefined,
              })
              setShowRoleForm(true)
            }}
          >
            + 添加
          </Button>
        </div>
      </div>

      {loading && <BLoaderBlock />}

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

      <Dialog open={showRoleForm} onOpenChange={onRoleFormClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editRole.editting ? '角色详情' : '创建角色'}
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <RoleForm
            isEdit={editRole.editting}
            role={editRole.role}
            onCancel={onRoleFormClose}
            onSuccess={() => {
              setShowRoleForm(false)
              fetchRoleList()
            }}
            onChange={(dirty) => {
              setRoleFormDirty(dirty)
            }}
          />
        </DialogContent>
      </Dialog>
    </BContainer>
  )
}
