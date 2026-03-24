# MindPocket CLI

MindPocket CLI is a JSON-first command line client for agents, scripts, and developers working with a MindPocket server.

## Requirements

- Node.js 18 or newer

## Install

```bash
npm install -g mindpocket
```

Or with pnpm:

```bash
pnpm add -g mindpocket
```

## Quick Start

```bash
mindpocket version
mindpocket schema
mindpocket doctor
mindpocket --help
mindpocket config set server https://your-domain.com
mindpocket auth login
mindpocket user me
mindpocket bookmarks list
```

## Login Flow

MindPocket CLI uses OAuth Device Authorization.

1. Run `mindpocket auth login`
2. Open the verification URL shown by the CLI
3. Sign in to your MindPocket account
4. Approve the device request
5. Return to the terminal and continue using CLI commands

For remote shells or orchestrators:

- `mindpocket auth login --no-open` keeps the flow non-interactive on the local machine
- `mindpocket auth login --device-code-only` returns the device flow payload without polling

## Common Commands

```bash
mindpocket doctor
mindpocket schema
mindpocket ping
mindpocket auth --help
mindpocket config get
mindpocket user me
mindpocket bookmarks list --limit 10
mindpocket bookmarks create --url https://example.com
mindpocket folders list
mindpocket bookmarks update bk_123 --title Example
mindpocket bookmarks delete bk_123
mindpocket folders get folder_123
```

## Help for Agents

Every command provides structured `--help` output with:

- Summary
- Usage
- Arguments
- Options
- Auth requirements
- Output fields
- Examples
- Errors

Examples:

```bash
mindpocket --help
mindpocket auth --help
mindpocket bookmarks create --help
```

For machine-readable command discovery, use:

```bash
mindpocket schema
mindpocket schema auth login
```

For one-shot environment readiness checks, use:

```bash
mindpocket doctor
```

## Upgrade

```bash
npm install -g mindpocket@latest
```

Advanced agent users can also install the repository skill that wraps this CLI workflow guidance:

```bash
npx skills add https://github.com/jihe520/mindpocket --skill mindpocket
```

For local testing from a repository checkout:

```bash
npx skills add ./skills/mindpocket
```

## Uninstall

```bash
npm uninstall -g mindpocket
```
