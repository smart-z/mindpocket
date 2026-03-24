import { beforeEach, describe, expect, it, vi } from "vitest"

const { requireApiSessionMock, getBookmarksByUserIdMock, searchBookmarksMock } = vi.hoisted(() => ({
  requireApiSessionMock: vi.fn(),
  getBookmarksByUserIdMock: vi.fn(),
  searchBookmarksMock: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  requireApiSession: requireApiSessionMock,
}))

vi.mock("@/db/queries/bookmark", () => ({
  getBookmarksByUserId: getBookmarksByUserIdMock,
}))

vi.mock("@/db/queries/search", () => ({
  searchBookmarks: searchBookmarksMock,
}))

import { GET } from "@/app/api/bookmarks/route"
import { readJson } from "@/tests/helpers/http"

describe("GET /api/bookmarks", () => {
  beforeEach(() => {
    requireApiSessionMock.mockReset()
    getBookmarksByUserIdMock.mockReset()
    searchBookmarksMock.mockReset()
  })

  it("returns unauthorized response when session is missing", async () => {
    const unauthorized = Response.json({ error: "Unauthorized" }, { status: 401 })
    requireApiSessionMock.mockResolvedValue({ ok: false, response: unauthorized })

    const response = await GET(new Request("http://localhost/api/bookmarks"))

    expect(response.status).toBe(401)
    await expect(readJson<{ error: string }>(response)).resolves.toEqual({
      error: "Unauthorized",
    })
  })

  it("lists bookmarks when no search query is provided", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { user: { id: "user-1" } },
    })
    getBookmarksByUserIdMock.mockResolvedValue({
      bookmarks: [{ id: "bookmark-1", title: "First" }],
      total: 1,
      hasMore: false,
    })

    const response = await GET(
      new Request("http://localhost/api/bookmarks?type=article&platform=all&limit=10&offset=5")
    )

    expect(getBookmarksByUserIdMock).toHaveBeenCalledWith({
      userId: "user-1",
      type: "article",
      platform: "all",
      folderId: undefined,
      search: undefined,
      limit: 10,
      offset: 5,
    })
    await expect(
      readJson<{
        bookmarks: Array<{ id: string; title: string }>
        total: number
        hasMore: boolean
      }>(response)
    ).resolves.toEqual({
      bookmarks: [{ id: "bookmark-1", title: "First" }],
      total: 1,
      hasMore: false,
    })
  })

  it("uses search query branch when search is present", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { user: { id: "user-1" } },
    })
    searchBookmarksMock.mockResolvedValue({
      items: [
        {
          id: "bookmark-1",
          type: "link",
          title: "Search result",
          description: "desc",
          url: "https://example.com",
          coverImage: null,
          isFavorite: false,
          createdAt: "2026-03-24",
          folderId: null,
          folderName: null,
          folderEmoji: null,
          platform: "web",
        },
      ],
      total: 1,
      hasMore: false,
      modeUsed: "keyword",
      fallbackReason: undefined,
    })

    const response = await GET(
      new Request(
        "http://localhost/api/bookmarks?search=test&searchMode=invalid&searchScope=compact&folderId=folder-1"
      )
    )

    expect(searchBookmarksMock).toHaveBeenCalledWith({
      userId: "user-1",
      q: "test",
      mode: "keyword",
      scope: "compact",
      folderId: "folder-1",
      type: undefined,
      platform: undefined,
      limit: 20,
      offset: 0,
    })

    await expect(
      readJson<{
        bookmarks: Array<{ id: string; title: string }>
        total: number
        hasMore: boolean
        modeUsed: string
      }>(response)
    ).resolves.toMatchObject({
      bookmarks: [{ id: "bookmark-1", title: "Search result" }],
      total: 1,
      hasMore: false,
      modeUsed: "keyword",
    })
  })
})
