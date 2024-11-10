import React from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { SITE_NAME } from '@/contants'

import { Button } from '../ui/button'

const BNav = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      'flex justify-between py-2 px-4 border-b-2 shadow-sm items-center',
      className
    )}
    ref={ref}
    {...props}
  >
    <Link className="font-bold" to="/">
      {SITE_NAME}
    </Link>
    <div>
      <Button size="sm" asChild>
        <Link to="/submit">+ 提交</Link>
      </Button>
      <Button size="sm" asChild className="ml-2">
        <Link to="/signup">注册 / 登录</Link>
      </Button>
    </div>
  </div>
))

BNav.displayName = 'BNav'

export default BNav
