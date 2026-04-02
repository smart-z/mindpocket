<p align="center">
  <img src="./docs/icon.svg" width="80" height="80" alt="MindPocket Logo" />
</p>

<h1 align="center">MindPocket</h1>

<p align="center">
  A fully open-source, free, multi-platform, one-click deployable personal bookmark system with AI Agent integration.
</p>

<p align="center">
  <a href="./README_CN.md">中文文档</a>
</p>

<p align="center">
  <img src="./docs/all.png" alt="MindPocket Preview" />
</p>

<details>
<summary>📸 More Screenshots</summary>

| Web | AI Chat | Mobile |
|:---:|:---:|:---:|
| ![Web](./docs/pic/web1.png) | ![AI Chat](./docs/pic/web2.png) | ![Mobile](./docs/pic/phone.png) |
| ![Web Detail](./docs/pic/web3.png) | ![Extension](./docs/pic/extension.png) | |

</details>

MindPocket organizes your bookmarks with AI-powered RAG content summarization and automatic tag generation, making it easy to find and manage your saved content.

## ✨ Features

1. **Zero Cost**: Vercel + Neon free tier is enough for personal use
2. **One-Click Deploy**: Set up your personal bookmark system in minutes
3. **Multi-Platform**: Web + Mobile + Browser Extension
4. **AI Enhanced**: RAG and AI Agent for smart tagging and summarization
5. **CLI Ready**: Official CLI makes it easy to integrate with external agents like OpenClaw
6. **Open Source**: Fully open source, your data belongs to you

## 🎨 VIBE CODING

This is a pure **VIBE CODING** project:

- I only implemented one core feature, the rest was built by Claude Code
- **26,256 lines** of pure code, see [Code Insight](./docs/codeinsight.md)
- VIBE Coding experience summary: [Development Experience](./docs/experience.md)
- VIBE Coding write-up (CN): [How I VIBE CODED this project](./docs/vibe-coding.md)
- VIBE Coding PRs are welcome!!!

## 🚀 Quick Deploy

### Prerequisites

- [Vercel Account](https://vercel.com) (Free)
- A PostgreSQL database
- LLM and Embedding Model API Key

### Deploy Steps

1. **[Fork this repository](../../fork)**
2. **Connect to Vercel**
   - Click "New Project" → "Import Git Repository" in Vercel dashboard
   - Select your forked MindPocket repository
   - Set Root Directory to `apps/web`
   - Keep Build Command as `pnpm build`
   - Click "Deploy"
   - Add a PostgreSQL `DATABASE_URL` in "Settings" → "Environment Variables"
   - Neon pooled URLs work out of the box if you want a managed option
   - Connect Vercel Blob storage
   - Add the remaining environment variables in "Settings" → "Environment Variables" (refer to `apps/web/.env.example`)

3. **Initialize Database**
   - No manual action required
   - During build, the app runs an idempotent bootstrap (`CREATE EXTENSION IF NOT EXISTS vector` + `drizzle-kit push --force`)

4. **Create Admin Account**
   - Visit your deployment URL
   - Register your first account to start using

## 🐳 Docker Deployment

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start

```bash
# Copy and edit environment variables
cp .env.example .env

# Build and start all services
docker compose up -d
```

Visit http://localhost:3000 to start using.

### Services

| Service | Description | Default Port |
|---------|-------------|--------------|
| `mindpocket` | Next.js Web App | 3000 |
| `postgres` | pgvector/PostgreSQL 17 | 5432 (internal only) |

### Environment Variables

Key variables (see `.env.example` for full list):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Host port for the web service |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public URL of the app |
| `BETTER_AUTH_SECRET` | `mindpocket-local-dev-secret` | Auth secret, **must replace in production** |
| `POSTGRES_USER` | `mindpocket` | Built-in PostgreSQL username |
| `POSTGRES_PASSWORD` | `mindpocket` | Built-in PostgreSQL password |
| `POSTGRES_DB` | `mindpocket` | Built-in PostgreSQL database name |
| `DATABASE_URL` | auto-generated | External DB connection string; overrides built-in PostgreSQL config |

### Using an External Database

Set `DATABASE_URL` directly:

```bash
DATABASE_URL=postgresql://user:password@db.example.com:5432/mindpocket?sslmode=require
```

Or configure individual parts: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

### Common Commands

```bash
# Start in background
docker compose up -d

# View logs
docker compose logs -f

# View web service logs only
docker compose logs -f mindpocket

# Stop services
docker compose down

# Stop and remove data volumes
docker compose down -v

# Rebuild image
docker compose up -d --build
```

### Container Startup Flow

On startup, the container automatically (see `docker-entrypoint.sh`):

1. Assembles `DATABASE_URL` from env vars (if not provided directly)
2. Ensures PostgreSQL extensions are installed (`pgvector`, etc.)
3. Pushes database schema via Drizzle ORM
4. Starts the Next.js standalone server

## 🐳 Docker Deployment (Web Only)

> Docker deployment currently covers only the **Web application** (`apps/web`). Mobile app and browser extension are not included.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start

```bash
# Copy and edit environment variables
cp .env.example .env

# Build and start all services
docker compose up -d
```

Visit http://localhost:3000 to start using.

### Services

| Service | Description | Default Port |
|---------|-------------|--------------|
| `mindpocket` | Next.js Web App (`apps/web`) | 3000 |
| `postgres` | pgvector/PostgreSQL 17 | 5432 (internal only) |

### Environment Variables

Key variables (see `.env.example` for full list):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Host port for the web service |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Public URL of the app |
| `BETTER_AUTH_SECRET` | `mindpocket-local-dev-secret` | Auth secret, **must replace in production** |
| `POSTGRES_USER` | `mindpocket` | Built-in PostgreSQL username |
| `POSTGRES_PASSWORD` | `mindpocket` | Built-in PostgreSQL password |
| `POSTGRES_DB` | `mindpocket` | Built-in PostgreSQL database name |
| `DATABASE_URL` | auto-generated | External DB connection string; overrides built-in PostgreSQL config |

### Using an External Database

Set `DATABASE_URL` directly:

```bash
DATABASE_URL=postgresql://user:password@db.example.com:5432/mindpocket?sslmode=require
```

Or configure individual parts: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

### Common Commands

```bash
# Start in background
docker compose up -d

# View logs
docker compose logs -f

# View web service logs only
docker compose logs -f mindpocket

# Stop services
docker compose down

# Stop and remove data volumes
docker compose down -v

# Rebuild image
docker compose up -d --build
```

### Container Startup Flow

On startup, the container automatically (see `docker-entrypoint.sh`):

1. Assembles `DATABASE_URL` from env vars (if not provided directly)
2. Ensures PostgreSQL extensions are installed (`pgvector`, etc.)
3. Pushes database schema via Drizzle ORM
4. Starts the Next.js standalone server

## 💻 Local Development

### Requirements

- Node.js 18+
- pnpm 10.9.0

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/mindpocket.git
cd mindpocket

# Install dependencies
pnpm install

# Start local PostgreSQL 18 with pgvector
docker compose up -d postgres

# Configure environment
cd apps/web
cp .env.example .env.local
# Edit .env.local with your configuration if needed

# Initialize database
pnpm db:bootstrap

# Start development server
cd ../..
pnpm dev
```

Visit http://127.0.0.1:3000 to start using.

### Local Database

MindPocket expects a standard PostgreSQL `DATABASE_URL`. For local development, the repository includes a Docker Compose service that starts PostgreSQL 18 with `pgvector` enabled.

```bash
docker compose up -d postgres
```

Default local connection:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/mindpocket
```

If `pnpm db:bootstrap` fails, check these first:

- Docker PostgreSQL is running
- Port `5432` is free
- `DATABASE_URL` points to the local container
- The container image includes `pgvector`

### Commands

```bash
# Root
pnpm dev          # Start all apps
pnpm build        # Build all apps
pnpm cli:build    # Build the CLI package
pnpm cli:pack     # Preview the npm package contents for the CLI
pnpm format       # Format code
pnpm check        # Code check

# Web (apps/web)
pnpm dev          # Start Next.js
pnpm db:studio    # Database UI
pnpm db:generate  # Generate migrations
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema directly

# Native (apps/native)
pnpm dev          # Start Expo
pnpm android      # Run on Android
pnpm ios          # Run on iOS
```

## CLI

MindPocket CLI is the official command line client for agents, scripts, and developers who want to interact with a MindPocket server from the terminal.

### Install

```bash
npm install -g mindpocket
```

Or with pnpm:

```bash
pnpm add -g mindpocket
```

### Quick Start

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

Recommended agent flow:

```bash
mindpocket version
mindpocket schema
mindpocket doctor
mindpocket auth login --no-open
```

### Agent Skill

MindPocket also ships a repository-scoped agent skill named `mindpocket`. The skill teaches compatible agents to discover commands with `schema`, verify readiness with `doctor`, configure the server, handle auth safely, and operate bookmark and folder workflows through the published CLI.

Install it with `skills.sh` from this repository:

```bash
npx skills add https://github.com/jihe520/mindpocket --skill mindpocket
```

For local testing from a checkout:

```bash
npx skills add ./skills/mindpocket
```

The skill is procedural guidance layered on top of the npm CLI, so users still need the `mindpocket` command available locally.

Example prompts:

```text
Use the `mindpocket` skill to list my latest 10 bookmarks.
Use the `mindpocket` skill to help me configure my server and log in.
```

## 🛠 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Web** | Next.js 16, Radix UI, Tailwind CSS 4, Better Auth, Drizzle ORM, Vercel AI SDK, Zustand |
| **Mobile** | Expo, React Native, Expo Router |
| **Extension** | WXT, Vite |
| **Tooling** | Turborepo, pnpm, Biome, Ultracite |

## 📱 Supported Platforms

- ✅ Web Application
- ✅ iOS / Android Mobile App
- ✅ Browser Extension (Chrome / Firefox / Edge)

## 🚧 Roadmap

- [ ] More UI settings options
- [ ] Support more bookmark platforms
- [ ] Improve AI Agent experience
- [ ] Optimize RAG

See [todolist](./docs/todo.md) for detailed roadmap.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues, share VIBE Coding experiences, or open pull requests.

**QQ Group**: 682827415 | [Join](https://qm.qq.com/q/EOwlK8AiJM)

## 📄 License

MIT License - see [LICENSE](./LICENSE)

## 🙏 Acknowledgments

Thanks to Claude Code for its significant contribution to this project!
