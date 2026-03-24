import { ApiClient } from "../lib/api-client.js"
import { clearSession, getStoredState } from "../lib/auth-store.js"
import { CliError } from "../lib/errors.js"

export async function getAuthenticatedClient() {
  const state = await getStoredState()
  if (!state.serverUrl) {
    throw new CliError(
      "CONFIG_MISSING",
      "Server URL is not configured. Run `mindpocket config set server <url>` first."
    )
  }

  if (!state.session?.accessToken) {
    throw new CliError("AUTH_REQUIRED", "Not logged in. Run `mindpocket auth login` first.")
  }

  return {
    state,
    client: new ApiClient(state.serverUrl, state.session.accessToken),
  }
}

export async function validateSessionOrClear() {
  const { state, client } = await getAuthenticatedClient()

  try {
    const session = await client.request<{
      session: { id: string; expiresAt: string } | null
      user: { id: string; email: string; name: string; image?: string | null } | null
    }>("/api/auth/get-session")

    if (!(session?.session && session.user)) {
      await clearSession()
      throw new CliError(
        "AUTH_REQUIRED",
        "Stored session is no longer valid. Run `mindpocket auth login` again."
      )
    }

    return {
      state,
      client,
      session: {
        session: session.session,
        user: session.user,
      },
    }
  } catch (error) {
    if (error instanceof CliError && error.code === "AUTH_REQUIRED") {
      await clearSession()
    }
    throw error
  }
}
