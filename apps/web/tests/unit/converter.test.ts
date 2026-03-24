import { beforeEach, describe, expect, it, vi } from "vitest"

const { convertMock, convertBufferMock, fetchWithBrowserMock } = vi.hoisted(() => ({
  convertMock: vi.fn(),
  convertBufferMock: vi.fn(),
  fetchWithBrowserMock: vi.fn(),
}))

vi.mock("pdf-parse/worker", () => ({}))

vi.mock("markitdown-ts", () => ({
  MarkItDown: class {
    convert = convertMock
    convertBuffer = convertBufferMock
  },
}))

vi.mock("@/lib/ingest/browser", () => ({
  fetchWithBrowser: fetchWithBrowserMock,
}))

import {
  convertUrl,
  extractDescription,
  inferTypeFromExtension,
  inferTypeFromUrl,
} from "@/lib/ingest/converter"

describe("converter", () => {
  beforeEach(() => {
    convertMock.mockReset()
    convertBufferMock.mockReset()
    fetchWithBrowserMock.mockReset()
  })

  it("infers bookmark type from file extension", () => {
    expect(inferTypeFromExtension(".pdf")).toBe("document")
    expect(inferTypeFromExtension(".md")).toBe("document")
    expect(inferTypeFromExtension("unknown")).toBe("other")
  })

  it("infers bookmark type from url", () => {
    expect(inferTypeFromUrl("https://www.youtube.com/watch?v=123")).toBe("video")
    expect(inferTypeFromUrl("https://example.com/article")).toBe("link")
  })

  it("extracts plain description text from markdown", () => {
    const markdown = "# Title\n\nThis is a [link](https://example.com) with **formatting**."

    expect(extractDescription(markdown)).toBe("This is a link with formatting.")
  })

  it("uses markitdown result when conversion succeeds", async () => {
    convertMock.mockResolvedValue({
      title: "Converted",
      markdown: "Hello",
    })

    await expect(convertUrl("https://example.com")).resolves.toEqual({
      title: "Converted",
      markdown: "Hello",
    })

    expect(fetchWithBrowserMock).not.toHaveBeenCalled()
  })

  it("falls back to browser rendering when markitdown fails", async () => {
    convertMock.mockRejectedValueOnce(new Error("boom"))
    convertMock.mockResolvedValueOnce({ title: "Fallback", markdown: "Fallback body" })
    fetchWithBrowserMock.mockResolvedValue("<h1>Fallback</h1>")

    const result = await convertUrl("https://example.com")

    expect(fetchWithBrowserMock).toHaveBeenCalledWith("https://example.com")
    expect(result).toEqual({
      title: "Fallback",
      markdown: "Fallback body",
    })
  })

  it("uses browser rendering immediately for WeChat articles", async () => {
    fetchWithBrowserMock.mockResolvedValue("<p>Rendered</p>")
    convertMock.mockResolvedValue({ title: "Rendered", markdown: "Rendered" })

    await convertUrl("https://mp.weixin.qq.com/s/123")

    expect(fetchWithBrowserMock).toHaveBeenCalled()
  })
})
