import { z } from '@/lib/zod-custom'

import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import BContainer from './components/base/BContainer'
import BNav from './components/base/BNav'
import { Button } from './components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './components/ui/command'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './components/ui/form'
import { Input } from './components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './components/ui/popover'
import { Textarea } from './components/ui/textarea'
import { ARTICLE_MAX_CONTENT_LEN, ARTICLE_MAX_TITILE_LEN } from './constants'

const articleScheme = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(ARTICLE_MAX_TITILE_LEN),
  link: z
    .string()
    .optional()
    .transform((val) => {
      return val === undefined || val === '' ? undefined : val.trim()
    })
    .refine(
      (val) =>
        val === undefined || z.string().trim().url().safeParse(val).success,
      '链接格式错误'
    ),
  category: z.string().min(1, '分类不能为空').trim(),
  content: z.string().max(ARTICLE_MAX_CONTENT_LEN),
})

const frameworks = [
  {
    value: 'next.js',
    label: 'Next.js',
  },
  {
    value: 'sveltekit',
    label: 'SvelteKit',
  },
  {
    value: 'nuxt.js',
    label: 'Nuxt.js',
  },
  {
    value: 'remix',
    label: 'Remix',
  },
  {
    value: 'astro',
    label: 'Astro',
  },
]

type ArticleScheme = z.infer<typeof articleScheme>

export default function SubmitPage() {
  const form = useForm<ArticleScheme>({
    resolver: zodResolver(articleScheme),
    defaultValues: {
      title: '',
      link: '',
      category: '',
      content: '',
    },
  })

  const categoryVal = () => form.getValues('category')

  const onSubmit = async (values: ArticleScheme) => {
    console.log('values: ', values)
  }

  const [open, setOpen] = useState(false)
  /* const [value, setValue] = useState('') */

  /* console.log('render submit page') */
  return (
    <>
      <BNav />
      <BContainer>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>标题</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入标题"
                      autoComplete="off"
                      state={fieldState.invalid ? 'invalid' : 'default'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="link"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>链接</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="请输入来源链接"
                      autoComplete="off"
                      type="url"
                      state={fieldState.invalid ? 'invalid' : 'default'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>发布到</FormLabel>
                  <div>
                    <FormControl>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={fieldState.invalid ? 'invalid' : 'outline'}
                            role="combobox"
                            aria-expanded={open}
                            className="w-[200px] justify-between"
                          >
                            {categoryVal()
                              ? frameworks.find(
                                  (framework) =>
                                    framework.value === categoryVal()
                                )?.label
                              : '请选择分类'}
                            <ChevronsUpDown className="opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput placeholder="Search framework..." />
                            <CommandList>
                              <CommandEmpty>No framework found.</CommandEmpty>
                              <CommandGroup>
                                {frameworks.map((framework) => (
                                  <CommandItem
                                    key={framework.value}
                                    value={framework.value}
                                    onSelect={(currentValue) => {
                                      form.setValue(
                                        'category',
                                        currentValue === categoryVal()
                                          ? ''
                                          : currentValue
                                      )
                                      setOpen(false)
                                    }}
                                  >
                                    {framework.label}
                                    <Check
                                      className={cn(
                                        'ml-auto',
                                        categoryVal() === framework.value
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
                    </FormControl>
                  </div>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>内容</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      state={fieldState.invalid ? 'invalid' : 'default'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">提交</Button>
          </form>
        </Form>
      </BContainer>
    </>
  )
}
