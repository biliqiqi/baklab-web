import { z } from '@/lib/zod-custom'

import { Button } from '../ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form'
import { Input } from '../ui/input'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

const testScheme = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
})

/* const emailSchema = z.string().email()
 *
 * try {
 *   const msg = emailSchema.parse('abc')
 *   console.log('msg: ', msg)
 * } catch (e) {
 *   console.log('parse err: ', e)
 * } */

type TestScheme = z.infer<typeof testScheme>

export default function BForm() {
  const form = useForm<TestScheme>({
    resolver: zodResolver(testScheme),
    defaultValues: {
      username: '',
      email: '',
    },
  })

  const onSubmit = (values: TestScheme) => {
    console.log('values: ', values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel errorHighlight={false}>用户名</FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入用户名"
                  autoComplete="off"
                  state={fieldState.invalid ? 'invalid' : 'default'}
                  {...field}
                />
              </FormControl>
              {/* <FormDescription>用于公共展示的用户名称</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel errorHighlight={false}>邮箱</FormLabel>
              <FormControl>
                <Input
                  placeholder="请输入邮箱"
                  autoComplete="off"
                  {...field}
                  state={fieldState.invalid ? 'invalid' : 'default'}
                />
              </FormControl>
              {/* <FormDescription>账户关联的邮箱</FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">提交</Button>
      </form>
    </Form>
  )
}
