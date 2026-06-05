# ZenMux `/models` 接口反馈 / Feedback on `/models` Endpoint

> 提交方 / Submitted by: ZenMux 集成开发者
> 日期 / Date: 2026-05-27

---

## 中文版

### 问题摘要

通过 OpenAI 兼容端点 `GET https://zenmux.ai/api/v1/models` 调用 `client.models.list()`，**只返回 127 个模型，且全部是 `output_modalities=["text"]` 的纯文本模型**。

但 ZenMux 官网 https://zenmux.ai/models 上实际有约 151 个模型，缺失的约 24 个模型包括：

- **图片生成模型**（约 12 个）
  - `google/gemini-3-pro-image-preview`（Nano Banana Pro）
  - `google/gemini-3.1-flash-image-preview`（Nano Banana 2）
  - `google/gemini-2.5-flash-image`
  - `openai/gpt-image-2`、`openai/gpt-image-1.5`
  - `bytedance/doubao-seedream-5.0-lite`
  - `qwen/qwen-image-2.0`、`qwen/qwen-image-2.0-pro`
  - `baidu/ernie-image-turbo`
  - `z-ai/glm-image`
  - `tencent/hy-image-v3.0`
  - `klingai/kling-v2`
- **视频生成模型**（约 8 个）
  - `google/veo-3.1-generate-001`、`google/veo-3.1-fast-generate-001`、`google/veo-3.1-lite-generate-001`
  - `bytedance/doubao-seedance-2.0`、`bytedance/doubao-seedance-1.5-pro`
  - `alibaba/happyhorse-1.0`
  - `skyreels/skyreels-v4`
  - `sapiens-ai/agnes-video-v1.2`
- **向量嵌入模型**（至少 1 个）
  - `openai/text-embedding-3-small`

这些模型在 OpenAI 兼容的 `/models` 接口里完全不返回。

### 根因推断

图片、视频、嵌入类模型走的是 **Vertex AI 兼容端点**（`/api/vertex-ai/v1/models/{model}:predict`），跟 OpenAI 兼容端点是两套独立体系，而 Vertex AI 兼容端点**没有公开的模型列表 API**。

### 对开发者的影响

目前不得不在代码里**手动维护一份白名单**，把官网上能看到的图片/视频/嵌入模型 id 一个个抄进来，跟 OpenAI 接口返回的结果做合并：

```ts
// 我们项目里的解决方案（不应该是开发者的责任）
const KNOWN_VERTEX_MODELS = [
  { id: "google/gemini-3-pro-image-preview", output_modalities: ["image"], ... },
  { id: "google/veo-3.1-generate-001",       output_modalities: ["video"], ... },
  // ... 共 21 条手抄记录
];

const merged = [...openaiModels, ...KNOWN_VERTEX_MODELS]; // 合并后才有完整列表
```

代价：

1. ZenMux 上线新模型后，开发者无法自动感知，需定期手工同步，否则用户用不到
2. `display_name`、`owned_by`、`modality` 等元数据全靠手抄，容易抄错
3. 接口设计不一致 —— OpenAI 兼容端点宣称兼容，但模型列表不完整，违反"最小惊讶"原则
4. 每个集成方都重复造一份这样的白名单，整个生态浪费

### 建议（按优先级排序）

1. **最优方案**：让 OpenAI 兼容的 `/models` 接口返回**全部模型**，通过 `output_modalities` 字段区分（`text` / `image` / `video` / `embedding`）。OpenAI 官方的 `/models` 也是混合返回 GPT、DALL-E、embedding 模型，这是 OpenAI 兼容协议的常见做法。
2. **次优方案**：提供独立的 Vertex AI 端点列表接口 `GET /api/vertex-ai/v1/models`，让开发者能够编程方式拉到图片/视频/嵌入模型。
3. **兜底方案**：在文档显眼位置注明 "OpenAI 兼容 `/models` 只列出文本模型，图片/视频/嵌入模型请参考 XXX 接口/清单"，并由官方维护一份 JSON 清单 URL（如 `https://zenmux.ai/api/v1/models/all.json`），避免每个集成方各自维护白名单。

---

## English Version

### Summary

Calling `GET https://zenmux.ai/api/v1/models` (OpenAI-compatible endpoint) via `client.models.list()` **only returns 127 models, all with `output_modalities=["text"]`** — purely text-generation models.

However, the ZenMux website at https://zenmux.ai/models lists ~151 models in total. The ~24 missing models include:

- **Image generation models** (~12)
  - `google/gemini-3-pro-image-preview` (Nano Banana Pro)
  - `google/gemini-3.1-flash-image-preview` (Nano Banana 2)
  - `google/gemini-2.5-flash-image`
  - `openai/gpt-image-2`, `openai/gpt-image-1.5`
  - `bytedance/doubao-seedream-5.0-lite`
  - `qwen/qwen-image-2.0`, `qwen/qwen-image-2.0-pro`
  - `baidu/ernie-image-turbo`
  - `z-ai/glm-image`
  - `tencent/hy-image-v3.0`
  - `klingai/kling-v2`
- **Video generation models** (~8)
  - `google/veo-3.1-generate-001`, `google/veo-3.1-fast-generate-001`, `google/veo-3.1-lite-generate-001`
  - `bytedance/doubao-seedance-2.0`, `bytedance/doubao-seedance-1.5-pro`
  - `alibaba/happyhorse-1.0`
  - `skyreels/skyreels-v4`
  - `sapiens-ai/agnes-video-v1.2`
- **Embedding models** (at least 1)
  - `openai/text-embedding-3-small`

None of these are returned by the OpenAI-compatible `/models` endpoint.

### Root Cause (Inferred)

Image, video, and embedding models are served through the **Vertex AI-compatible endpoint** (`/api/vertex-ai/v1/models/{model}:predict`), which is a separate code path from the OpenAI-compatible endpoint. The Vertex AI-compatible endpoint has **no public model-listing API**.

### Impact on Developers

We currently have to **maintain a hardcoded whitelist** in our codebase, manually copying every image/video/embedding model ID from the ZenMux website and merging it with the OpenAI endpoint response:

```ts
// Our current workaround (this shouldn't be the developer's responsibility)
const KNOWN_VERTEX_MODELS = [
  { id: "google/gemini-3-pro-image-preview", output_modalities: ["image"], ... },
  { id: "google/veo-3.1-generate-001",       output_modalities: ["video"], ... },
  // ... 21 hand-copied entries in total
];

const merged = [...openaiModels, ...KNOWN_VERTEX_MODELS]; // only now is the list complete
```

Costs:

1. When ZenMux launches new models, integrators have no way to detect them programmatically — manual sync is required, otherwise users can't access them.
2. Metadata such as `display_name`, `owned_by`, and `modality` is hand-copied and error-prone.
3. The endpoint contract is inconsistent — it claims OpenAI compatibility but the model list is incomplete, violating the principle of least surprise.
4. Every ZenMux integrator ends up rebuilding the same whitelist, wasting effort across the ecosystem.

### Recommendations (in order of preference)

1. **Best**: Have the OpenAI-compatible `/models` endpoint return **all models**, differentiated by the `output_modalities` field (`text` / `image` / `video` / `embedding`). OpenAI's own `/models` endpoint mixes GPT, DALL-E, and embedding models in a single response — this is the standard OpenAI-compatible behavior.
2. **Good**: Provide a separate listing endpoint at `GET /api/vertex-ai/v1/models` so developers can programmatically fetch image/video/embedding models.
3. **Minimum**: At least document this clearly — note prominently that "the OpenAI-compatible `/models` endpoint only lists text models; for image/video/embedding models, see XXX" — and host an official JSON manifest (e.g. `https://zenmux.ai/api/v1/models/all.json`) so integrators don't each maintain their own whitelist.

---

## Reference: Affected Code Path

Project: 微信公众号 AI 推文系统 (Next.js + ZenMux)

- `lib/zenmux.ts` — `listAvailableModels()` wraps `client.models.list()`
- `app/api/zenmux/models/route.ts` — merges `KNOWN_VERTEX_MODELS` whitelist (21 hand-copied entries) with the OpenAI endpoint response
