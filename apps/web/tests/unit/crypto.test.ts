import { afterEach, describe, expect, it, vi } from "vitest"
import { decrypt, encrypt } from "@/lib/crypto"

describe("crypto", () => {
  const originalSecret = process.env.BETTER_AUTH_SECRET

  afterEach(() => {
    process.env.BETTER_AUTH_SECRET = originalSecret
  })

  it("round-trips encrypted text", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret"

    const plaintext = "mindpocket"
    const encrypted = encrypt(plaintext)

    expect(encrypted).not.toBe(plaintext)
    expect(decrypt(encrypted)).toBe(plaintext)
  })

  it("produces different ciphertext for the same plaintext", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret"

    const first = encrypt("repeatable")
    const second = encrypt("repeatable")

    expect(first).not.toBe(second)
  })

  it("throws when secret is missing", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", undefined)

    const { encrypt: freshEncrypt } = await import("@/lib/crypto")

    expect(() => freshEncrypt("hello")).toThrow("BETTER_AUTH_SECRET is not set")
  })

  it("throws on invalid encrypted payload format", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret"

    expect(() => decrypt("invalid-payload")).toThrow("Invalid encrypted format")
  })
})
