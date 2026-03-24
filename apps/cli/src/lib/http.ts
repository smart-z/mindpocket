import { CliError } from "./errors.js"

function getErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "object" && payload && "error_description" in payload) {
    return String(payload.error_description)
  }

  if (typeof payload === "object" && payload && "error" in payload) {
    return String(payload.error)
  }

  if (typeof payload === "string") {
    return payload
  }

  return `Request failed with status ${status}`
}

function getErrorCode(status: number) {
  if (status === 401) {
    return "AUTH_REQUIRED"
  }

  if (status === 403) {
    return "AUTH_DENIED"
  }

  if (status === 400) {
    return "VALIDATION_ERROR"
  }

  return "API_ERROR"
}

export async function parseJsonResponse(response: Response) {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function ensureOk(response: Response) {
  if (response.ok) {
    return
  }

  const payload = await parseJsonResponse(response)
  const message = getErrorMessage(payload, response.status)
  const code = getErrorCode(response.status)

  throw new CliError(code, message, payload)
}
