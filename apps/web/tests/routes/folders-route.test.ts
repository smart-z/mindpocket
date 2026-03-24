import { beforeEach, describe, expect, it, vi } from "vitest"

const { requireApiSessionMock, selectMock, insertMock, updateMock, deleteMock, nanoidMock } =
  vi.hoisted(() => ({
    requireApiSessionMock: vi.fn(),
    selectMock: vi.fn(),
    insertMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
    nanoidMock: vi.fn(() => "folder-new"),
  }))

vi.mock("@/lib/api-auth", () => ({
  requireApiSession: requireApiSessionMock,
}))

vi.mock("nanoid", () => ({
  nanoid: nanoidMock,
}))

vi.mock("@/db/client", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
  },
}))

import { DELETE, PATCH, POST } from "@/app/api/folders/route"
import { readJson } from "@/tests/helpers/http"

describe("/api/folders route validation", () => {
  beforeEach(() => {
    requireApiSessionMock.mockReset()
    selectMock.mockReset()
    insertMock.mockReset()
    updateMock.mockReset()
    deleteMock.mockReset()
    nanoidMock.mockClear()
  })

  it("returns unauthorized for POST without a session", async () => {
    const unauthorized = Response.json({ error: "Unauthorized" }, { status: 401 })
    requireApiSessionMock.mockResolvedValue({ ok: false, response: unauthorized })

    const response = await POST(
      new Request("http://localhost/api/folders", {
        method: "POST",
        body: JSON.stringify({ name: "Inbox" }),
      })
    )

    expect(response.status).toBe(401)
  })

  it("rejects empty folder names", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { user: { id: "user-1" } },
    })

    const response = await POST(
      new Request("http://localhost/api/folders", {
        method: "POST",
        body: JSON.stringify({ name: "   " }),
      })
    )

    expect(response.status).toBe(400)
    await expect(readJson<{ error: string }>(response)).resolves.toEqual({
      error: "名称不能为空",
    })
  })

  it("creates a folder when payload is valid", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { user: { id: "user-1" } },
    })

    const whereMock = vi.fn().mockResolvedValue([{ maxOrder: 2 }])
    const fromMock = vi.fn(() => ({ where: whereMock }))
    selectMock.mockReturnValue({ from: fromMock })

    const returningMock = vi.fn().mockResolvedValue([
      {
        id: "folder-new",
        name: "Inbox",
        description: "Captured links",
        emoji: "📥",
        sortOrder: 3,
      },
    ])
    const valuesMock = vi.fn(() => ({ returning: returningMock }))
    insertMock.mockReturnValue({ values: valuesMock })

    const response = await POST(
      new Request("http://localhost/api/folders", {
        method: "POST",
        body: JSON.stringify({ name: "Inbox", emoji: "📥", description: "Captured links" }),
      })
    )

    expect(response.status).toBe(201)
    expect(insertMock).toHaveBeenCalled()
    expect(valuesMock).toHaveBeenCalledWith({
      id: "folder-new",
      userId: "user-1",
      name: "Inbox",
      description: "Captured links",
      emoji: "📥",
      sortOrder: 3,
    })
    await expect(readJson<{ folder: { id: string; items: unknown[] } }>(response)).resolves.toEqual(
      {
        folder: {
          id: "folder-new",
          name: "Inbox",
          description: "Captured links",
          emoji: "📥",
          sortOrder: 3,
          items: [],
        },
      }
    )
  })

  it("rejects empty orderedIds payload for PATCH", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { user: { id: "user-1" } },
    })

    const response = await PATCH(
      new Request("http://localhost/api/folders", {
        method: "PATCH",
        body: JSON.stringify({ orderedIds: [] }),
      })
    )

    expect(response.status).toBe(400)
    await expect(readJson<{ error: string }>(response)).resolves.toEqual({
      error: "orderedIds is required",
    })
  })

  it("rejects missing id payload for DELETE", async () => {
    requireApiSessionMock.mockResolvedValue({
      ok: true,
      session: { user: { id: "user-1" } },
    })

    const response = await DELETE(
      new Request("http://localhost/api/folders", {
        method: "DELETE",
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(400)
    await expect(readJson<{ error: string }>(response)).resolves.toEqual({
      error: "缺少文件夹 ID",
    })
  })
})
