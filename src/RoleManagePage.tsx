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
import { timeFmt } from './lib/dayjs-custom'
import { toSync } from './lib/fire-and-forget'
import { ListPageState, Role } from './types/types'

export default function RoleManagePage() {
  const [loading, setLoading] = useState(false)
  const [pageState, setPageState] = useState<ListPageState>({
    ...defaultPageState,
  })
  const [roleList, setRoleList] = useState<Role[]>([])
  const [showRoleForm, setShowRoleForm] = useState(false)

  const [params, setParams] = useSearchParams()

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: 'name',
      header: '名称',
    },
    {
      accessorKey: 'isDefault',
      header: '系统角色',
      cell: ({ cell }) => (cell.getValue() ? '是' : '否'),
    },
    {
      accessorKey: 'level',
      header: '权限级别',
    },
    {
      accessorKey: 'createdAt',
      header: '创建时间',
      cell: ({ cell }) => timeFmt(cell.getValue() as string, 'YYYY-M-D'),
    },
    {
      accessorKey: 'contorles',
      header: '操作',
      cell: () => (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRoleForm(true)}
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
            onClick={() => setShowRoleForm(true)}
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

      <Dialog open={showRoleForm} onOpenChange={setShowRoleForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建角色</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <RoleForm
            onCancel={() => setShowRoleForm(false)}
            onSuccess={() => {
              setShowRoleForm(false)
              fetchRoleList()
            }}
          />
        </DialogContent>
      </Dialog>
    </BContainer>
  )
}
