// 数据摄入 API，支持 URL、扩展程序和文件上传三种导入方式
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { resolveFolderForIngest } from "@/lib/ingest/auto-folder"
import { ingestFromExtension, ingestFromFile, ingestFromUrl } from "@/lib/ingest/pipeline"
import { ingestExtensionSchema, ingestUrlSchema } from "@/lib/ingest/types"

// 目前不支持 pdf 解析
// 支持的文件扩展名列表
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".csv",
  ".html",
  ".htm",
  ".xml",
  ".md",
  ".markdown",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".mp3",
  ".wav",
  ".ipynb",
  ".zip",
]

// 最大文件大小：50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024
// 提取文件扩展名的正则
const FILE_EXT_REGEX = /\.[^.]+$/

export async function POST(request: Request) {
  // 获取当前用户
  const session = await auth.api.getSession({ headers: await headers() })
  const userId = session!.user!.id

  //

  // 根据 content-type 区分处理方式
  const contentType = request.headers.get("content-type") ?? ""

  try {
    if (contentType.includes("multipart/form-data")) {
      return await handleFileUpload(request, userId)
    }

    return await handleJsonIngest(request, userId)
  } catch (error) {
    console.error("[ingest] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// 处理 JSON 格式的数据摄入，支持扩展程序和 URL 两种来源
async function handleJsonIngest(request: Request, userId: string) {
  const body = await request.json()
  console.log("[ingest] body:", JSON.stringify(body))

  // 扩展程序客户端会带有 html 内容，直接走扩展程序处理流程
  const isExtensionClient = body?.clientSource === "extension"
  if (isExtensionClient || body.html) {
    // 使用扩展程序 schema 验证请求参数
    const parsed = ingestExtensionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // 解析 folderId，未指定则根据内容自动选择
    const resolvedFolderId =
      parsed.data.folderId ??
      (await resolveFolderForIngest({
        userId,
        sourceType: "extension",
        url: parsed.data.url,
        title: parsed.data.title,
      }))

    // 调用扩展程序摄入管道
    const result = await ingestFromExtension({
      userId,
      url: parsed.data.url,
      html: parsed.data.html,
      folderId: resolvedFolderId ?? undefined,
      title: parsed.data.title,
      clientSource: parsed.data.clientSource,
    })
    console.log("Ingest from extension result:", result)
    return NextResponse.json(result, { status: 201 })
  }

  // URL 来源：使用 URL schema 验证请求参数
  const parsed = ingestUrlSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // 解析 folderId，未指定则根据 URL 自动选择
  const resolvedFolderId =
    parsed.data.folderId ??
    (await resolveFolderForIngest({
      userId,
      sourceType: "url",
      url: parsed.data.url,
      title: parsed.data.title,
    }))

  // 调用 URL 摄入管道
  const result = await ingestFromUrl({
    userId,
    url: parsed.data.url,
    folderId: resolvedFolderId ?? undefined,
    title: parsed.data.title,
    clientSource: parsed.data.clientSource,
  })
  return NextResponse.json(result, { status: 201 })
}

// 处理文件上传方式的数据摄入
async function handleFileUpload(request: Request, userId: string) {
  // 解析 formData 获取各字段
  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const rawFolderId = formData.get("folderId")
  // 解析 folderId，过滤空字符串
  const folderId =
    typeof rawFolderId === "string" && rawFolderId.trim().length > 0 ? rawFolderId.trim() : null
  const title = formData.get("title") as string | null
  const clientSource = formData.get("clientSource") as string | null

  // 验证：文件不能为空
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // 验证：clientSource 必须是有效值
  if (!(clientSource && ["web", "mobile", "extension"].includes(clientSource))) {
    return NextResponse.json({ error: "Invalid or missing clientSource" }, { status: 400 })
  }

  // 验证：文件大小不能超过 50MB
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 })
  }

  // 验证：文件扩展名必须在允许列表中
  const ext = file.name.match(FILE_EXT_REGEX)?.[0]?.toLowerCase() ?? ""
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: `Unsupported file type: ${ext}` }, { status: 400 })
  }

  // 解析 folderId，未指定则根据文件名自动选择
  const resolvedFolderId =
    folderId ??
    (await resolveFolderForIngest({
      userId,
      sourceType: "file",
      title: title ?? undefined,
      fileName: file.name,
    }))

  // 调用文件摄入管道
  const result = await ingestFromFile({
    userId,
    file,
    folderId: resolvedFolderId ?? undefined,
    title: title ?? undefined,
    clientSource,
  })

  return NextResponse.json(result, { status: 201 })
}
