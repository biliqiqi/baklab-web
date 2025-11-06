import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn, noop } from '@/lib/utils'

import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { AUTH_TYPE } from '@/types/types'

import { Button } from './ui/button'

export interface AuthSource {
  value: string
  label: string
}

export interface AuthSourceSelectorProps {
  value: string
  placeholder?: string
  onChange?: (authSource: AuthSource | undefined) => void
}

const AuthSourceSelector = ({
  value = '',
  placeholder = '',
  onChange = noop,
}: AuthSourceSelectorProps) => {
  const [open, setOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(value)

  const { t } = useTranslation()

  const authSources: AuthSource[] = useMemo(
    () => [
      { value: AUTH_TYPE.SELF, label: t('authSourceSelf') },
      { value: AUTH_TYPE.GOOGLE, label: t('authSourceGoogle') },
      { value: AUTH_TYPE.GITHUB, label: t('authSourceGithub') },
      { value: AUTH_TYPE.MICROSOFT, label: t('authSourceMicrosoft') },
    ],
    [t]
  )

  const selectedAuthSource = useMemo(() => {
    return authSources.find((source) => source.value === selectedValue)
  }, [selectedValue, authSources])

  const selectedLabel = useMemo(
    () => selectedAuthSource?.label || '',
    [selectedAuthSource]
  )

  const handleSelect = useCallback(
    (currentValue: string) => {
      const sameVal = currentValue === selectedValue
      const newValue = sameVal ? '' : currentValue
      setSelectedValue(newValue)
      setOpen(false)

      const selected = authSources.find((source) => source.value === newValue)
      onChange(selected)
    },
    [selectedValue, authSources, onChange]
  )

  useEffect(() => {
    setSelectedValue(value)
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn('justify-between', !value && 'text-text-secondary')}
          size="sm"
        >
          {value ? selectedLabel : placeholder}
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {authSources.map((source) => (
                <CommandItem
                  key={source.value}
                  value={source.value}
                  onSelect={handleSelect}
                >
                  {source.label}
                  <CheckIcon
                    className={cn(
                      'ml-auto',
                      selectedValue === source.value
                        ? 'opacity-100'
                        : 'opacity-0'
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

export default AuthSourceSelector
