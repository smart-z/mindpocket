import { ok } from "../lib/result.js"
import { validateSessionOrClear } from "./shared.js"

export async function foldersGetCommand(id: string) {
  const { client } = await validateSessionOrClear()
  const data = await client.request<unknown>(`/api/folders/${encodeURIComponent(id)}`)
  return ok(data)
}
