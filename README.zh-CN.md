# 红岸 AI · 微信公众号推文写作系统

> 🌐 [English README](README.md) · **中文**

一个面向个人订阅号运营者的 **流水线式 AI 推文工具**：把"选题 → 大纲 → 正文 → 配图 → 排版 → 复制到公众号后台"全流程做成可介入、可重跑的步骤，每一步都能由 AI 自动完成或人工修改。
<img width="3016" height="1716" alt="image" src="https://github.com/user-attachments/assets/ef88b756-a4c4-4f3f-88e4-ba2a568aba98" />

> **定位**：单人本地工具。不是 SaaS，不需要部署到云。

## 截图

> 第一次启动后，在 `/categories` 创建分类 → `/articles/new` 新建文章 → 沿着步骤条往下走即可。

## 核心特性

- **七步流水线**：选题 / 选标题 / 大纲 / 正文 / 配图 / 美化 / 渲染，每一步独立保存，可随时回到任意步重做
- **多模型聚合**：所有 AI 调用走 [ZenMux](https://zenmux.ai)，Claude 写长文、GPT 做标题 A/B、豆包/Gemini/DALL-E 做配图，按任务最优分配
- **微信兼容 HTML 渲染**：内置三套主题（微信绿 / 暖色 / 极简），全 inline 样式，无 class/`<style>`/外链 SVG，粘到公众号后台样式不丢
- **富文本一键复制**：剪贴板同时写入 `text/html` + `text/plain`，公众号编辑器自动渲染样式
- **图片打包下载**：一键导出本文用到的所有图片（AI 配图 + 正文粘贴的截图）为 zip，命名包含序号/角色/slot，附 README 索引
- **本地图床**：图片直接存到 `public/uploads/`，无外部依赖
- **风格库**：按分类维护提示词与示例文章，让 AI 学你的风格（few-shot，不做 fine-tune）

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 + 后端 | Next.js 14 (App Router) |
| 数据库 | PostgreSQL + Prisma |
| AI 网关 | ZenMux（OpenAI 兼容 API） |
| UI | Tailwind CSS + Radix UI + lucide-react |
| Markdown 编辑器 | `@uiw/react-md-editor` |
| 图床 | 本地 `public/uploads/` |

## 快速开始

### 1. 准备环境

- Node.js ≥ 20
- PostgreSQL ≥ 14（本机或远程）
- [ZenMux](https://zenmux.ai) 账号 + API Key

> 🎓 **学生福利**：如果你是学生，[ZenMux 校园大使计划](https://zenmux.ai/invite/3RBK2L) 值得去看一眼——免费额度足够你把整套系统跑通，验证想法不用花钱。👉 搜索「ZenMux」或访问官网，申请校园大使计划。

### 2. 安装

```bash
git clone https://github.com/Hfirstxlovef/wechat-ai-writer.git
cd wechat-ai-writer
npm install
cp .env.example .env
# 编辑 .env 填入 DATABASE_URL 和 ZENMUX_API_KEY
```

### 3. 初始化数据库

```bash
npm run db:push     # 同步 schema
npm run db:seed     # 种子数据（默认分类）
```

### 4. 启动

```bash
npm run dev
# 打开 http://localhost:13819
```

## 关于微信公众号同步

**个人订阅号无法走 API 自动同步草稿箱** —— 微信不向个人主体开放 `draft/add`、`media/uploadimg` 等接口。秀米这类工具能"一键同步"是因为它们对接的是已认证的服务号 / 订阅号。

所以本系统的发布路径是：
<img width="2544" height="1662" alt="image" src="https://github.com/user-attachments/assets/be32baff-3e74-4b2d-8990-cca36f2352f6" />

1. 在系统里完成整套流水线，最后一步生成微信专属 HTML
2. 点"复制 HTML"按钮（剪贴板会同时写 `text/html`）
3. 到公众号后台「图文消息」编辑器，`Ctrl+V` 粘贴 —— 样式自动渲染
4. 点"下载图片 zip"拿到所有图片
5. 在公众号编辑器里逐张重新上传图片（微信不抓外链图）
<img width="2542" height="1484" alt="image" src="https://github.com/user-attachments/assets/cc6ca146-e216-46e1-af4b-fcc431d37c1c" />
<img width="2538" height="1644" alt="image" src="https://github.com/user-attachments/assets/01af7cab-571a-4f73-a1a0-c1b184d00d70" />

如果你之后注册了认证的服务号 / 订阅号，可以扩展接入官方素材 API 实现真正的一键同步。

## 项目结构

```
app/
  api/              # Next.js API 路由（pipeline 各步骤、文章 CRUD、图片导出 zip 等）
  articles/         # 文章列表、详情页（PipelineEditor）
  categories/       # 分类管理
  settings/         # 风格、模型配置
components/
  PipelineEditor.tsx  # 主编辑器，七步流水线 UI
  MarkdownEditor.tsx  # 正文编辑器（支持粘贴/拖拽图片上传）
  MobilePreview.tsx   # 手机预览
lib/
  zenmux.ts           # ZenMux API 封装
  storage.ts          # 本地图床
  wechat-renderer.ts  # Markdown → 微信兼容 HTML
  style-components/   # 各种风格化组件
  prompts/            # 各步骤提示词
prisma/
  schema.prisma       # Article / Category / Image / StyleProfile 等模型
```
<img width="2560" height="1686" alt="image" src="https://github.com/user-attachments/assets/20d676c1-0aec-4ad1-a4e1-502a2690cd7a" />

## 📣 分享

觉得有用？欢迎转发到 X（推特）。可直接复制的文案：

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

## License

MIT
