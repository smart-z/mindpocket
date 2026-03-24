# MindPocket CLI Agent-Friendly 增强方案

## 摘要

当前 `apps/cli` 已具备最小可用能力，特点是：

- JSON-first 的结果输出
- 手写参数解析与命令分发
- 基于 OAuth Device Authorization 的登录流程
- 已有基础资源命令：`auth`、`config`、`user`、`bookmarks`、`folders`

但它还不够 agent-friendly，主要缺口是：

- 缺少单条“总状态”命令，agent 需要拼多个命令才能判断当前环境
- 缺少机器可发现能力，`--help` 仍然主要面向人类
- 缺少完整资源生命周期操作，只有部分读写能力
- 非交互场景下的认证控制不够细，`auth login` 默认尝试打开浏览器
- 错误码和退出码虽有雏形，但没有形成完整契约

## 目标

- 让 agent 能通过少量命令完成环境探测、认证判断、资源查询和最小修改
- 让 agent 能机器可读地发现 CLI 支持的命令、参数、返回结构和错误模型
- 让认证和诊断命令在无 UI、无浏览器、CI、远端 shell 等环境下可稳定运行
- 保持当前 CLI 的发布方式、JSON-first 输出方式和现有命令风格
- 优先做增量演进，不引入新的命令框架

## 新增命令

```bash
mindpocket doctor
mindpocket version
mindpocket schema [command]
mindpocket ping
mindpocket auth login [--server <url>] [--no-open] [--device-code-only]
mindpocket bookmarks update <id> [--title <title>] [--folder-id <id>]
mindpocket bookmarks delete <id>
mindpocket folders get <id>
```

## 契约

- 普通命令默认输出 JSON
- `schema` 作为 agent 的命令发现入口
- `doctor` 作为 agent 的总状态入口
- 退出码约定：
  - `0` 成功
  - `2` 认证相关失败
  - `3` 配置缺失
  - `4` 参数错误
  - `5` 网络或服务端不可达

## Agent 工作流

1. `mindpocket version`
2. `mindpocket schema`
3. `mindpocket doctor`
4. 如果未配置 server：`mindpocket config set server <url>`
5. 如果未登录：`mindpocket auth login --no-open` 或 `--device-code-only`
6. 然后再调用资源命令
