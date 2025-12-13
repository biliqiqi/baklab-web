import { expect, test } from '@playwright/test'

import {
  clickNextStep,
  clickSubmit,
  config,
  fillVerificationCode,
  generateRandomEmail,
  generateRandomUsername,
  waitForSignupSuccess,
} from './helpers'

test.describe('Email Signup', () => {
  test('should successfully register with email', async ({ page }) => {
    const email = generateRandomEmail()
    const username = generateRandomUsername()
    const password = config.testPassword

    await page.goto('/signup')

    await expect(page).toHaveTitle(/Sign up/i)

    const emailInput = page.getByPlaceholder(/Email/i)
    await emailInput.fill(email)
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
    await page.getByPlaceholder(/Password/i).fill(password)
    await clickSubmit(page)

    await waitForSignupSuccess(page)
    await expect(page).toHaveURL('/')
  })

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/signup')

    const emailInput = page.getByPlaceholder(/Email/i)
    await emailInput.fill('invalid-email@111')
    await clickNextStep(page)

    await expect(page.locator('text=/Invalid/i')).toBeVisible({
      timeout: 3000,
    })
  })

  test('should show validation errors for weak password', async ({ page }) => {
    const email = generateRandomEmail()
    const username = generateRandomUsername()

    await page.goto('/signup')

    await page.getByPlaceholder(/Email/i).fill(email)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Verification Code"]')
    await fillVerificationCode(page)
    await clickNextStep(page)

    await page.waitForSelector('input[placeholder*="Username"]')
    await page.getByPlaceholder(/Username/i).fill(username)
    await page.getByPlaceholder(/Password/i).fill('weak')
    await clickSubmit(page)

    await expect(
      page.locator('text=/minimum|characters/i').first()
    ).toBeVisible({
      timeout: 3000,
    })
  })
})
