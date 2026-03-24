import { ok } from "../lib/result.js"
import { validateSessionOrClear } from "./shared.js"

export async function bookmarksDeleteCommand(id: string) {
  const { client } = await validateSessionOrClear()
  await client.request(`/api/bookmarks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })

  return ok({
    deleted: true,
    id,
  })
}
