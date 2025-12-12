import {
  Link as BaseLink,
  useNavigate as baseUseNavigate,
  useParams as baseUseParams,
  useSearch as baseUseSearch,
} from '@tanstack/react-router'
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react'

import { ensureSearchState } from './search'

type BaseLinkProps = ComponentPropsWithoutRef<typeof BaseLink>

export type SearchState = Record<string, string | undefined>
type SearchUpdater = (prev: SearchState) => SearchState
type LooseSearch = SearchState | SearchUpdater
type LooseParams = Record<string, string | undefined>

type LooseLinkProps = Omit<
  BaseLinkProps,
  'to' | 'params' | 'search' | 'state'
> & {
  to: string
  params?: LooseParams
  search?: LooseSearch
  state?: unknown
}

export const Link = forwardRef<HTMLAnchorElement, LooseLinkProps>(
  (props, ref) => {
    const { to, params, search, state, ...rest } = props
    return (
      <BaseLink
        to={to as BaseLinkProps['to']}
        params={params as BaseLinkProps['params']}
        search={search as BaseLinkProps['search']}
        state={state as BaseLinkProps['state']}
        {...(rest as Omit<BaseLinkProps, 'to' | 'params' | 'search' | 'state'>)}
        ref={ref}
      />
    )
  }
)

Link.displayName = 'AppLink'

export type LinkProps = LooseLinkProps

type LooseNavigateOptions = {
  to?: string
  params?: LooseParams
  search?: LooseSearch
  state?: unknown
  hash?: string
  replace?: boolean
  viewTransition?: boolean
} & Record<string, unknown>

export const useNavigate = () => {
  const navigate = baseUseNavigate()
  const safeNavigate = navigate as unknown as (
    opts: LooseNavigateOptions
  ) => Promise<void>

  const runNavigate = (opts: LooseNavigateOptions) => {
    void safeNavigate(opts)
  }

  return (
    to: string | number | LooseNavigateOptions,
    options?: LooseNavigateOptions
  ) => {
    if (typeof to === 'number') {
      window.history.go(to)
      return
    }

    if (typeof to === 'string') {
      runNavigate({ ...(options ?? {}), to })
      return
    }

    runNavigate(to)
  }
}

export const useSearch = (): SearchState =>
  ensureSearchState(baseUseSearch({ strict: false }))

export const useParams = (): Record<string, string | undefined> =>
  ensureSearchState(baseUseParams({ strict: false }))
