import { expect, test } from 'vitest'

import { useAuthedUserStore } from '../state/global'

const authStore = useAuthedUserStore.getState()
const userData = {
  authToken: '876bbf90-a7ac-4177-b9e6-f9abec141107',
  username: 'test',
  userID: '1',
  user: {
    id: '1',
    name: 'test',
    email: 'test@example.com',
    registeredAt: '2024-01-01T00:00:00Z',
    registeredAtStr: '2024-01-01',
    introduction: '',
    deleted: false,
    banned: false,
    roleName: 'Common User',
    roleFrontId: 'common_user',
    role: {
      id: '1',
      frontId: 'common_user',
      name: 'Common User',
      level: 1,
    },
    siteRole: null,
    permissions: [
      {
        id: '1',
        frontId: 'article.create',
        name: 'Create Article',
        createdAt: '2024-01-01T00:00:00Z',
        module: 'article',
      },
    ],
    super: false,
    authFrom: 'self',
    reputation: 0,
    bannedStartAt: '',
    bannedEndAt: '',
    bannedMinutes: 0,
    bannedCount: 0,
    uiSettings: null,
    showRoleName: true,
  },
  currRole: null,
}

test('common user create article should be permitted', () => {
  authStore.updateObj(() => userData)
  expect(authStore.permit('article', 'create')).toBe(true)
})

test("common user edit others article shouldn't be permitted", () => {
  authStore.updateObj(() => userData)
  expect(authStore.permit('article', 'edit_others')).toBe(false)
})

test("non-existent module create article shouldn't be permitted", () => {
  authStore.updateObj(() => userData)
  expect(authStore.permit('xxx', 'create')).toBe(false)
})

test("non-existent action create article shouldn't be permitted", () => {
  authStore.updateObj(() => userData)
  expect(authStore.permit('article', 'xxx')).toBe(false)
})
