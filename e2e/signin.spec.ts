import { expect, test } from '@playwright/test'

import {
  clickNextStep,
  config,
  fillVerificationCode,
  generateRandomEmail,
  generateRandomPhone,
  generateRandomUsername,
  waitForSigninSuccess,
} from './helpers'

test.describe('Password Signin', () => {
  test.describe.configure({ mode: 'serial' })

  let testEmail: string
  let testUsername: string
  let testPassword: string

  test.beforeAll(async () => {
    testEmail = generateRandomEmail()
    testUsername = generateRandomUsername()
    testPassword = config.testPassword
  })

  test('setup: register user with email', async ({ page }) => {
    await page.goto('/signup')
    await page.getByPlaceholder(/Email/i).fill(testEmail)
    await clickNextStep(page)
    await page.waitForSelector('input[placeholder*="Verification Code"]')
    await fillVerificationCode(page)
    await clickNextStep(page)
    await page.waitForSelector('input[placeholder*="Username"]')
    await page.getByPlaceholder(/Username/i).fill(testUsername)
    await page.getByPlaceholder(/Password/i).fill(testPassword)
    await page.getByRole('button', { name: /Submit/i }).click()
    await page.waitForURL('/', { timeout: 10000 })
  })

  test('should successfully sign in with email and password', async ({
    page,
  }) => {
    await page.goto('/signin')

    await expect(page).toHaveTitle(/Sign in/i)

    await page.getByPlaceholder(/Username or Email/i).fill(testEmail)
    await page.getByPlaceholder(/Password/i).fill(testPassword)
    await page.getByRole('button', { name: /Sign in/i }).click()

    await waitForSigninSuccess(page)
    await expect(page).toHaveURL('/')
  })

  test('should successfully sign in with username and password', async ({
    page,
  }) => {
    await page.goto('/signin')

    await page.getByPlaceholder(/Username or Email/i).fill(testUsername)
    await page.getByPlaceholder(/Password/i).fill(testPassword)
    await page.getByRole('button', { name: /Sign in/i }).click()

    await waitForSigninSuccess(page)
    await expect(page).toHaveURL('/')
  })

  test('should show error for incorrect password', async ({ page }) => {
    await page.goto('/signin')

    await page.getByPlaceholder(/Username or Email/i).fill(testEmail)
    await page.getByPlaceholder(/Password/i).fill('WrongPassword123!')
    await page.getByRole('button', { name: /Sign in/i }).click()

    const toast = page.locator('[data-sonner-toast][data-type="error"]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText(/.+/)
  })
})

test.describe('Phone Signin', () => {
  test.describe.configure({ mode: 'serial' })

  let testPhone: string
  let testUsername: string

  test.beforeAll(async () => {
    testPhone = generateRandomPhone()
    testUsername = generateRandomUsername()
  })

  test('setup: register user with phone', async ({ page }) => {
    await page.goto('/signup')

    await expect(page).toHaveTitle(/Sign up/i)

    const phoneTrigger = page.getByRole('tab', { name: /Phone/i })
    if ((await phoneTrigger.count()) > 0) {
      await phoneTrigger.click()
    }

    await page.getByPlaceholder(/Phone/i).fill(testPhone)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Verification Code"]', {
      timeout: 5000,
    })
    await fillVerificationCode(page)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Username"]', {
      timeout: 5000,
    })
    await page.getByPlaceholder(/Username/i).fill(testUsername)
    await page.getByRole('button', { name: /Submit/i }).click()
    await page.waitForURL('/', { timeout: 10000 })
  })

  test('should successfully sign in with phone number', async ({ page }) => {
    await page.goto('/signin')

    await expect(page).toHaveTitle(/Sign in/i)

    const phoneTrigger = page.getByRole('tab', { name: /Phone/i })
    if ((await phoneTrigger.count()) > 0) {
      await phoneTrigger.click()
    }

    await page.getByPlaceholder(/Phone/i).fill(testPhone)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Verification Code"]')
    await fillVerificationCode(page)
    await clickNextStep(page)

    await waitForSigninSuccess(page)
    await expect(page).toHaveURL('/')
  })

  test('should show error for unregistered phone number', async ({ page }) => {
    const unregisteredPhone = generateRandomPhone()

    await page.goto('/signin')

    await expect(page).toHaveTitle(/Sign in/i)

    const phoneTrigger = page.getByRole('tab', { name: /Phone/i })
    if ((await phoneTrigger.count()) > 0) {
      await phoneTrigger.click()
    }

    await page.getByPlaceholder(/Phone/i).fill(unregisteredPhone)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Verification Code"]')
    await fillVerificationCode(page)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Username"]', {
      timeout: 10000,
    })
    await expect(page.locator('input[placeholder*="Username"]')).toBeVisible()
  })
})
