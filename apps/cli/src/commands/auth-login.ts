import { ApiClient } from "../lib/api-client.js"
import { storeSession } from "../lib/auth-store.js"
import { CliError } from "../lib/errors.js"
import { openBrowser } from "../lib/open-browser.js"
import { ok, printStderr } from "../lib/result.js"
import { resolveServerUrl } from "../lib/server-url.js"

const CLIENT_ID = "mindpocket-cli"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

interface DeviceTokenResponse {
  access_token: string
  expires_in: number
}

interface DeviceErrorResponse {
  error?: string
  error_description?: string
}

type DevicePollOutcome =
  | { status: "pending" }
  | { status: "slow_down"; intervalMs: number }
  | { status: "authorized"; payload: DeviceTokenResponse }

function requestDeviceCode(client: ApiClient) {
  return client.request<DeviceCodeResponse>("/api/auth/device/code", {
    method: "POST",
    body: JSON.stringify({ client_id: CLIENT_ID }),
  })
}

function printDeviceInstructions(deviceCodeResponse: DeviceCodeResponse) {
  printStderr(`Verification URL: ${deviceCodeResponse.verification_uri}`)
  printStderr(`Verification URL (complete): ${deviceCodeResponse.verification_uri_complete}`)
  printStderr(`User code: ${deviceCodeResponse.user_code}`)
  printStderr(`Expires in: ${deviceCodeResponse.expires_in}s`)
  printStderr(`Poll interval: ${deviceCodeResponse.interval}s`)
}

async function maybeOpenVerificationUrl(
  verificationUriComplete: string,
  options: { noOpen?: boolean }
) {
  if (options.noOpen) {
    return
  }

  const opened = await openBrowser(verificationUriComplete)
  if (!opened) {
    printStderr("Browser open failed. Open the verification URL manually.")
  }
}

async function pollDeviceToken(
  serverUrl: string,
  deviceCode: string,
  intervalMs: number
): Promise<DevicePollOutcome> {
  const response = await fetch(`${serverUrl}/api/auth/device/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
      client_id: CLIENT_ID,
    }),
  })

  if (response.ok) {
    return {
      status: "authorized",
      payload: (await response.json()) as DeviceTokenResponse,
    }
  }

  const errorPayload = (await response.json()) as DeviceErrorResponse
  if (errorPayload.error === "authorization_pending") {
    return { status: "pending" }
  }

  if (errorPayload.error === "slow_down") {
    return { status: "slow_down", intervalMs: intervalMs + 5000 }
  }

  if (errorPayload.error === "access_denied") {
    throw new CliError(
      "AUTH_DENIED",
      errorPayload.error_description || "Device authorization denied.",
      errorPayload
    )
  }

  if (errorPayload.error === "expired_token") {
    throw new CliError(
      "AUTH_TIMEOUT",
      errorPayload.error_description || "Device authorization expired.",
      errorPayload
    )
  }

  throw new CliError(
    "API_ERROR",
    errorPayload.error_description || "Device authorization failed.",
    errorPayload
  )
}

function resolveSessionPayload(serverUrl: string, accessToken: string) {
  return new ApiClient(serverUrl, accessToken).request<{
    session: { expiresAt: string }
    user: { id: string; email: string; name: string }
  }>("/api/auth/get-session")
}

async function persistAuthorizedSession(serverUrl: string, tokenPayload: DeviceTokenResponse) {
  const sessionPayload = await resolveSessionPayload(serverUrl, tokenPayload.access_token)

  if (!sessionPayload.user) {
    throw new CliError("API_ERROR", "Device flow completed but session lookup failed.")
  }

  const obtainedAt = new Date().toISOString()
  const expiresAt =
    sessionPayload.session?.expiresAt ||
    new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()

  await storeSession(
    {
      accessToken: tokenPayload.access_token,
      obtainedAt,
      expiresAt,
      user: {
        id: sessionPayload.user.id,
        email: sessionPayload.user.email,
        name: sessionPayload.user.name,
      },
    },
    serverUrl
  )

  return ok({
    serverUrl,
    user: sessionPayload.user,
    expiresAt,
  })
}

export async function authLoginCommand(options: {
  server?: string
  noOpen?: boolean
  deviceCodeOnly?: boolean
}) {
  const serverUrl = await resolveServerUrl(options.server)
  const client = new ApiClient(serverUrl)
  const deviceCodeResponse = await requestDeviceCode(client)

  const deviceData = {
    serverUrl,
    deviceCode: deviceCodeResponse.device_code,
    userCode: deviceCodeResponse.user_code,
    verificationUri: deviceCodeResponse.verification_uri,
    verificationUriComplete: deviceCodeResponse.verification_uri_complete,
    expiresIn: deviceCodeResponse.expires_in,
    interval: deviceCodeResponse.interval,
  }

  printDeviceInstructions(deviceCodeResponse)

  if (options.deviceCodeOnly) {
    return ok(deviceData)
  }

  await maybeOpenVerificationUrl(deviceCodeResponse.verification_uri_complete, options)

  const startedAt = Date.now()
  const timeoutAt = startedAt + deviceCodeResponse.expires_in * 1000
  let intervalMs = deviceCodeResponse.interval * 1000

  while (Date.now() < timeoutAt) {
    await sleep(intervalMs)
    const pollResult = await pollDeviceToken(serverUrl, deviceCodeResponse.device_code, intervalMs)

    if (pollResult.status === "pending") {
      continue
    }

    if (pollResult.status === "slow_down") {
      intervalMs = pollResult.intervalMs
      continue
    }

    return persistAuthorizedSession(serverUrl, pollResult.payload)
  }

  throw new CliError("AUTH_TIMEOUT", "Timed out waiting for device authorization.")
}
