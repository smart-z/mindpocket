import type { Page } from "@playwright/test"

const LOGIN_BUTTON_NAME_REGEX = /log in|登录/i

export function hasE2ECredentials() {
  return Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD)
}

export async function loginWithEnvAccount(page: Page) {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!(email && password)) {
    throw new Error("Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD")
  }

  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: LOGIN_BUTTON_NAME_REGEX }).click()
}
