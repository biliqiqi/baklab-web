import { Page, expect, test } from '@playwright/test'

import {
  clickNextStep,
  clickSubmit,
  config,
  fillVerificationCode,
  generateRandomEmail,
  generateRandomUsername,
  signInAsAdmin,
  waitForSignupSuccess,
} from './helpers'

interface MockBannedItem {
  id: number
  ipAddress: string
  banned: boolean
  bannedStartAt: string
  bannedEndAt: string
  bannedMinutes: number
  reason: string
  operatorId: number
  operatorName: string
  createdAt: string
  updatedAt: string
}

interface MockUserLoginIP {
  ipAddress: string
  lastLoginAt: string
  loginCount: number
  banned: boolean
}

function generateRandomIP(): string {
  const octet3 = Math.floor(Math.random() * 254) + 1
  const octet4 = Math.floor(Math.random() * 254) + 1
  return `198.51.${octet3}.${octet4}`
}

test.describe('Banned IP Management', () => {
  test.describe.configure({ mode: 'serial' })

  const testIP = generateRandomIP()
  const batchIP = generateRandomIP()
  const userLoginIP = `203.0.113.${Math.floor(Math.random() * 250) + 2}`
  const testUser = {
    email: generateRandomEmail(),
    username: generateRandomUsername(),
    password: config.testPassword,
  }

  let backendSupportsBannedIP: boolean | null = null
  let mockBannedList: MockBannedItem[] = []
  let mockUserLoginIPs: MockUserLoginIP[] = []
  let mockNextId = 1

  async function installBannedIPMocks(page: Page) {
    // 1. Unban many
    await page.route(
      (url) => url.pathname.endsWith('/api/banned_ips/unban_many'),
      async (route) => {
        if (route.request().method() === 'POST') {
          const body = (route.request().postDataJSON() || {}) as {
            ips?: string[]
          }
          const ipsToUnban = new Set(body.ips || [])
          mockBannedList = mockBannedList.filter(
            (item) => !ipsToUnban.has(item.ipAddress)
          )
          for (const record of mockUserLoginIPs) {
            if (ipsToUnban.has(record.ipAddress)) {
              record.banned = false
            }
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ code: 0, message: 'ok', data: null }),
          })
        } else {
          await route.continue()
        }
      }
    )

    // 2. Unban single
    await page.route(
      (url) => url.pathname.endsWith('/api/banned_ips/unban'),
      async (route) => {
        if (route.request().method() === 'POST') {
          const body = (route.request().postDataJSON() || {}) as {
            ip?: string
          }
          mockBannedList = mockBannedList.filter(
            (item) => item.ipAddress !== body.ip
          )
          for (const record of mockUserLoginIPs) {
            if (record.ipAddress === body.ip) {
              record.banned = false
            }
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ code: 0, message: 'ok', data: null }),
          })
        } else {
          await route.continue()
        }
      }
    )

    // 3. Banned IPs list and creation
    await page.route(
      (url) =>
        url.pathname.endsWith('/api/banned_ips') ||
        url.pathname.endsWith('/api/banned_ips/'),
      async (route) => {
        const method = route.request().method()
        if (method === 'GET') {
          const parsedUrl = new URL(route.request().url())
          const keywords =
            parsedUrl.searchParams.get('keywords')?.toLowerCase() || ''
          const filtered = mockBannedList.filter(
            (item) =>
              !keywords || item.ipAddress.toLowerCase().includes(keywords)
          )
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 0,
              message: 'ok',
              data: {
                list: filtered,
                page: 1,
                pageSize: 20,
                total: filtered.length,
                totalPage: 1,
              },
            }),
          })
        } else if (method === 'POST') {
          const body = (route.request().postDataJSON() || {}) as {
            ip: string
            duration: number
            reason: string
          }
          const now = new Date()
          const endAt =
            body.duration === -1
              ? ''
              : new Date(now.getTime() + body.duration * 60000).toISOString()
          const newItem: MockBannedItem = {
            id: mockNextId++,
            ipAddress: body.ip,
            banned: true,
            bannedStartAt: now.toISOString(),
            bannedEndAt: endAt,
            bannedMinutes: body.duration,
            reason: body.reason,
            operatorId: 1,
            operatorName: 'testsadmin',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          }
          mockBannedList.unshift(newItem)
          for (const record of mockUserLoginIPs) {
            if (record.ipAddress === body.ip) {
              record.banned = true
            }
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              code: 0,
              message: 'ok',
              data: newItem,
            }),
          })
        } else {
          await route.continue()
        }
      }
    )

    // 4. User login IPs
    await page.route(
      (url) => /\/api\/users\/[^/]+\/login_ips$/.test(url.pathname),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            message: 'ok',
            data: mockUserLoginIPs,
          }),
        })
      }
    )
  }

  test.beforeEach(async ({ page, request }) => {
    if (backendSupportsBannedIP === null) {
      if (process.env.FORCE_MOCK === '1') {
        backendSupportsBannedIP = false
      } else {
        try {
          const res = await request.get('/api/banned_ips')
          // If 404, the backend container does not have banned_ips API yet (e.g. CI running older published image)
          backendSupportsBannedIP = res.status() !== 404
        } catch {
          backendSupportsBannedIP = false
        }
      }
    }

    if (!backendSupportsBannedIP) {
      await installBannedIPMocks(page)
    }

    await signInAsAdmin(page)
  })

  test('admin can manually ban an IP address from banned list page', async ({
    page,
  }) => {
    await page.goto('/manage/banned_users')

    // Switch to IP tab
    const ipTab = page.getByRole('tab', { name: /IP/i })
    await expect(ipTab).toBeVisible({ timeout: 15000 })
    await ipTab.click()

    // Click "+ Add Ban" button
    const addBanButton = page.getByRole('button', {
      name: /\+.*(Add Ban|添加封禁)/i,
    })
    await expect(addBanButton).toBeVisible()
    await addBanButton.click()

    // Dialog should open
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Select IP Address radio
    const ipRadio = dialog.getByRole('radio', { name: /IP/i })
    await ipRadio.click()

    // Enter IP address
    const targetInput = dialog.getByPlaceholder(/IP/i)
    await targetInput.fill(testIP)

    // Select duration (1 day)
    await dialog.getByLabel(/1 day|1\s*天/i).click()

    // Select reason (Advertising)
    await dialog.getByLabel(/Advertising|广告/i).click()

    // Submit the form
    const submitButton = dialog.getByRole('button', { name: /Confirm|确定/i })
    await submitButton.click()

    // Dialog should close
    await expect(dialog).toBeHidden({ timeout: 10000 })

    // Verify the newly banned IP is displayed in the table
    await expect(page.getByRole('cell', { name: testIP })).toBeVisible({
      timeout: 10000,
    })
  })

  test('admin can unban a single IP from the list', async ({ page }) => {
    await page.goto('/manage/banned_users?tab=ip')

    // Find row with testIP
    const ipCell = page.getByRole('cell', { name: testIP })
    await expect(ipCell).toBeVisible({ timeout: 15000 })

    const row = page.getByRole('row', { name: new RegExp(testIP) })
    const unbanButton = row.getByRole('button', { name: /Unban|解封/i })
    await unbanButton.click()

    // Confirm dialog
    const alertDialog = page.getByRole('alertdialog')
    await expect(alertDialog).toBeVisible()
    const confirmButton = alertDialog.getByRole('button', {
      name: /Confirm|确定/i,
    })
    await confirmButton.click()

    // Verify the IP is removed from table
    await expect(page.getByRole('cell', { name: testIP })).toBeHidden({
      timeout: 10000,
    })
  })

  test('admin can batch unban selected IPs from the list', async ({ page }) => {
    await page.goto('/manage/banned_users?tab=ip')

    // Add batchIP
    const addBanButton = page.getByRole('button', {
      name: /\+.*(Add Ban|添加封禁)/i,
    })
    await addBanButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const ipRadio = dialog.getByRole('radio', { name: /IP/i })
    await ipRadio.click()

    const targetInput = dialog.getByPlaceholder(/IP/i)
    await targetInput.fill(batchIP)

    // Select duration (1 day)
    await dialog.getByLabel(/1 day|1\s*天/i).click()

    // Select reason (Advertising)
    await dialog.getByLabel(/Advertising|广告/i).click()

    const submitButton = dialog.getByRole('button', { name: /Confirm|确定/i })
    await submitButton.click()
    await expect(dialog).toBeHidden({ timeout: 10000 })

    // Verify batchIP is visible
    const ipCell = page.getByRole('cell', { name: batchIP })
    await expect(ipCell).toBeVisible({ timeout: 10000 })

    // Select row checkbox for batchIP
    const row = page.getByRole('row', { name: new RegExp(batchIP) })
    const checkbox = row.getByRole('checkbox')
    await checkbox.click()

    // Batch unban action bar should appear
    const batchUnbanButton = page.getByRole('button', {
      name: /(Unban.*selected IPs|解封.*已选 IP)/i,
    })
    await expect(batchUnbanButton).toBeVisible({ timeout: 5000 })
    await batchUnbanButton.click()

    // Confirm in alert dialog
    const alertDialog = page.getByRole('alertdialog')
    await expect(alertDialog).toBeVisible()
    const confirmButton = alertDialog.getByRole('button', {
      name: /Confirm|确定/i,
    })
    await confirmButton.click()

    // Verify batchIP is removed
    await expect(page.getByRole('cell', { name: batchIP })).toBeHidden({
      timeout: 10000,
    })
  })

  test('admin can ban and unban an IP from user profile page', async ({
    page,
    browser,
    baseURL,
  }) => {
    if (!backendSupportsBannedIP) {
      mockUserLoginIPs = [
        {
          ipAddress: userLoginIP,
          lastLoginAt: new Date().toISOString(),
          loginCount: 1,
          banned: false,
        },
      ]
    }

    // 1. In a separate isolated browser context, register and log in a new user with custom X-Forwarded-For
    const userContext = await browser.newContext({
      baseURL: baseURL || 'http://localhost:5173',
      extraHTTPHeaders: {
        'X-Forwarded-For': userLoginIP,
      },
    })
    const userPage = await userContext.newPage()

    await userPage.goto('/signup')
    await userPage.getByPlaceholder(/Email/i).fill(testUser.email)
    await clickNextStep(userPage)
    await userPage.waitForSelector('input[placeholder*="Verification Code"]', {
      timeout: 10000,
    })
    await fillVerificationCode(userPage, config.superVerifyCode)
    await clickNextStep(userPage)
    await userPage.waitForSelector('input[placeholder*="Username"]', {
      timeout: 10000,
    })
    await userPage.getByPlaceholder(/Username/i).fill(testUser.username)
    await userPage.getByPlaceholder(/Password/i).fill(testUser.password)
    await clickSubmit(userPage)
    await waitForSignupSuccess(userPage)
    await userContext.close()
    await page.waitForTimeout(500)

    // 2. Admin in main page navigates to user profile page
    await page.goto(`/users/${testUser.username}`)

    // Admin should see Login IP Addresses section with userLoginIP
    const ipItem = page.locator('span.font-mono', { hasText: userLoginIP })
    await expect(ipItem).toBeVisible({ timeout: 10000 })

    // Locate the ban button for this IP
    const banThisIPButton = page
      .getByRole('button', { name: /Ban this IP|封禁此 IP/i })
      .first()
    await expect(banThisIPButton).toBeVisible({ timeout: 10000 })
    await banThisIPButton.click()

    // AddBanDialog opens with IP prefilled and locked
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Select duration (1 day)
    await dialog.getByLabel(/1 day|1\s*天/i).click()

    // Select reason (Advertising)
    await dialog.getByLabel(/Advertising|广告/i).click()

    // Submit ban
    const confirmButton = dialog.getByRole('button', { name: /Confirm|确定/i })
    await confirmButton.click()
    await expect(dialog).toBeHidden({ timeout: 10000 })

    // Verify on user profile page, that IP now has Banned badge and Unban IP button
    await expect(
      page.getByRole('button', { name: /Unban IP|解封 IP/i })
    ).toBeVisible({ timeout: 10000 })

    // Test unbanning from user profile page
    await page.getByRole('button', { name: /Unban IP|解封 IP/i }).click()
    const alertDialog = page.getByRole('alertdialog')
    await expect(alertDialog).toBeVisible()
    await alertDialog.getByRole('button', { name: /Confirm|确定/i }).click()

    // Verify it reverts back to "Ban this IP" button
    await expect(
      page.getByRole('button', { name: /Ban this IP|封禁此 IP/i })
    ).toBeVisible({ timeout: 10000 })
  })
})
