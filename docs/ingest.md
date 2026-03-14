# Ingest 收藏解析架构

本文档详细说明 MindPocket 项目中收藏（Bookmark）数据的摄入解析流程。

## 概述

Ingest 系统负责将用户通过不同渠道（URL、文件、浏览器扩展）添加的收藏内容解析并存储到数据库中。系统采用异步处理模式，接收请求后立即返回，后台完成内容解析和向量化。

## 摄入方式

系统支持三种数据摄入方式：

| 方式 | 来源 | content-type | 说明 |
|------|------|--------------|------|
| URL | Web/Mobile | `application/json` | 用户输入 URL 导入 |
| 文件上传 | Web/Mobile | `multipart/form-data` | 用户上传文件导入 |
| 扩展程序 | 浏览器扩展 | `application/json` | 扩展程序推送页面内容 |

## 核心流程

### 1. API 入口

**文件**: `apps/web/app/api/ingest/route.ts`

```typescript
export async function POST(request: Request) {
  // 1. 获取当前用户
  const session = await auth.api.getSession({ headers: await headers() })

  // 2. 根据 content-type 区分处理方式
  const contentType = request.headers.get("content-type") ?? ""

  if (contentType.includes("multipart/form-data")) {
    return await handleFileUpload(request, userId)
  }

  return await handleJsonIngest(request, userId)
}
```

### 2. 解析管道

**文件**: `apps/web/lib/ingest/pipeline.ts`

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户请求                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              创建 Bookmark 记录（状态: pending）                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              触发异步处理（不等待完成）                            │
│   - ingestFromUrl / ingestFromFile / ingestFromExtension       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              立即返回 { bookmarkId, status: "pending" }         │
└─────────────────────────────────────────────────────────────────┘
```

### 3. 后台异步处理

```
┌─────────────────────────────────────────────────────────────────┐
│                      平台识别                                    │
│   inferPlatform(url) → bilibili | wechat | xiaohongshu | null  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ 需要浏览器渲染  │             │ 不需要浏览器   │
    │ wechat         │             │ bilibili        │
    │ xiaohongshu   │             │ 通用 URL        │
    └─────────────────┘             └─────────────────┘
              │                               │
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │ Puppeteer 抓取  │             │ 直接从 URL 解析 │
    │ HTML 内容       │             │ 或 HTML 转换   │
    └─────────────────┘             └─────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
              ┌─────────────────────────────────┐
              │     内容转换为 Markdown          │
              │   markitdown / 平台转换器        │
              └─────────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────────┐
              │   更新 Bookmark（状态: completed）│
              │   - title, description, content │
              └─────────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────────┐
              │   异步生成向量嵌入                │
              │   generateAndStoreEmbeddings    │
              └─────────────────────────────────┘
```

## 平台处理

### 支持的平台

| 平台 | 需要浏览器 | 专用转换器 | 凭证支持 |
|------|-----------|------------|----------|
| bilibili | ❌ | ✅ | ✅ (SESSDATA) |
| wechat | ✅ | ✅ | ❌ |
| xiaohongshu | ✅ | ✅ | ❌ |
| 通用 | ❌ | ✅ (markitdown) | ❌ |

### 平台识别

**文件**: `apps/web/lib/ingest/types.ts`

```typescript
export function inferPlatform(url: string): Platform | null {
  if (url.includes("bilibili.com")) return "bilibili"
  if (url.includes("weixin.qq.com")) return "wechat"
  if (url.includes("xiaohongshu.com")) return "xiaohongshu"
  return null
}
```

### 平台转换器

**文件**: `apps/web/lib/ingest/platforms/`

- `bilibili.ts` - 解析 B 站视频信息（标题、描述、字幕）
- `wechat.ts` - 解析微信公众号文章
- `xiaohongshu.ts` - 解析小红书笔记
- `index.ts` - 统一导出和平台判断

## 文件处理

### 支持的文件类型

```typescript
const ALLOWED_EXTENSIONS = [
  ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv",
  ".html", ".htm", ".xml", ".md", ".markdown",
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".mp3", ".wav", ".ipynb", ".zip"
]
```

### 文件处理流程

1. **上传**: 文件先上传到 Vercel Blob 存储
2. **转换**: 使用 markitdown 将文件内容转为 Markdown
3. **存储**: 更新 Bookmark 记录，保存 Markdown 内容

## 向量嵌入

### 生成流程

**文件**: `apps/web/lib/ingest/pipeline.ts`

```typescript
async function generateAndStoreEmbeddings(
  bookmarkId: string,
  content: string,
  userId: string
) {
  // 1. 获取用户默认的 embedding 提供商配置
  const config = await getDefaultProvider(userId, "embedding")

  // 2. 获取 embedding 模型并生成向量
  const model = getEmbeddingModel(config)

  // 3. 删除旧的 embedding（如果有）
  await db.delete(embeddingTable).where(...)

  // 4. 生成新的 embedding
  const embeddings = await generateEmbeddings(bookmarkId, content, model)

  // 5. 存储到数据库
  await db.insert(embeddingTable).values(embeddings)
}
```

## 状态流转

```
┌─────────┐    processing    ┌─────────┐    completed    ┌──────────┐
│ pending │ ───────────────▶ │ pending │ ──────────────▶ │ completed│
└─────────┘                  └─────────┘                 └──────────┘
      │                            │
      │                            │ failed
      │                            ▼
      │                     ┌──────────┐
      └─────────────────▶   │ failed   │
                     初始化失败 └──────────┘
```

| 状态 | 说明 |
|------|------|
| pending | 已创建记录，等待处理 |
| processing | 正在解析内容 |
| completed | 解析完成，内容已存储 |
| failed | 解析失败，错误信息已记录 |

## 相关文件

| 文件 | 说明 |
|------|------|
| `apps/web/app/api/ingest/route.ts` | API 入口 |
| `apps/web/lib/ingest/pipeline.ts` | 解析管道核心逻辑 |
| `apps/web/lib/ingest/converter.ts` | 通用内容转换器 |
| `apps/web/lib/ingest/platforms/*.ts` | 平台专用转换器 |
| `apps/web/lib/ingest/auto-folder.ts` | 自动归文件夹逻辑 |
| `apps/web/lib/ingest/types.ts` | 类型定义和 schema |
| `apps/web/lib/ingest/browser.ts` | Puppeteer 浏览器抓取 |
