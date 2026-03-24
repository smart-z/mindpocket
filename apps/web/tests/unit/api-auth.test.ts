import { describe, expect, it, vi } from "vitest"

const { getSessionMock, headersMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  headersMock: vi.fn(),
}))

vi.mock("next/headers", () => ({
  headers: headersMock,
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}))

import { requireApiSession } from "@/lib/api-auth"
import { readJson } from "@/tests/helpers/http"

describe("requireApiSession", () => {
  it("returns a 401 response when session is missing", async () => {
    headersMock.mockResolvedValue(new Headers())
    getSessionMock.mockResolvedValue(null)

    const result = await requireApiSession()

    expect(result.ok).toBe(false)

    if (result.ok) {
      throw new Error("expected unauthorized response")
    }

    expect(result.response.status).toBe(401)
    await expect(readJson<{ error: string }>(result.response)).resolves.toEqual({
      error: "Unauthorized",
    })
  })

  it("returns the session when present", async () => {
    const session = { user: { id: "user-1", email: "user@example.com" } }
    headersMock.mockResolvedValue(new Headers())
    getSessionMock.mockResolvedValue(session)

    const result = await requireApiSession()

    expect(result).toEqual({
      ok: true,
      session,
    })
  })
})
