import { expect, test } from '@playwright/test'

import {
  clickNextStep,
  clickSubmit,
  config,
  fillVerificationCode,
  generateRandomPhone,
  generateRandomUsername,
  waitForSignupSuccess,
} from './helpers'

test.describe('Phone Signup', () => {
  test('should successfully register with phone number', async ({ page }) => {
    const phone = generateRandomPhone()
    const username = generateRandomUsername()

    await page.goto('/signup')

    await expect(page).toHaveTitle(/Sign up/i)

    const phoneTrigger = page.getByRole('tab', { name: /Phone/i })
    if ((await phoneTrigger.count()) > 0) {
      await phoneTrigger.click()
    }

    const phoneInput = page.getByPlaceholder(/Phone/i)
    await phoneInput.fill(phone)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Verification Code"]', {
      timeout: 5000,
    })

    await fillVerificationCode(page, config.superVerifyCode)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Username"]', {
      timeout: 5000,
    })

    await page.getByPlaceholder(/Username/i).fill(username)
    await clickSubmit(page)

    await waitForSignupSuccess(page)
    await expect(page).toHaveURL('/')
  })

  test('should show validation errors for invalid phone number', async ({
    page,
  }) => {
    await page.goto('/signup')

    await expect(page).toHaveTitle(/Sign up/i)

    const phoneTrigger = page.getByRole('tab', { name: /Phone/i })
    if ((await phoneTrigger.count()) > 0) {
      await phoneTrigger.click()
    }

    const phoneInput = page.getByPlaceholder(/Phone/i)
    await phoneInput.fill('12345')
    await clickNextStep(page)

    await expect(page.locator('text=/format|invalid/i').first()).toBeVisible({
      timeout: 3000,
    })
  })

  test('should show validation errors for invalid username', async ({
    page,
  }) => {
    const phone = generateRandomPhone()

    await page.goto('/signup')

    await expect(page).toHaveTitle(/Sign up/i)

    const phoneTrigger = page.getByRole('tab', { name: /Phone/i })
    if ((await phoneTrigger.count()) > 0) {
      await phoneTrigger.click()
    }

    await page.getByPlaceholder(/Phone/i).fill(phone)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Verification Code"]')
    await fillVerificationCode(page)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Username"]')
    await page.getByPlaceholder(/Username/i).fill('ab')
    await clickSubmit(page)

    await expect(
      page.locator('text=/minimum|characters/i').first()
    ).toBeVisible({
      timeout: 3000,
    })
  })
})
