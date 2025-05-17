import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { toSync } from '@/lib/fire-and-forget'
import { cn, noop } from '@/lib/utils'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

import { getContentForms } from '@/api/site'
import { defaultContentForm } from '@/constants/defaults'
import i18n from '@/i18n'
import { ContentForm, StringFn } from '@/types/types'

import { BLoaderBlock } from './base/BLoader'
import { Button } from './ui/button'

export interface ContentFormSelectorProps {
  valid?: boolean
  value: string
  placeholder?: string | StringFn
  disabled?: boolean
  onChange?: (id: string) => void
}

const ContentFormSelector = forwardRef<
  HTMLButtonElement | null,
  ContentFormSelectorProps
>(
  (
    {
      valid = true,
      value = '0',
      disabled = false,
      placeholder = () => i18n.t('pleaseSelect'),
      onChange = noop,
    },
    ref
  ) => {
    const [searchLoading, setSearchLoading] = useState(false)
    const [contentFormOptions, setContentFormOptions] = useState<ContentForm[]>(
      []
    )
    const [openContentFormOptions, setOpenContentFormOptions] = useState(false)
    const [selectedContentFormId, setSelectedContentFormId] = useState(value)
    const searchTimer = useRef<number | null>(null)

    const { t } = useTranslation()

    const defaultOption: ContentForm = {
      ...defaultContentForm,
      id: '0',
      name: t('regularPost'),
    }

    /* const [defaultContentForm, setDefaultContentForm] =
     *   useState<ContentForm | null>(null) */

    const { siteFrontId } = useParams()

    const selectedContentForm = useMemo(() => {
      return contentFormOptions.find(
        (item) => item.id === selectedContentFormId
      )
    }, [selectedContentFormId, contentFormOptions])

    const selectedContentFormName = useMemo(
      () => selectedContentForm?.name || '',
      [selectedContentForm]
    )

    const fetchContentFormList = useCallback(() => {
      if (!siteFrontId) return

      if (searchTimer.current) clearTimeout(searchTimer.current)

      searchTimer.current = setTimeout(
        toSync(async () => {
          setSearchLoading(true)

          const { code, data } = await getContentForms(siteFrontId)
          if (!code && data.list) {
            const { list } = data
            setContentFormOptions(() => [defaultOption, ...list])
          } else {
            setContentFormOptions(() => [defaultOption])
          }
          setSearchLoading(false)
        }),
        200
      ) as unknown as number
    }, [siteFrontId, defaultOption])

    const onSelect = useCallback(
      (val: string) => {
        onChange(val)
        setSelectedContentFormId(val)
        setOpenContentFormOptions(false)
      },
      [onChange]
    )

    useEffect(() => {
      /* console.log('value change: ', value) */
      fetchContentFormList()
      setSelectedContentFormId(value)
    }, [value])

    return (
      <Popover
        open={openContentFormOptions}
        onOpenChange={setOpenContentFormOptions}
        modal={true}
      >
        <PopoverTrigger asChild>
          <Button
            variant={!valid ? 'invalid' : 'outline'}
            role="combobox"
            className={cn(
              'w-[200px] justify-between text-gray-700',
              !value && 'text-gray-500'
            )}
            size="sm"
            disabled={disabled}
            ref={ref}
          >
            {value
              ? selectedContentFormName
              : typeof placeholder == 'function'
                ? placeholder()
                : placeholder}
            <ChevronsUpDownIcon className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>{searchLoading && <BLoaderBlock />}</CommandEmpty>
              <CommandGroup>
                {contentFormOptions.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={onSelect}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        {item.name}
                        <CheckIcon
                          className={cn(
                            'ml-auto',
                            selectedContentFormId === item.id
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                      </div>
                      <div className="text-gray-500 text-xs">
                        {item.description}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)

export default ContentFormSelector
