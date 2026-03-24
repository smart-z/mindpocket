# MindPocket `apps/web` 测试体系一期方案

## 背景

当前仓库是一个 `pnpm + turbo` 的 monorepo，包含 `web`、`site`、`cli`、`native`、`extension` 等多个应用。但根目录和 `apps/web` 目前都还没有正式测试脚本、测试配置和测试目录约定。

在现阶段直接追求“全仓库全覆盖”会把复杂度拉得太高，也会把数据库、浏览器自动化、外部 AI 依赖、抓取链路全部混在一起，首期很难稳定落地。

因此一期测试方案聚焦 `apps/web`，目标是先建立一套能长期演进的基础设施，让测试能跑起来、能维护、能逐步扩展。

## 目标

- 为 `apps/web` 建立正式测试体系
- 第一阶段形成“单元测试 + route 测试 + 少量关键 E2E”的最小闭环
- 优先覆盖高价值、低脆弱、容易回归的核心模块
- 先把本地命令和测试约定跑顺，暂不立即接入 CI 门禁
- 为后续数据库集成测试、覆盖率门槛、CI 流程预留演进空间

## 非目标

- 一期不覆盖 `apps/site`
- 一期不覆盖 `apps/cli`
- 一期不覆盖 `apps/native`
- 一期不覆盖 `apps/extension`
- 一期不强行把 AI、抓取、上传、浏览器渲染等强外部依赖模块全部纳入
- 一期不建立重型数据库集成测试平台
- 一期不设置覆盖率硬门槛
- 一期不接 GitHub Actions PR 门禁

## 方案结论

一期采用“分层最小闭环”方案：

- 使用 `Vitest` 作为主测试框架
- 使用 `Playwright` 负责关键用户路径 E2E
- 单元测试覆盖纯逻辑模块和轻依赖模块
- route 测试直接调用 App Router 的 handler，并通过 mock 隔离鉴权、数据库和外部依赖
- E2E 仅覆盖 2 到 4 条关键流程，不追求全面铺开

这个方案的优点是投入产出比最高，能最快在当前仓库里形成稳定测试习惯，而不是先搭一套很重但很难维护的体系。

## 备选方案比较

### 方案 A：分层最小闭环

推荐采用。

- 单元测试覆盖 `lib` 下纯函数与轻依赖模块
- route 测试覆盖鉴权、参数校验、返回结构和错误分支
- E2E 只覆盖关键真实流程
- 数据库相关逻辑首期通过 route 层间接覆盖为主

优点：

- 落地快
- 学习成本低
- 维护压力小
- 对常见回归有明显收益

缺点：

- 对复杂 query 的直接防护还不够强
- 对多表行为和 SQL 回归的覆盖不如集成测试

### 方案 B：高置信度业务闭环

不作为一期方案，保留给二期。

- 在方案 A 基础上增加测试数据库、迁移、seed 和 query 层集成测试
- 将 `db/queries` 作为重点覆盖对象

优点：

- 对真实业务行为保护更强
- 能更早暴露数据库层面的回归

缺点：

- 环境复杂度显著提升
- 首期建设成本过高
- 容易拖慢整体落地节奏

### 方案 C：只做单元/组件

不推荐。

- 只补纯函数和组件测试
- 不引入 route 测试或 E2E

优点：

- 起步最轻

缺点：

- 对鉴权、路由、真实页面流程几乎没有保护
- 无法覆盖这个项目最容易出问题的路径

## 一期覆盖范围

一期只覆盖 `apps/web`。

### P0

- `apps/web/lib/crypto.ts`
- `apps/web/lib/ingest/converter.ts` 中纯逻辑函数和可 mock 的转换流程
- `apps/web/lib/api-auth.ts`
- `apps/web/app/api/bookmarks/route.ts`
- `apps/web/app/api/folders/route.ts`
- `apps/web/app/api/dashboard/route.ts`
- 关键 E2E：
  - 登录
  - 浏览书签列表
  - 创建文件夹
  - 最短新增书签路径

### P1

- `apps/web/db/queries/bookmark.ts`
- `apps/web/db/queries/folder.ts`
- `apps/web/app/api/bookmarks/[id]/route.ts`
- `apps/web/app/api/folders/[id]/route.ts`
- 搜索和 dashboard 相关页面流

### P2

以下模块首期只预留可测试边界，不作为重点覆盖对象：

- `apps/web/lib/ingest/browser.ts`
- `apps/web/lib/ingest/pipeline.ts`
- `apps/web/lib/ingest/auto-folder.ts`
- `apps/web/app/api/chat/route.ts`
- `apps/web/app/api/ingest/**`
- `apps/web/app/api/files/upload/route.ts`

## 工具选型

### 单元测试与 route 测试

使用 `Vitest`。

原因：

- 对 TypeScript 和 ESM 支持自然
- 启动快，适合 monorepo 和高频本地运行
- 可以同时承担单元测试和 route handler 测试
- mock、watch、coverage 能力足够成熟

### DOM/组件测试

组件测试不是一期重点，但为后续扩展预留：

- `@testing-library/react`
- `jsdom`

默认测试环境仍然是 `node`，只有明确需要 DOM 的测试才切换到 `jsdom`。

### E2E

使用 `Playwright`。

原因：

- 对 Next.js 的适配更稳
- 调试体验好
- 等待机制、trace、截图、录像能力成熟
- 后续接 CI 与多浏览器扩展更顺

### 覆盖率

使用 `@vitest/coverage-v8`。

一期先输出覆盖率报告，不设硬性阈值。等测试基线稳定后，再在二期考虑最低门槛。

## 目录结构约定

在 `apps/web` 内建立统一测试目录，避免同一项目内既有集中式又有 colocated 的混乱模式。

建议结构：

```text
apps/web/
  vitest.config.ts
  playwright.config.ts
  tests/
    setup/
      env.ts
      vitest.setup.ts
    helpers/
    mocks/
    factories/
    unit/
    routes/
    e2e/
```

约定如下：

- `tests/unit` 放纯逻辑和轻依赖模块测试
- `tests/routes` 放 App Router handler 级测试
- `tests/e2e` 放 Playwright 场景
- `tests/setup` 负责环境初始化和全局测试 setup
- `tests/mocks` 统一放模块 mock helper
- `tests/factories` 放测试数据工厂

## 脚本设计

### 根目录脚本

建议新增：

- `test`
- `test:watch`
- `test:coverage`
- `test:e2e`
- `test:web`
- `test:web:e2e`

### `apps/web` 脚本

建议新增：

- `test`: `vitest run`
- `test:watch`: `vitest`
- `test:coverage`: `vitest run --coverage`
- `test:e2e`: `playwright test`
- `test:e2e:ui`: `playwright test --ui`
- `test:e2e:headed`: `playwright test --headed`

一期先不把 `test` 正式纳入 `turbo.json` 的 task 图，先把本地体验打磨稳定。

## 测试边界设计

### Route handler 边界

当前 route 直接依赖：

- `requireApiSession`
- `auth.api.getSession`
- `next/headers`
- `db`

一期测试中通过 mock 边界依赖解决，不强制先做业务重构。

但后续建议逐步把 route 中的业务逻辑下沉成 service 层函数，例如：

- `listBookmarksForRequest(input, deps)`
- `createFolder(input, deps)`
- `getDashboardData(userId, deps)`

这样 route 测试只验证 HTTP 行为，service 测试验证业务行为，可维护性更高。

### 外部依赖边界

以下依赖在测试中统一 mock，不走真实外部服务：

- `better-auth`
- `next/headers`
- `markitdown-ts`
- 浏览器抓取逻辑
- AI provider / model
- Vercel Blob
- Redis

### 环境变量边界

测试环境统一提供最小必需变量：

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

这些值放在 `tests/setup/env.ts` 中统一注入，避免测试文件各自手工设置。

## 单元测试范围

### `apps/web/lib/crypto.ts`

首批测试场景：

- `encrypt` 后可被 `decrypt` 正确还原
- 相同明文多次加密结果不同
- `BETTER_AUTH_SECRET` 缺失时报错
- 非法密文格式时报错
- 篡改 tag 或 ciphertext 时解密失败

### `apps/web/lib/ingest/converter.ts`

首批测试场景：

- `inferTypeFromExtension` 对常见扩展名映射正确
- `inferTypeFromUrl` 对常见 URL 类型识别正确
- `extractDescription` 能去掉 markdown 格式、保留正文、执行截断
- `convertUrl` 在 `markitdown` 成功时返回标准结果
- `convertUrl` 在 `markitdown` 失败时降级到 browser fallback
- 微信链接直接走 browser fallback

### `apps/web/lib/api-auth.ts`

首批测试场景：

- 无 session 时返回 401 响应包装
- 有 session 时返回 `{ ok: true, session }`

## Route 测试范围

route 测试不启动完整 Next.js server，直接导入并调用 `GET/POST/PATCH/DELETE`。

### `apps/web/app/api/bookmarks/route.ts`

测试场景：

- 未登录返回 401
- 默认参数下返回书签列表
- 有 `search` 参数时走 `searchBookmarks`
- 无 `search` 参数时走 `getBookmarksByUserId`
- 正确透传 `type/platform/folderId/limit/offset`
- `searchMode/searchScope` 的默认行为正确

### `apps/web/app/api/folders/route.ts`

测试场景：

- 未登录返回 401
- `GET` 返回文件夹及最多 5 条书签预览
- `POST` 缺少 `name` 返回 400
- `POST` 创建成功返回 201
- `PATCH` 缺少 `orderedIds` 返回 400
- `PATCH` 包含非法 folder id 返回 400
- `DELETE` 缺少 `id` 返回 400
- `DELETE` 成功返回 `{ success: true }`

### `apps/web/app/api/dashboard/route.ts`

测试场景：

- 已登录时返回统计结构
- `days` 缺省时默认使用 30
- `growthTrend` 能补齐没有数据的日期

注意：

当前实现中使用了 `session!` 非空断言，没有显式处理未登录分支。一期测试很可能会暴露这个问题，如果实现时确认存在风险，应顺手修复。

## E2E 范围

一期只保留 2 到 4 条高价值、低脆弱的 Playwright 场景。

### E2E 1：登录

- 打开登录页
- 输入测试账号
- 登录成功后进入主应用
- 页面出现稳定锚点，证明登录完成

### E2E 2：创建文件夹

- 登录
- 打开新建文件夹交互
- 输入名称与描述
- 保存成功
- 列表中出现新文件夹

### E2E 3：浏览书签列表

- 登录
- 进入主页面
- 显示 seed 中的书签数据
- 执行一个简单搜索或过滤，结果变化符合预期

### E2E 4：最短新增书签路径

默认优先选择“URL 导入的最短路径”。

如果完整导入链路依赖抓取或外部解析导致稳定性较差，则退一步改成：

- 验证导入表单提交流程
- 或验证更轻量的新增路径

原则是不让首期 E2E 被外部网页和第三方依赖拖垮。

## 测试数据策略

### 单元与 route 测试

采用 mock-first 策略：

- `db` 用模块 mock 或 query stub
- `requireApiSession`、`auth.api.getSession` 用模块 mock
- 不连接真实 PostgreSQL

这样能保证：

- 测试快
- 错误定位清晰
- 首期环境成本低

### E2E

采用“独立测试数据库 + 固定 seed”策略。

建议：

- 复用仓库已有的 PostgreSQL 容器
- 使用单独数据库名，例如 `mindpocket_e2e`
- 启动前执行 schema bootstrap
- 用轻量 seed 脚本创建：
  - 1 个测试用户
  - 2 到 3 个文件夹
  - 5 到 10 条书签

不建议首期让每个测试文件自己迁移数据库。更稳妥的方式是：

- 在 Playwright `globalSetup` 中准备一次
- 每个用例尽量使用幂等命名或独立数据，减少互相污染

## Mock 约定

为了避免测试风格分散，一期建立统一规则：

- route 测试只 mock 边界依赖，不 mock 被测函数本身
- 优先 mock 模块，不深入 mock 内部实现细节
- 全部共享 mock helper 放入 `tests/mocks`
- 在 `beforeEach` 中执行 `vi.resetAllMocks()`
- 涉及时间逻辑时固定 `Date` 或使用 fake timers

建议提供的 helper：

- `mockSession(userId?: string)`
- `mockUnauthorizedSession()`
- `makeRequest(url, init?)`
- 常见 `db` 返回值 factory

## 环境与执行模型

### Vitest

- 默认环境：`node`
- 配置路径别名以支持 `@/`
- `setupFiles` 负责：
  - 注入测试 env
  - 清理 mock
  - 挂载通用 helper

### Playwright

- 使用独立测试端口，例如 `3100`
- 通过 `webServer` 启动 `apps/web`
- 使用测试专用环境变量
- `baseURL` 固定为 `http://127.0.0.1:3100`

实现阶段建议新增测试专用启动方式，避免和日常开发环境冲突。

## 验收标准

一期完成后应满足以下条件：

### 开发体验

- 开发者按文档能在本地 15 分钟内跑起测试
- `pnpm test` 能跑通单元和 route 测试
- `pnpm test:e2e` 能独立跑通关键流程
- 失败日志足够定位，不依赖猜测

### 覆盖结果

- 至少 8 到 15 个有效 Vitest 用例
- 至少 2 到 4 个 Playwright 场景
- P0 模块全部有测试覆盖
- 覆盖率报告可生成

### 质量约束

- 测试不得依赖线上服务
- 测试不得读取开发者本地真实账号与真实数据
- E2E 不得强耦合不稳定外部页面抓取结果

## 测试场景清单

### 正常路径

- 已登录用户成功获取书签
- 已登录用户成功创建文件夹
- dashboard 正常返回统计数据
- crypto 正常加解密
- converter 在正常输入下输出预期结果

### 异常路径

- 未登录访问 API
- 缺少必填参数
- 非法参数类型
- 外部解析失败时 fallback 行为
- 解密输入损坏
- 文件夹排序请求中包含非法 id

### 边界情况

- 空结果集
- `limit=0` 或缺省 limit 的处理
- `days` 为非法值时的默认行为
- markdown 极短、极长、仅包含格式字符时的 description 提取
- 文件夹列表为空时的返回结构

## 实施顺序

### Phase 1

建立基础设施和最小 smoke test。

- 安装依赖
- 建立 `vitest.config.ts`
- 建立 `playwright.config.ts`
- 建立 `tests/setup`、`tests/helpers`、`tests/mocks`
- 补齐 `package.json` 脚本
- 写一个最简单的纯函数测试和一个 route smoke test

### Phase 2

补齐 P0 测试。

- `crypto`
- `converter`
- `api-auth`
- `bookmarks route`
- `folders route`
- `dashboard route`
- 2 条关键 E2E

### Phase 3

补 README 和测试说明。

- 在 `apps/web/README.md` 中增加测试运行文档
- 记录测试环境变量
- 说明 unit、route、e2e 的边界与规范
- 说明 seed 和 mock 约定

### Phase 4

二期扩展，不属于本次实现。

- GitHub Actions 接入
- 数据库集成测试
- 覆盖率阈值
- 更多 E2E
- query 层直接测试
- 组件测试体系

## 默认假设

- 一期只覆盖 `apps/web`
- 一期测试深度采用“分层最小闭环”
- 主测试框架使用 `Vitest`
- E2E 使用 `Playwright`
- 先做好本地运行体验，CI 后补
- route 测试以 mock 边界依赖为主
- E2E 使用独立测试数据库与固定 seed
- AI、抓取、上传等外部依赖模块首期不作为重点测试对象
- 测试目录采用集中式结构

## 风险与注意事项

- `apps/web/db/client.ts` 在模块加载时依赖 `DATABASE_URL`，如果测试 setup 过晚会出现导入即失败
- `dashboard` route 当前对 session 的处理不够防御式，测试可能暴露真实缺陷
- `converter`、`auth`、`ingest` 等模块存在顶层依赖，mock 边界必须统一，否则测试会很脆
- 如果 E2E 强行覆盖完整抓取链路，首期稳定性会显著下降

## 实施提示

实现时应优先按下面顺序推进：

1. 先让 `Vitest` 跑通一个纯函数 smoke test
2. 再让一个 route test 跑通
3. 再让 Playwright 最小登录流程跑通
4. 最后补齐 P0 覆盖和 README

这样可以最快验证整套方案是否真正可执行，而不是只停留在配置层面。
