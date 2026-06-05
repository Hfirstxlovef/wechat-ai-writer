# wechat-ai-writer · 红岸 AI

> 🌐 **English** · [中文文档](README.zh-CN.md)

An AI-assisted writing studio for **WeChat Official Account** ("公众号") articles. It turns a one-line idea into a finished, copy-paste-ready WeChat post through a multi-stage AI pipeline — topic → title → outline → style → draft → image plan → images → rendered HTML.

Built as a **single-user, self-hosted** tool: everything (database, image storage, AI calls) runs on your own machine. All models are reached through [ZenMux](https://zenmux.ai), a multi-model aggregation API, so a single API key drives text, image, and embedding models alike.

> The UI is bilingual (中文 / English) and ships in Chinese by default.

---

## Table of contents

- [Why this exists](#why-this-exists)
- [Features](#features)
- [The pipeline](#the-pipeline)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the app](#running-the-app)
- [Configuration](#configuration)
- [The WeChat publishing workflow](#the-wechat-publishing-workflow)
- [Notes & caveats](#notes--caveats)

---

## Why this exists

WeChat's **personal** subscription accounts have **no Material/Draft API access** — you cannot programmatically push a finished article into the account. The only reliable path is to produce clean, inline-styled HTML and **paste it into the WeChat editor**.

This project leans into that constraint: it focuses on getting the *content and styling* right with AI, then renders a self-contained HTML block you copy straight into the official editor. No publishing automation, no account credentials, no cloud lock-in.

## Features

- **End-to-end AI pipeline** — go from a raw idea to a styled article in discrete, reviewable steps. Every stage is editable; nothing is a black box.
- **Streaming drafts** — the long-form body is generated with token streaming so you watch it write.
- **Per-domain "categories"** — each category carries its own system prompt and tone notes, so a tech column and a travel diary sound different.
- **Style reference library (RAG)** — paste in reference articles; they're embedded with `pgvector` and retrieved by similarity to steer the model toward a target voice.
- **AI cover & inline images** — plan image slots, then generate them via ZenMux's image models. Download all of an article's images as a ZIP.
- **WeChat-ready rendering** — converts Markdown into inline-styled HTML using a small library of reusable visual components (callout boxes, dividers, opening/ending cards, quotes, headings).
- **Local image hosting** — uploaded and generated images are served from `public/uploads/`; no third-party image CDN required.
- **Configurable models** — pick which ZenMux model handles text, styling, images, and embeddings from the in-app Settings page (or via `.env`).
- **Bilingual UI** — switch between Chinese and English.

## The pipeline

Each article moves through these stages. They map 1:1 to routes under `app/api/pipeline/` and prompt builders under `lib/prompts/`.

```mermaid
flowchart LR
    idea([Your idea]) --> topic
    topic[Topic 选题] --> title[Title 标题]
    title --> outline[Outline 大纲]
    outline --> style[Style 风格]
    style --> draft[Draft 正文]
    draft --> implan[Image plan 配图规划]
    implan --> image[Images 配图]
    image --> render[Render 渲染]
    render --> html([WeChat HTML\ncopy → paste])
```

| Stage | What it does |
| --- | --- |
| **Topic** (`/topic`) | Expands a one-line idea into a structured topic/angle. |
| **Title** (`/title`) | Proposes candidate headlines to choose from. |
| **Outline** (`/outline`) | Drafts a section-by-section outline. |
| **Style** (`/style`) | Designs the article's visual/voice style; can pull from the style library. `/style-preview` renders a live preview. |
| **Draft** (`/draft`) | Writes the full Markdown body (streamed). |
| **Image plan** (`/image-plan`) | Decides where images go and what each should depict. |
| **Image** (`/image`) | Generates each planned image. |
| **Render** (`/render`) | Compiles everything into inline-styled WeChat HTML. |

## Tech stack

- **Framework** — [Next.js 14](https://nextjs.org) (App Router) + React 18 + TypeScript
- **Database** — PostgreSQL with the [`pgvector`](https://github.com/pgvector/pgvector) extension, via [Prisma](https://www.prisma.io)
- **AI** — [ZenMux](https://zenmux.ai) multi-model aggregation (OpenAI-compatible API). Text/embeddings use the OpenAI-compatible endpoint; image generation uses ZenMux's Vertex-AI-compatible endpoint.
- **UI** — Tailwind CSS + Radix UI primitives, `@uiw/react-md-editor` for Markdown editing
- **Validation** — Zod

### Data model (Prisma)

| Model | Purpose |
| --- | --- |
| `Category` | A content domain with its own system prompt + tone notes. |
| `Article` | One post and every intermediate artifact (idea, topic, title, outline, content, style, image plan, cover). |
| `StyleRef` | A reference article with a `vector(1536)` embedding for style retrieval. |
| `Image` | A generated/uploaded image tied to an article. |
| `Setting` | Key/value app settings (API key, model choices, UI language). |

## Project structure

```
app/
  api/
    pipeline/        # topic, title, outline, style, draft, image-plan, image, render
    articles/        # CRUD + images-zip export
    categories/      # CRUD
    style-refs/      # style library CRUD
    settings/        # app settings
    upload/          # local image upload
    zenmux/models/   # list available models
  editor/[articleId] # the article editor
  categories/        # category management
  style-library/     # style reference management
  settings/          # settings page
components/           # AppShell, MarkdownEditor, MobilePreview, PipelineEditor, ...
lib/
  prompts/           # per-stage prompt builders
  style-components/   # reusable WeChat HTML blocks (callout, divider, cards, ...)
  i18n/              # zh/en dictionary
  zenmux.ts          # ZenMux client: chat, chatJson, embed, generateImage, listModels
  settings.ts        # settings + model resolution
  wechat-renderer.ts # Markdown → inline-styled WeChat HTML
  storage.ts         # local image storage
prisma/              # schema + seed
scripts/             # test-zenmux, test-style-render
start.sh / stop.sh   # one-command run/stop (macOS + Homebrew Postgres)
```

## Prerequisites

- **Node.js 18+** and npm
- **PostgreSQL 16** with the **`pgvector`** extension installed
- A **ZenMux API key** (`sk-ai-v1-...`) from [zenmux.ai](https://zenmux.ai)

> 🎓 **Student perk** — if you're a student, [ZenMux's Campus Ambassador program](https://zenmux.ai/invite/3RBK2L) is worth a look: the free credits are enough to run this whole system end-to-end and validate your ideas without spending a cent. 👉 Search "ZenMux" or visit the site to apply for the Campus Ambassador program.

> `start.sh` assumes a Homebrew-managed `postgresql@16` on macOS. On other setups, start Postgres yourself and use the npm scripts below.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#    then edit .env — see Configuration below

# 3. Initialize the database (creates tables; enables the vector extension)
npm run db:push
npm run db:generate

# 4. (optional) Seed starter data
npm run db:seed
```

Make sure the database named in `DATABASE_URL` exists and that `pgvector` is available to it (`CREATE EXTENSION IF NOT EXISTS vector;`). Prisma's `postgresqlExtensions` preview feature manages the `vector` extension declared in `prisma/schema.prisma`.

## Running the app

The app runs on **port 13819**.

### One command (macOS + Homebrew Postgres)

```bash
./start.sh          # production (auto-builds if needed)
./start.sh dev      # development with hot reload
./start.sh build    # force a rebuild, then start
./stop.sh           # stop the app
```

`start.sh` ensures `postgresql@16` is running, guards against double-starts/port conflicts, and writes logs to `.run/app.log`.

### Plain npm

```bash
npm run dev         # dev server  → http://localhost:13819
npm run build       # production build
npm run start       # production server
```

### Useful database scripts

```bash
npm run db:studio   # open Prisma Studio
npm run db:migrate  # create/apply a dev migration
```

## Configuration

Copy `.env.example` to `.env` and fill it in:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/wechat_ai_writer"

ZENMUX_API_KEY="sk-ai-v1-xxxxx"
ZENMUX_BASE_URL="https://zenmux.ai/api/v1"
```

The **API key** and **model choices** can also be set at runtime from the in-app **Settings** page (stored in the `Setting` table). A key saved in the app takes precedence over the `.env` value.

Default models (overridable in Settings):

| Task | Default model |
| --- | --- |
| Text | `anthropic/claude-sonnet-4.6` |
| Image | `openai/gpt-image-2` |
| Embedding | `openai/text-embedding-3-small` |

> ⚠️ `.env` and `.claude/settings.local.json` are git-ignored — **never commit your real API key**.

## The WeChat publishing workflow

1. Create a **category** (domain) and give it a system prompt + tone.
2. (Optional) Add **style references** to the library for that category.
3. Start an article from an idea and walk it through the pipeline, editing at each step.
4. On **Render**, copy the produced HTML.
5. Paste it into the **WeChat Official Account editor**, attach the cover image, and publish from there.

Because personal subscription accounts lack Material/Draft API access, this last copy-paste step is manual by design.

## Notes & caveats

- **Single-user / local-first.** There's no auth, multi-tenancy, or hosted deployment story — it's meant to run on your own machine.
- **Image generation** goes through ZenMux's Vertex-AI-compatible endpoint with retry/backoff for transient network errors.
- **Model listing** — ZenMux's OpenAI-compatible `/models` endpoint only returns text models, so the app merges in a hand-maintained whitelist of image/embedding models (see `zenmux-feedback.md` for the full write-up).
- **Uploads** (`public/uploads/`) and runtime files (`.run/`) are git-ignored; they stay on your machine.

## 📣 Spread the word

Found this useful? A post on X (Twitter) helps a lot — ready-to-paste copy:

**English**

```
🚀 WeChat AI Writer (红岸 AI) — an open-source, self-hosted AI studio that turns a one-line idea into a copy-paste-ready WeChat Official Account post.

🧠 Multi-model via ZenMux (Claude / GPT / Gemini / DALL·E)
🎨 Inline-styled HTML that survives the paste into the WeChat editor
📚 Style library (RAG) learns your voice
🎓 Student? ZenMux's Campus Ambassador free credits cover the whole thing.

⭐ github.com/Hfirstxlovef/wechat-ai-writer
👉 https://zenmux.ai/invite/3RBK2L
```

**中文**

```
🚀 红岸 AI · 微信公众号推文写作系统 —— 开源、自托管的 AI 写作工作室，把一句话灵感变成可直接粘贴到公众号后台的成品推文。

🧠 多模型聚合走 ZenMux（Claude / GPT / Gemini / DALL·E）
🎨 全 inline 样式 HTML，粘到公众号后台样式不丢
📚 风格库（RAG）学习你的文风
🎓 学生党：ZenMux 校园大使计划的免费额度，足够把整套系统跑通，验证想法不花钱。

⭐ github.com/Hfirstxlovef/wechat-ai-writer
👉 https://zenmux.ai/invite/3RBK2L
```
