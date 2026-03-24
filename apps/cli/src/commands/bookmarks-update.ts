import { CliError } from "../lib/errors.js"
import { ok } from "../lib/result.js"
import { validateSessionOrClear } from "./shared.js"

export async function bookmarksUpdateCommand(
  id: string,
  options: {
    title?: string
    folderId?: string
  }
) {
  if (!(options.title !== undefined || options.folderId !== undefined)) {
    throw new CliError(
      "VALIDATION_ERROR",
      "At least one of --title or --folder-id must be provided."
    )
  }

  const { client } = await validateSessionOrClear()
  const data = await client.request<unknown>(`/api/bookmarks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: options.title,
      folderId: options.folderId,
    }),
  })

  return ok(data)
}
