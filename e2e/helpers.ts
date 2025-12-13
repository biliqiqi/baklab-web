import { Page } from '@playwright/test'

export const config = {
  superVerifyCode: process.env.E2E_SUPER_VERIFY_CODE || '686868',
  testEmailPrefix: process.env.E2E_TEST_EMAIL_PREFIX || 'test-',
  testEmailDomain: process.env.E2E_TEST_EMAIL_DOMAIN || '@example.com',
  testPhonePrefix: process.env.E2E_TEST_PHONE_PREFIX || '13800138',
  testPassword: process.env.E2E_TEST_PASSWORD || 'TestPass123!',
}

export function generateRandomEmail(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 10000)
  return `${config.testEmailPrefix}${timestamp}${random}${config.testEmailDomain}`
}

export function generateRandomPhone(): string {
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `${config.testPhonePrefix}${random}`
}

export function generateRandomUsername(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `user${timestamp}${random}`.toLowerCase()
}

export async function fillVerificationCode(
  page: Page,
  code: string = config.superVerifyCode
): Promise<void> {
  await page.getByPlaceholder(/Verification Code/i).fill(code)
}

export async function clickNextStep(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Next/i }).click()
}

export async function clickSubmit(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Submit/i }).click()
}

export async function waitForSignupSuccess(page: Page): Promise<void> {
  await page.waitForURL('/', { timeout: 10000 })
}

export async function waitForSigninSuccess(page: Page): Promise<void> {
  await page.waitForURL('/', { timeout: 10000 })
}

export async function logout(page: Page): Promise<void> {
  await page.goto('/')
  const userMenuButton = page.locator('[data-testid="user-menu"]').first()
  if ((await userMenuButton.count()) > 0) {
    await userMenuButton.click()
    await page.getByRole('menuitem', { name: /退出|Logout/i }).click()
  }
}
