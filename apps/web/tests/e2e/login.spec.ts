import { expect, test } from "@playwright/test"
import { hasE2ECredentials, loginWithEnvAccount } from "../helpers/e2e-auth"

const HOME_URL_REGEX = /\/$/

test.skip(!hasE2ECredentials(), "requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD")

test("logs in with env-provided credentials", async ({ page }) => {
  await loginWithEnvAccount(page)

  await expect(page).toHaveURL(HOME_URL_REGEX)
  await expect(page.getByText("收藏")).toBeVisible()
})
