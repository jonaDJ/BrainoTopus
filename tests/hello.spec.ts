import { expect, test } from '@playwright/test'

test('shows nyt-style landing page', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Be Dumb. Be Octopus.' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Games' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Wordle' })).toBeVisible()
  await expect(page.getByText('Developing').first()).toBeVisible()
})
