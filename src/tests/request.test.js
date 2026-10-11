// @vitest-environment node
import { HTTPError } from 'ky'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import request, { authRequest, refreshAuthState } from '../lib/request'
import {
  emptyAuthedUserData,
  useAuthedUserStore,
  useNotificationStore,
  useToastStore,
} from '../state/global'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('@/i18n', () => ({ default: { language: 'en', t: (key) => key } }))
vi.hoisted(() => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} }
})

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const authData = {
  token: 'new-token',
  username: 'tester',
  userID: '1',
  user: null,
}

beforeEach(() => {
  useAuthedUserStore.setState({ ...emptyAuthedUserData })
  useToastStore.setState({ silence: true })
  vi.stubGlobal('fetch', vi.fn())
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('plain-text rate limiting rejects without retrying or returning empty data', async () => {
  fetch.mockResolvedValue(new Response('Too Many Requests', { status: 429 }))

  await expect(request.get('context')).rejects.toMatchObject({
    response: { status: 429 },
  })
  expect(fetch).toHaveBeenCalledTimes(1)
})

test('server errors do not reach the unread count success path', async () => {
  fetch.mockResolvedValue(json({ message: 'Unavailable' }, 503))
  useNotificationStore.setState({ unreadCount: 7 })

  await expect(
    useNotificationStore.getState().fetchUnread()
  ).rejects.toBeInstanceOf(HTTPError)
  expect(useNotificationStore.getState().unreadCount).toBe(7)
})

test('business validation errors retain their error code for form handling', async () => {
  fetch.mockResolvedValue(json({ code: 1000, message: 'Account exists' }, 400))

  await expect(request.post('signup')).resolves.toMatchObject({ code: 1000 })
})

test('concurrent unauthorized requests share a refresh and retry with the new token', async () => {
  useAuthedUserStore.getState().updateBaseData('old-token', 'tester', '1')
  let completeRefresh
  const refreshResponse = new Promise((resolve) => {
    completeRefresh = resolve
  })
  fetch.mockImplementation((req) => {
    if (new URL(req.url).pathname.endsWith('/refresh_token')) {
      return refreshResponse
    }
    if (req.headers.get('Authorization') === 'Bearer new-token') {
      return Promise.resolve(json({ code: 0, data: { total: 3 } }))
    }
    return Promise.resolve(json({ code: 1 }, 401))
  })

  const responses = Promise.all([
    authRequest.get('context'),
    authRequest.get('sites/joins'),
    authRequest.get('messages/unread_count'),
  ])
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))
  completeRefresh(json({ code: 0, data: authData }))

  await expect(responses).resolves.toHaveLength(3)
  expect(fetch).toHaveBeenCalledTimes(7)
  expect(
    fetch.mock.calls.filter(([req]) => req.url.includes('/refresh_token'))
  ).toHaveLength(1)
})

test('a late unauthorized response uses the token already refreshed by another request', async () => {
  useAuthedUserStore.getState().updateBaseData('old-token', 'tester', '1')
  let completeStaleRequest
  fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeStaleRequest = resolve
      })
  )
  fetch.mockResolvedValue(json({ code: 0, data: { total: 3 } }))

  const response = authRequest.get('messages/unread_count')
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  useAuthedUserStore.getState().updateBaseData('new-token', 'tester', '1')
  completeStaleRequest(json({ code: 1 }, 401))

  await expect(response).resolves.toMatchObject({ code: 0 })
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(fetch.mock.calls[1][0].headers.get('Authorization')).toBe(
    'Bearer new-token'
  )
})

test('custom response hooks run once for each authenticated request', async () => {
  const afterResponse = vi.fn()
  fetch.mockResolvedValue(json({ code: 0, data: {} }))

  await authRequest.get('context', {}, { afterResponseHooks: [afterResponse] })
  expect(afterResponse).toHaveBeenCalledTimes(1)
})

test('an unread count response missing data does not throw a TypeError', async () => {
  fetch.mockResolvedValue(json({ code: 0 }))

  await expect(useNotificationStore.getState().fetchUnread()).resolves.toBe(0)
})

test('a request still unauthorized after refreshing stops after one auth retry', async () => {
  fetch.mockImplementation((req) =>
    Promise.resolve(
      req.url.includes('/refresh_token')
        ? json({ code: 0, data: authData })
        : json({ code: 1 }, 401)
    )
  )

  await expect(authRequest.get('context')).rejects.toMatchObject({
    response: { status: 401 },
  })
  expect(fetch).toHaveBeenCalledTimes(3)
})

test('malformed refresh responses fail without updating authentication', async () => {
  fetch.mockResolvedValue(json({}))

  await expect(refreshAuthState(true)).resolves.toBe(false)
  expect(useAuthedUserStore.getState().authToken).toBe('')
  expect(console.error).not.toHaveBeenCalled()
})

test('a user data refresh waits for an existing token-only refresh', async () => {
  let completeRefresh
  fetch.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        completeRefresh = resolve
      })
  )
  fetch.mockResolvedValue(json({ code: 0, data: authData }))

  const tokenOnly = refreshAuthState()
  const withUser = refreshAuthState(true)
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  completeRefresh(json({ code: 0, data: authData }))

  await expect(Promise.all([tokenOnly, withUser])).resolves.toEqual([
    true,
    true,
  ])
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(
    new URL(fetch.mock.calls[1][0].url).searchParams.get('refresh_data')
  ).toBe('1')
})
