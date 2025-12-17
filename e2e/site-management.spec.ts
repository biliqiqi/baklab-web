import { expect, test } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  generateRandomArticleContent,
  generateRandomArticleTitle,
  generateRandomCategoryFrontId,
  generateRandomCategoryName,
  generateRandomSiteFrontId,
  generateRandomSiteName,
  signInAsAdmin,
} from './helpers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SAMPLE_LOGO_PATH = path.resolve(__dirname, './image-samples/image_1.png')

const siteInfo = {
  name: generateRandomSiteName(),
  frontId: generateRandomSiteFrontId(),
}

const categoryInfo = {
  name: generateRandomCategoryName(),
  frontId: generateRandomCategoryFrontId(),
}

const articleInfo = {
  title: generateRandomArticleTitle(),
  content: generateRandomArticleContent(),
}

test.describe('Site management flows', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await signInAsAdmin(page)
  })

  test('create site from sidebar', async ({ page }) => {
    await page.goto('/')

    const createButton = page.getByRole('button', { name: /Create Site/i })
    await expect(createButton).toBeVisible({ timeout: 15000 })
    await createButton.click()

    const siteDialog = page.getByRole('dialog', { name: /Create Site/i })
    await expect(siteDialog).toBeVisible()

    const fileInput = siteDialog.locator('input[type="file"]').first()
    await fileInput.setInputFiles(SAMPLE_LOGO_PATH)

    const cropDialog = page.getByRole('dialog', { name: /Crop Image/i })
    await expect(cropDialog).toBeVisible()
    await expect(cropDialog.locator('img').first()).toBeVisible()
    const uploadResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/upload')
    )
    await cropDialog.getByRole('button', { name: /Confirm/i }).click()
    await uploadResponsePromise
    await cropDialog.waitFor({ state: 'detached', timeout: 10000 })
    await page
      .locator('img[src*="/uploads/"]')
      .first()
      .waitFor({ timeout: 10000 })

    await siteDialog.getByPlaceholder(/site name/i).fill(siteInfo.name)
    await siteDialog.getByPlaceholder(/site identifier/i).fill(siteInfo.frontId)
    await siteDialog
      .getByPlaceholder(/description/i)
      .fill(`Site description for ${siteInfo.name}`)

    const submitButton = siteDialog.getByRole('button', { name: /^Submit$/i })
    await expect(submitButton).toBeEnabled()

    await submitButton.click()
    await expect(siteDialog).toBeHidden({ timeout: 15000 })

    await page.goto(`/z/${siteInfo.frontId}`)
    await expect(page).toHaveURL(new RegExp(`/z/${siteInfo.frontId}`), {
      timeout: 30000,
    })
  })

  test('create bankuai within new site', async ({ page }) => {
    await page.goto(`/z/${siteInfo.frontId}/bankuai`)

    const createBankuaiButton = page.getByRole('button', {
      name: /\+\s*Create Bankuai/i,
    })
    await expect(createBankuaiButton).toBeVisible({ timeout: 15000 })
    await createBankuaiButton.click()

    const categoryDialog = page.getByRole('dialog', { name: /Create Bankuai/i })
    await expect(categoryDialog).toBeVisible()

    await categoryDialog
      .getByPlaceholder(/bankuai name/i)
      .fill(categoryInfo.name)
    await categoryDialog
      .getByPlaceholder(/bankuai identifier/i)
      .fill(categoryInfo.frontId)
    const submitButton = categoryDialog.getByRole('button', {
      name: /^Submit$/i,
    })
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    await expect(categoryDialog).toBeHidden()
    await expect(page.getByText(categoryInfo.name).first()).toBeVisible()
  })

  test('create article under the new bankuai', async ({ page }) => {
    await page.goto(`/z/${siteInfo.frontId}/submit`)

    await page.getByPlaceholder(/title/i).fill(articleInfo.title)

    const categorySelect = page.locator('main button[role="combobox"]').first()
    await categorySelect.click()
    await page
      .getByRole('option', { name: new RegExp(categoryInfo.name, 'i') })
      .click()

    const editor = page.locator('.ProseMirror').first()
    await editor.click()
    await page.keyboard.type(articleInfo.content)

    const submitButton = page.getByRole('button', { name: /^Submit$/i }).last()
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    await expect(page).toHaveURL(
      new RegExp(`/z/${siteInfo.frontId}/articles/[0-9a-z-]+`),
      { timeout: 30000 }
    )
    await expect(
      page.getByRole('heading', { level: 1, name: articleInfo.title })
    ).toBeVisible()
  })
})
