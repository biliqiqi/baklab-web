import { StrictMode, act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { useAppInitialization } from '../hooks/use-app-initialization'
import { useWindowFocusRefresh } from '../hooks/use-window-focus-refresh'
import { refreshAuthState } from '../lib/request'
import {
  emptyAuthedUserData,
  useAuthedUserStore,
  useContextStore,
  useNotificationStore,
  useSiteStore,
} from '../state/global'

vi.mock('../lib/request', () => ({
  default: {},
  authRequest: {},
  refreshAuthState: vi.fn(),
}))

let root
let container
const reconnect = vi.fn()
const fetchContext = vi.fn()
const fetchUnread = vi.fn()
const fetchSiteList = vi.fn()
const initialAuth = useAuthedUserStore.getState()
const initialContext = useContextStore.getState()
const initialNoti = useNotificationStore.getState()
const initialSite = useSiteStore.getState()

const Harness = () => {
  const initialized = useAppInitialization()
  useWindowFocusRefresh(reconnect)
  return createElement('span', null, initialized ? 'ready' : 'loading')
}

const mount = async () => {
  await act(async () => {
    root.render(createElement(StrictMode, null, createElement(Harness)))
  })
}

const focus = async () => {
  await act(async () => {
    window.dispatchEvent(new Event('focus'))
    await vi.advanceTimersByTimeAsync(1000)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  fetchContext.mockResolvedValue(undefined)
  fetchUnread.mockResolvedValue(0)
  fetchSiteList.mockResolvedValue(undefined)
  refreshAuthState.mockResolvedValue(true)
  useContextStore.setState({ fetchContext })
  useNotificationStore.setState({ fetchUnread })
  useSiteStore.setState({ fetchSiteList })
  useAuthedUserStore.getState().updateBaseData('old-token', 'tester', '1')
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  useAuthedUserStore.setState(initialAuth, true)
  useContextStore.setState(initialContext, true)
  useNotificationStore.setState(initialNoti, true)
  useSiteStore.setState(initialSite, true)
  vi.useRealTimers()
  delete globalThis.IS_REACT_ACT_ENVIRONMENT
})

test('StrictMode and repeated token rotations do not repeat app initialization', async () => {
  await mount()
  expect(container.textContent).toBe('ready')
  expect(fetchContext).toHaveBeenCalledTimes(1)
  expect(fetchSiteList).toHaveBeenCalledTimes(1)
  expect(fetchUnread).toHaveBeenCalledTimes(1)

  for (let i = 0; i < 5; i++) {
    await act(async () => {
      useAuthedUserStore.getState().updateBaseData(`token-${i}`, 'tester', '1')
    })
  }

  expect(fetchContext).toHaveBeenCalledTimes(1)
  expect(fetchSiteList).toHaveBeenCalledTimes(1)
  expect(fetchUnread).toHaveBeenCalledTimes(1)
})

test('focus waits for authentication and ignores overlapping refreshes', async () => {
  await mount()
  fetchUnread.mockClear()
  let finishRefresh
  refreshAuthState.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishRefresh = resolve
      })
  )

  await focus()
  await focus()
  expect(refreshAuthState).toHaveBeenCalledTimes(1)
  expect(fetchUnread).not.toHaveBeenCalled()

  await act(async () => {
    useAuthedUserStore.getState().updateBaseData('new-token', 'tester', '1')
    finishRefresh(true)
  })

  expect(fetchUnread).toHaveBeenCalledTimes(1)
  expect(fetchContext).toHaveBeenCalledTimes(1)
  expect(fetchSiteList).toHaveBeenCalledTimes(1)
})

test('failed authentication on focus does not request unread counts', async () => {
  await mount()
  fetchUnread.mockClear()
  refreshAuthState.mockResolvedValue(false)

  await focus()
  expect(fetchUnread).not.toHaveBeenCalled()
})

test('anonymous initialization and focus do not request authenticated lists', async () => {
  useAuthedUserStore.setState({ ...emptyAuthedUserData })
  refreshAuthState.mockResolvedValue(false)
  await mount()
  await focus()

  expect(container.textContent).toBe('ready')
  expect(refreshAuthState).toHaveBeenCalledTimes(1)
  expect(fetchContext).toHaveBeenCalledTimes(1)
  expect(fetchUnread).not.toHaveBeenCalled()
  expect(fetchSiteList).not.toHaveBeenCalled()
})

test('switching users reloads their lists without fetching context again', async () => {
  await mount()
  await act(async () => {
    useAuthedUserStore.getState().updateBaseData('other-token', 'other', '2')
  })

  expect(fetchContext).toHaveBeenCalledTimes(1)
  expect(fetchSiteList).toHaveBeenCalledTimes(2)
  expect(fetchUnread).toHaveBeenCalledTimes(2)
})

test('unmounting cancels a pending focus refresh', async () => {
  await mount()
  window.dispatchEvent(new Event('focus'))
  await act(async () => root.unmount())
  await vi.advanceTimersByTimeAsync(1000)

  expect(refreshAuthState).not.toHaveBeenCalled()
  expect(reconnect).not.toHaveBeenCalled()
})
