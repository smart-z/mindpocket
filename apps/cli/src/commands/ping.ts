import { ApiClient } from "../lib/api-client.js"
import { ok } from "../lib/result.js"
import { resolveServerContext } from "../lib/server-url.js"

export async function pingCommand(options: { server?: string }) {
  const server = await resolveServerContext(options.server)
  const client = new ApiClient(server.value)
  const startedAt = Date.now()

  await client.request("/api/health")

  return ok({
    serverUrl: server.value,
    reachable: true,
    latencyMs: Date.now() - startedAt,
  })
}
