import { useQuery } from '@tanstack/react-query'
import { XIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebouncedCallback } from 'use-debounce'

import { timeFmt } from '@/lib/dayjs-custom'

import { getUserList } from '@/api/user'
import { ListPageState, Role, UserData } from '@/types/types'

import { Empty } from './Empty'
import RoleSelector from './RoleSelector'
import BAvatar from './base/BAvatar'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

const MEMBER_PAGE_SIZE = 10

const defaultPageState: ListPageState = {
  currPage: 1,
  pageSize: MEMBER_PAGE_SIZE,
  total: 0,
  totalPage: 0,
}

interface MemberSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteFrontId: string
  selectedMembers: UserData[]
  onConfirm: (members: UserData[]) => void
  excludedUserIds?: Array<string | number>
}

export default function MemberSelectionDialog({
  open,
  onOpenChange,
  siteFrontId,
  selectedMembers,
  onConfirm,
  excludedUserIds,
}: MemberSelectionDialogProps) {
  const { t } = useTranslation()
  const [members, setMembers] = useState<UserData[]>([])
  const [pageState, setPageState] = useState<ListPageState>({
    ...defaultPageState,
  })
  const [searchInput, setSearchInput] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selection, setSelection] = useState<Record<string, UserData>>({})
  const selectedRoleIdRef = useRef(selectedRoleId)
  const suppressRoleChangeRef = useRef(false)
  const normalizedExcludedUserIds = useMemo(
    () => excludedUserIds ?? [],
    [excludedUserIds]
  )
  const excludeIdSet = useMemo(() => {
    const set = new Set<string>()
    normalizedExcludedUserIds.forEach((id) => {
      if (id !== undefined && id !== null) {
        set.add(String(id))
      }
    })
    return set
  }, [normalizedExcludedUserIds])

  const { refetch: fetchMembers, isLoading: loading } = useQuery({
    queryKey: [
      'memberSelection',
      siteFrontId,
      currentPage,
      appliedKeyword,
      selectedRoleId,
      normalizedExcludedUserIds,
    ],
    queryFn: async () => {
      if (!siteFrontId) return null
      let targetPage = Math.max(1, currentPage)
      try {
        while (targetPage > 0) {
          const resp = await getUserList(
            targetPage,
            MEMBER_PAGE_SIZE,
            appliedKeyword || undefined,
            selectedRoleId || undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            normalizedExcludedUserIds,
            { siteFrontId }
          )
          if (resp.code) {
            break
          }
          const data = resp.data
          const totalPage =
            data.totalPage && data.totalPage > 0
              ? data.totalPage
              : data.pageSize > 0
                ? Math.max(1, Math.ceil((data.total || 0) / data.pageSize))
                : 1
          const rawList = data.list || []
          const filteredList = rawList.filter(
            (member) => !excludeIdSet.has(String(member.id))
          )

          if (
            filteredList.length === 0 &&
            rawList.length > 0 &&
            targetPage > 1
          ) {
            targetPage -= 1
            continue
          }

          setMembers(filteredList)
          setPageState({
            currPage: Math.min(targetPage, totalPage),
            pageSize: data.pageSize,
            total: data.total,
            totalPage,
          })
          break
        }
      } catch (error) {
        console.error('fetch site members error: ', error)
      }
      return null
    },
    enabled: !!siteFrontId && open,
  })

  useEffect(() => {
    selectedRoleIdRef.current = selectedRoleId
  }, [selectedRoleId])

  const searchMembers = useCallback(
    (keyword: string) => {
      setAppliedKeyword(keyword)
      setCurrentPage(1)
      selectedRoleIdRef.current = selectedRoleId
      void fetchMembers()
    },
    [fetchMembers, selectedRoleId]
  )
  const debouncedSearchMembers = useDebouncedCallback(searchMembers, 500)

  useEffect(
    () => () => {
      debouncedSearchMembers.cancel()
    },
    [debouncedSearchMembers]
  )

  useEffect(() => {
    if (!open || !siteFrontId) return
    debouncedSearchMembers.cancel()
    setSearchInput('')
    setAppliedKeyword('')
    setCurrentPage(1)
    setSelection(
      selectedMembers.reduce<Record<string, UserData>>((acc, member) => {
        if (!excludeIdSet.has(String(member.id))) {
          acc[member.id] = member
        }
        return acc
      }, {})
    )
    setPageState({ ...defaultPageState })
  }, [open, siteFrontId, selectedMembers, excludeIdSet, debouncedSearchMembers])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const onSearchInputChange = useCallback(
    (value: string) => {
      setSearchInput(value)
      if (!open) return
      debouncedSearchMembers(value.trim())
    },
    [open, debouncedSearchMembers]
  )

  const toggleMember = useCallback((user: UserData, checked: boolean) => {
    setSelection((prev) => {
      const next = { ...prev }
      if (checked) {
        next[user.id] = user
      } else {
        delete next[user.id]
      }
      return next
    })
  }, [])

  const toggleAllOnPage = useCallback(
    (checked: boolean) => {
      setSelection((prev) => {
        const next = { ...prev }
        if (checked) {
          members.forEach((member) => {
            next[member.id] = member
          })
        } else {
          members.forEach((member) => {
            delete next[member.id]
          })
        }
        return next
      })
    },
    [members]
  )

  const clearSelectedRole = useCallback(() => {
    suppressRoleChangeRef.current = true
    setSelectedRoleId('')
  }, [])

  const handleConfirm = useCallback(() => {
    onConfirm(Object.values(selection))
    onOpenChange(false)
  }, [onConfirm, onOpenChange, selection])

  const selectedCount = useMemo(
    () => Object.keys(selection).length,
    [selection]
  )

  const allSelectedOnPage = useMemo(() => {
    if (!members.length) {
      return false
    }
    return members.every((member) => selection[member.id])
  }, [members, selection])

  const someSelectedOnPage = useMemo(() => {
    if (!members.length) {
      return false
    }
    return members.some((member) => selection[member.id])
  }, [members, selection])

  const canPaginatePrev = pageState.currPage > 1
  const canPaginateNext =
    pageState.totalPage > 0 && pageState.currPage < pageState.totalPage

  const onRoleChange = useCallback(
    (role: Role | undefined) => {
      if (suppressRoleChangeRef.current) {
        suppressRoleChangeRef.current = false
        return
      }
      const roleId = role?.id ? String(role.id) : ''
      const trimmed = searchInput.trim()
      if (roleId === selectedRoleId) {
        setAppliedKeyword(trimmed)
        return
      }
      debouncedSearchMembers.cancel()
      setSelectedRoleId(roleId)
      setAppliedKeyword(trimmed)
      setCurrentPage(1)
      setPageState({ ...defaultPageState })
    },
    [searchInput, debouncedSearchMembers, selectedRoleId]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('inviteMembers')}</DialogTitle>
          <DialogDescription>{t('inviteMembersDescription')}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative">
              <Input
                placeholder={t('searchMembers')}
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                className="pr-8 w-[160px] h-[40px] text-sm"
              />
              {searchInput && (
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    onSearchInputChange('')
                  }}
                  aria-label={t('clearInput')}
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
            <div className="w-[220px]">
              <RoleSelector
                value={selectedRoleId}
                placeholder={t('selectRole')}
                onChange={onRoleChange}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-[40px]"
            onClick={() => {
              debouncedSearchMembers.cancel()
              setSearchInput('')
              clearSelectedRole()
              setAppliedKeyword('')
              setCurrentPage(1)
              setPageState({ ...defaultPageState })
            }}
          >
            {t('reset')}
          </Button>
        </div>
        <div className="mt-4 border rounded-lg overflow-hidden flex-1 min-h-[320px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allSelectedOnPage ||
                      (someSelectedOnPage && 'indeterminate')
                    }
                    onCheckedChange={(checked) =>
                      toggleAllOnPage(checked === true)
                    }
                    aria-label={t('selectAll')}
                  />
                </TableHead>
                <TableHead>{t('members')}</TableHead>
                <TableHead className="w-32">{t('role')}</TableHead>
                <TableHead className="w-40">{t('joinedAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`skeleton-${idx}`}>
                    <TableCell>
                      <Skeleton className="h-5 w-5 rounded" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-3 w-24" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Empty text={t('noMemberFound')} />
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Checkbox
                        checked={Boolean(selection[member.id])}
                        onCheckedChange={(checked) =>
                          toggleMember(member, checked === true)
                        }
                        aria-label={t('selectRow')}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <BAvatar username={member.name} size={32} />
                        <div>
                          <div className="font-medium">{member.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{member.role?.name || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span>
                        {member.registeredAt
                          ? timeFmt(member.registeredAt, 'YYYY-MM-DD')
                          : '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <div>{t('selectedMembersCount', { num: selectedCount })}</div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!canPaginatePrev}
              onClick={() => handlePageChange(pageState.currPage - 1)}
            >
              {t('prevPage')}
            </Button>
            <span className="text-xs">
              {pageState.totalPage > 0
                ? t('pageIndicator', {
                    page: pageState.currPage,
                    total: pageState.totalPage,
                  })
                : t('pageIndicator', { page: 1, total: 1 })}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!canPaginateNext}
              onClick={() => handlePageChange(pageState.currPage + 1)}
            >
              {t('nextPage')}
            </Button>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm}>{t('confirmSelection')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
