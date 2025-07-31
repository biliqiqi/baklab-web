import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { toSync } from '@/lib/fire-and-forget'
import { cn, noop } from '@/lib/utils'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { getRole, getRoles } from '@/api/role'
import { DEFAULT_PAGE_SIZE } from '@/constants/constants'
import { Role } from '@/types/types'

import { BLoaderBlock } from './base/BLoader'
import { Button } from './ui/button'

export interface RoleSelectorProps {
  valid?: boolean
  value: string
  placeholder?: string
  onChange?: (role: Role | undefined) => void
}

const RoleSelector = ({
  valid = true,
  value = '',
  placeholder = '请选择',
  onChange = noop,
}: RoleSelectorProps) => {
  const [searchLoading, setSearchLoading] = useState(false)
  const [roleOptions, setRoleOptions] = useState<Role[]>([])
  const [openRoleOptions, setOpenRoleOptions] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState(value)
  const searchTimer = useRef<number | null>(null)

  const [defaultRole, setDefaultRole] = useState<Role | null>(null)

  const { siteFrontId } = useParams()

  const selectedRole = useMemo(() => {
    if (defaultRole) {
      return defaultRole
    } else {
      return roleOptions.find((role) => role.id === selectedRoleId)
    }
  }, [selectedRoleId, roleOptions, defaultRole])

  const selectedRoleName = useMemo(
    () => selectedRole?.name || '',
    [selectedRole]
  )

  const searchRoleList = useCallback(
    (keywords: string) => {
      if (searchTimer.current) clearTimeout(searchTimer.current)

      searchTimer.current = setTimeout(
        toSync(async () => {
          setSearchLoading(true)

          const { code, data } = await getRoles(
            1,
            DEFAULT_PAGE_SIZE,
            keywords,
            { siteFrontId }
          )
          if (!code && data.list) {
            const { list } = data
            setRoleOptions(() => [...list])
          } else {
            setRoleOptions(() => [])
          }
          setSearchLoading(false)
        }),
        200
      ) as unknown as number
    },
    [siteFrontId]
  )

  const fetchRole = toSync(
    useCallback(async () => {
      if (!value) return

      const { code, data } = await getRole(value, { siteFrontId })
      if (!code) {
        setDefaultRole(data)
      }
    }, [siteFrontId])
  )

  useEffect(() => {
    onChange(selectedRole)
  }, [selectedRoleId, selectedRole])

  useEffect(() => {
    /* console.log('value change: ', value) */
    setSelectedRoleId(value)
    if (value) {
      fetchRole()
    } else {
      setDefaultRole(null)
    }
    searchRoleList('')
  }, [value])

  /* console.log('openRoleOptions: ', openRoleOptions) */

  return (
    <Popover
      open={openRoleOptions}
      onOpenChange={setOpenRoleOptions}
      modal={true}
    >
      <PopoverTrigger asChild>
        <Button
          variant={!valid ? 'invalid' : 'outline'}
          role="combobox"
          className={cn(
            'justify-between text-gray-700',
            !value && 'text-gray-500'
          )}
          size="sm"
        >
          {value ? selectedRoleName : placeholder}
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="搜索角色.."
            onValueChange={searchRoleList}
          />
          <CommandList>
            <CommandEmpty>
              {searchLoading ? <BLoaderBlock /> : '未找到角色'}
            </CommandEmpty>
            <CommandGroup>
              {roleOptions.map((role) => (
                <CommandItem
                  key={role.id}
                  value={role.id}
                  onSelect={(currentValue) => {
                    const sameVal = currentValue === selectedRoleId
                    setDefaultRole(null)
                    setSelectedRoleId(sameVal ? '' : currentValue)
                    setOpenRoleOptions(false)
                  }}
                >
                  {role.name}
                  <CheckIcon
                    className={cn(
                      'ml-auto',
                      selectedRoleId === role.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default RoleSelector
