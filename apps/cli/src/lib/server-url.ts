import { readConfig } from "./config.js"
import { CliError } from "./errors.js"

export const DEFAULT_SERVER_URL = "http://127.0.0.1:3000"
const TRAILING_SLASHES_REGEX = /\/+$/

export type ServerSource = "flag" | "env" | "config" | "default"

function normalizeServerUrl(value: string) {
  return value.replace(TRAILING_SLASHES_REGEX, "")
}

export async function resolveServerContext(explicit?: string): Promise<{
  value: string
  source: ServerSource
}> {
  if (explicit) {
    return {
      value: normalizeServerUrl(explicit),
      source: "flag",
    }
  }

  if (process.env.MINDPOCKET_SERVER_URL) {
    return {
      value: normalizeServerUrl(process.env.MINDPOCKET_SERVER_URL),
      source: "env",
    }
  }

  const config = await readConfig()
  if (config.serverUrl) {
    return {
      value: normalizeServerUrl(config.serverUrl),
      source: "config",
    }
  }

  return {
    value: DEFAULT_SERVER_URL,
    source: "default",
  }
}

export async function resolveServerUrl(explicit?: string) {
  return (await resolveServerContext(explicit)).value
}

export function assertServerUrl(value: string) {
  try {
    const url = new URL(value)
    if (!url.protocol.startsWith("http")) {
      throw new Error("invalid protocol")
    }
    return value.replace(TRAILING_SLASHES_REGEX, "")
  } catch {
    throw new CliError("VALIDATION_ERROR", "Server URL must be a valid http(s) URL")
  }
}
