import OpenAI from "openai";
import { getApiKey, getModel, getSetting, SETTING_KEYS } from "./settings";

async function getClient(): Promise<OpenAI> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(
      "ZenMux API key not configured. 请到「设置」页面填入 API Key（或在 .env 设置 ZENMUX_API_KEY）。"
    );
  }
  return new OpenAI({
    baseURL: process.env.ZENMUX_BASE_URL || "https://zenmux.ai/api/v1",
    apiKey,
  });
}

export async function getTextModel() {
  return getModel(SETTING_KEYS.MODEL_TEXT);
}
export async function getStyleModel() {
  return (await getSetting(SETTING_KEYS.MODEL_STYLE)) || (await getTextModel());
}
export async function getImageModel() {
  return getModel(SETTING_KEYS.MODEL_IMAGE);
}
export async function getEmbeddingModel() {
  return getModel(SETTING_KEYS.MODEL_EMBEDDING);
}

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export async function chat(opts: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const client = await getClient();
  const model = opts.model ?? (await getTextModel());
  const res = await client.chat.completions.create({
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function* chatStream(opts: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): AsyncGenerator<string> {
  const client = await getClient();
  const model = opts.model ?? (await getTextModel());
  const stream = await client.chat.completions.create({
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens,
    stream: true,
  });
  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta?.content;
    if (piece) yield piece;
  }
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed;
}

export async function chatJson<T = unknown>(opts: {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
}): Promise<T> {
  const client = await getClient();
  const model = opts.model ?? (await getTextModel());
  const res = await client.chat.completions.create({
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.5,
    response_format: { type: "json_object" },
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(raw) as T;
  } catch {
    return JSON.parse(extractJson(raw)) as T;
  }
}

export async function embed(input: string | string[]): Promise<number[][]> {
  const client = await getClient();
  const model = await getEmbeddingModel();
  const inputs = Array.isArray(input) ? input : [input];
  const res = await client.embeddings.create({ model, input: inputs });
  return res.data.map((d) => d.embedding);
}

export async function generateImage(opts: {
  prompt: string;
  size?: string;
  quality?: "low" | "medium" | "high" | "auto";
}): Promise<{ b64?: string; url?: string; model: string }> {
  // ZenMux 的图像生成走 Vertex AI 兼容端点（不是 OpenAI），
  // 端点：POST {chatBase}/.../vertex-ai/v1/models/{model}:predict
  // 返回：{ predictions: [{ bytesBase64Encoded: "..." }] }
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error(
      "ZenMux API key not configured. 请到「设置」页面填入 API Key（或在 .env 设置 ZENMUX_API_KEY）。"
    );
  }
  const model = await getImageModel();
  const chatBase = process.env.ZENMUX_BASE_URL || "https://zenmux.ai/api/v1";
  // 推导 vertex base：把 "/api/v1" 替换成 "/api/vertex-ai/v1"
  const vertexBase = chatBase.includes("/api/v1")
    ? chatBase.replace("/api/v1", "/api/vertex-ai/v1")
    : `${chatBase.replace(/\/$/, "")}/vertex-ai/v1`;

  const url = `${vertexBase}/models/${model}:predict`;

  const body: Record<string, any> = {
    instances: [{ prompt: opts.prompt }],
    parameters: { sampleCount: 1 },
  };
  // 把 size 映射到 aspectRatio（vertex 风格）
  if (opts.size) {
    const map: Record<string, string> = {
      "1024x1024": "1:1",
      "1792x1024": "16:9",
      "1024x1792": "9:16",
    };
    const ar = map[opts.size];
    if (ar) body.parameters.aspectRatio = ar;
  }

  // ZenMux 图像生成偶发 socket close / 5xx，做最多 3 次指数退避
  // 4xx 直接抛（多半是 prompt 内容/参数问题，重试无意义）
  const attempts = 3;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const msg = `image generation failed: ${res.status} ${text.slice(0, 200)}`;
        if (res.status >= 500 && i < attempts - 1) {
          lastErr = new Error(msg);
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(3, i)));
          continue;
        }
        throw new Error(msg);
      }
      const data: any = await res.json();
      const pred = data?.predictions?.[0];
      const b64 = pred?.bytesBase64Encoded as string | undefined;
      const url2 = (pred?.url || pred?.imageUri) as string | undefined;
      if (!b64 && !url2) {
        throw new Error(
          `image generation returned no data: ${JSON.stringify(data).slice(0, 200)}`
        );
      }
      return { b64, url: url2, model };
    } catch (e: any) {
      lastErr = e;
      // 网络类错误（socket close / fetch failed / ECONNRESET 等）才重试
      const msg = String(e?.message ?? e);
      const cause = String(e?.cause?.code ?? e?.cause?.message ?? "");
      const isNetworkError =
        /fetch failed|socket|ECONNRESET|ETIMEDOUT|EAI_AGAIN|other side closed/i.test(
          `${msg} ${cause}`
        );
      if (!isNetworkError || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(3, i)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export type Modality = "text" | "image" | "video" | "audio" | "file" | "embedding";

export interface ZenMuxModel {
  id: string;
  display_name?: string;
  created?: number;
  owned_by?: string;
  input_modalities?: Modality[];
  output_modalities?: Modality[];
  capabilities?: Record<string, boolean>;
  context_length?: number;
}

/** 调 ZenMux /models 接口（OpenAI 兼容） */
export async function listAvailableModels(): Promise<ZenMuxModel[]> {
  const client = await getClient();
  const res = await client.models.list();
  return res.data.map((m: any) => ({
    id: m.id,
    display_name: m.display_name,
    created: m.created,
    owned_by: m.owned_by,
    input_modalities: m.input_modalities,
    output_modalities: m.output_modalities,
    capabilities: m.capabilities,
    context_length: m.context_length,
  }));
}
