import { expect, test } from 'vitest'
import { useAuthedUserStore } from '../state/global'

const authStore = useAuthedUserStore.getState()
const userData = {
  authToken: '876bbf90-a7ac-4177-b9e6-f9abec141107',
  username: 'test',
  userID: '1',
  role: 'common_user',
}

test('common user create article should be permitted', () => {
  authStore.updateObj(() => userData)
  expect(authStore.permit('article', 'create')).toBe(true)
})

test("common user edit others article shouldn't be permitted", () => {
  authStore.updateObj(() => userData)
  expect(authStore.permit('article', 'edit_others')).toBe(false)
})

test("non-existent role create article shouldn't be permitted", () => {
  authStore.updateObj(() => ({ ...userData, role: 'xxx' }))
  expect(authStore.permit('article', 'create')).toBe(false)
})

test("non-existent module create article shouldn't be permitted", () => {
  authStore.updateObj(() => userData)
  expect(authStore.permit('xxx', 'create')).toBe(false)
})

test("non-existent action create article shouldn't be permitted", () => {
  authStore.updateObj(() => userData)
  expect(authStore.permit('article', 'xxx')).toBe(false)
})
