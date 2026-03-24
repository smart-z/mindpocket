import { ApiClient } from "../lib/api-client.js"
import { getStoredState } from "../lib/auth-store.js"
import { CliError } from "../lib/errors.js"
import { ok } from "../lib/result.js"
import { resolveServerContext } from "../lib/server-url.js"
import { CLI_VERSION } from "../lib/version.js"

function withConfigNextAction(nextActions: string[], hasConfiguredServer: boolean) {
  if (!hasConfiguredServer) {
    nextActions.push("Run `mindpocket config set server <url>` to configure the target server.")
  }
}

function withAuthNextAction(
  nextActions: string[],
  hasStoredSession: boolean,
  authenticated: boolean,
  sessionInvalid: boolean
) {
  if (!hasStoredSession) {
    nextActions.push("Run `mindpocket auth login` to authenticate this CLI.")
    return
  }

  if (sessionInvalid || !authenticated) {
    nextActions.push("Run `mindpocket auth login` again to refresh the stored session.")
  }
}

export async function doctorCommand(options: { server?: string }) {
  const state = await getStoredState()
  const server = await resolveServerContext(options.server)
  const nextActions: string[] = []
  const hasConfiguredServer = Boolean(
    options.server || process.env.MINDPOCKET_SERVER_URL || state.serverUrl
  )
  const hasStoredSession = Boolean(state.session?.accessToken)

  withConfigNextAction(nextActions, hasConfiguredServer)

  let reachable = false
  let authenticated = false
  let sessionInvalid = false
  let user: { id: string; email: string; name: string } | null = null
  let expiresAt: string | null = state.session?.expiresAt || null

  try {
    const client = new ApiClient(server.value, state.session?.accessToken)
    const session = await client.request<{
      session: { expiresAt: string } | null
      user: { id: string; email: string; name: string } | null
    } | null>("/api/auth/get-session")

    reachable = true
    authenticated = Boolean(session?.session && session.user)
    user = session?.user || null
    expiresAt = session?.session?.expiresAt || expiresAt
    sessionInvalid = hasStoredSession && !authenticated
  } catch (error) {
    if (error instanceof CliError && error.code === "AUTH_REQUIRED") {
      reachable = true
      sessionInvalid = hasStoredSession
    } else if (error instanceof CliError && error.code === "SERVER_UNREACHABLE") {
      reachable = false
    } else {
      throw error
    }
  }

  withAuthNextAction(nextActions, hasStoredSession, authenticated, sessionInvalid)

  return ok({
    cliVersion: CLI_VERSION,
    nodeVersion: process.version,
    platform: process.platform,
    server: {
      value: server.value,
      source: server.source,
      reachable,
    },
    auth: {
      hasStoredSession,
      authenticated,
      user,
      expiresAt,
    },
    nextActions,
  })
}
