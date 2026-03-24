import { ApiClient } from "../lib/api-client.js"
import { clearSession, getStoredState } from "../lib/auth-store.js"
import { ok } from "../lib/result.js"
import { resolveServerContext } from "../lib/server-url.js"

export async function authStatusCommand() {
  const state = await getStoredState()
  const server = await resolveServerContext()
  if (!state.session?.accessToken) {
    return ok({
      authenticated: false,
      serverUrl: state.serverUrl || server.value,
      user: null,
    })
  }

  try {
    const sessionPayload = await new ApiClient(server.value, state.session.accessToken).request<{
      session: { expiresAt: string } | null
      user: { id: string; email: string; name: string } | null
    }>("/api/auth/get-session")

    if (!(sessionPayload.user && sessionPayload.session)) {
      await clearSession()
      return ok({
        authenticated: false,
        serverUrl: server.value,
        user: null,
      })
    }

    return ok({
      authenticated: true,
      serverUrl: server.value,
      user: sessionPayload.user,
      expiresAt: sessionPayload.session.expiresAt,
    })
  } catch {
    return ok({
      authenticated: false,
      serverUrl: server.value,
      user: null,
    })
  }
}
