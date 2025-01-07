import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

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

import { getRoles } from '@/api/role'
import { DEFAULT_PAGE_SIZE } from '@/constants/constants'
import { Role } from '@/types/types'

import { BLoaderBlock } from './base/BLoader'
import { Button } from './ui/button'

export interface RoleSelectorProps {
  valid?: boolean
  value?: string
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
  const [searchRole, setSearchRole] = useState('')

  const selectedRole = useMemo(() => {
    return roleOptions.find((role) => role.id === selectedRoleId)
  }, [selectedRoleId, roleOptions])

  const selectedRoleName = useMemo(
    () => selectedRole?.name || '',
    [selectedRole]
  )

  const searchRoleList = toSync(async (keywords?: string) => {
    setSearchLoading(true)

    const { code, data } = await getRoles(1, DEFAULT_PAGE_SIZE, keywords)
    if (!code && data.list) {
      console.log('role list: ', data)
      setRoleOptions([...data.list])
    } else {
      setRoleOptions([])
    }
    setSearchLoading(false)
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      searchRoleList(searchRole)
    }, 200)

    return () => {
      clearTimeout(timer)
    }
  }, [searchRole])

  useEffect(() => {
    onChange(selectedRole)
  }, [selectedRoleId])

  /* console.log(
   *   'role ids: ',
   *   roleOptions.map((item) => item.id)
   * ) */

  return (
    <Popover open={openRoleOptions} onOpenChange={setOpenRoleOptions}>
      <PopoverTrigger asChild>
        <Button
          variant={!valid ? 'invalid' : 'outline'}
          role="combobox"
          className="justify-between text-gray-700"
          size="sm"
        >
          {selectedRoleId && selectedRoleName ? selectedRoleName : placeholder}
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="搜索角色.."
            onValueChange={setSearchRole}
          />
          <CommandList>
            {searchLoading ? (
              <BLoaderBlock />
            ) : (
              <CommandEmpty>未找到角色</CommandEmpty>
            )}
            <CommandGroup>
              {roleOptions.map((role) => (
                <CommandItem
                  key={role.id}
                  value={role.id}
                  onSelect={(currentValue) => {
                    console.log('currentValue: ', currentValue)
                    setSelectedRoleId(
                      currentValue === selectedRoleId ? '' : currentValue
                    )
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
