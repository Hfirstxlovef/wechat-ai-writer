import { NextResponse } from "next/server";
import {
  listAvailableModels,
  type Modality,
  type ZenMuxModel,
} from "@/lib/zenmux";

export const maxDuration = 30;

type Endpoint = "openai" | "vertex" | "both";

interface VertexModelEntry {
  id: string;
  display_name?: string;
  owned_by?: string;
  output_modalities: Modality[];
  input_modalities?: Modality[];
  capabilities?: Record<string, boolean>;
}

/**
 * Vertex AI 端点独占模型白名单。
 *
 * ZenMux 的 OpenAI 兼容 /models 接口只返回 output_modalities=["text"] 的模型，
 * 图片 / 视频 / 嵌入模型都走 Vertex AI 兼容端点（:predict），且没有公开列表 API。
 * 这里维护一份白名单跟 OpenAI 接口返回的合并，让前端能选到所有 ~151 个模型。
 *
 * 维护方法：ZenMux 网页 https://zenmux.ai/models 上「图片 / 视频 / 向量嵌入」
 * 三个 tab 里的模型 id，按 modality 抄进来即可。
 */
const KNOWN_VERTEX_MODELS: VertexModelEntry[] = [
  // === 图片（12）===
  {
    id: "baidu/ernie-image-turbo",
    display_name: "Baidu: ERNIE-Image-Turbo",
    owned_by: "baidu",
    output_modalities: ["image"],
  },
  {
    id: "openai/gpt-image-2",
    display_name: "OpenAI: GPT-Image-2",
    owned_by: "openai",
    output_modalities: ["image"],
  },
  {
    id: "openai/gpt-image-1.5",
    display_name: "OpenAI: GPT-Image-1.5",
    owned_by: "openai",
    output_modalities: ["image"],
  },
  {
    id: "qwen/qwen-image-2.0",
    display_name: "Qwen: Qwen-Image-2.0",
    owned_by: "qwen",
    output_modalities: ["image"],
  },
  {
    id: "qwen/qwen-image-2.0-pro",
    display_name: "Qwen: Qwen-Image-2.0-Pro",
    owned_by: "qwen",
    output_modalities: ["image"],
  },
  {
    id: "bytedance/doubao-seedream-5.0-lite",
    display_name: "ByteDance: Doubao-Seedream-5.0-lite",
    owned_by: "bytedance",
    output_modalities: ["image"],
  },
  {
    id: "google/gemini-3.1-flash-image-preview",
    display_name: "Google: Nano Banana 2 (Gemini 3.1 Flash Image Preview)",
    owned_by: "google",
    output_modalities: ["image"],
  },
  {
    id: "google/gemini-3-pro-image-preview",
    display_name: "Google: Nano Banana Pro (Gemini 3 Pro Image Preview)",
    owned_by: "google",
    output_modalities: ["image"],
  },
  {
    id: "google/gemini-2.5-flash-image",
    display_name: "Google: Gemini 2.5 Flash Image (Nano Banana)",
    owned_by: "google",
    output_modalities: ["image"],
  },
  {
    id: "z-ai/glm-image",
    display_name: "Z.AI: GLM-Image",
    owned_by: "z-ai",
    output_modalities: ["image"],
  },
  {
    id: "tencent/hy-image-v3.0",
    display_name: "Tencent: HY-Image-V3.0",
    owned_by: "tencent",
    output_modalities: ["image"],
  },
  {
    id: "klingai/kling-v2",
    display_name: "KlingAI: Kling-v2",
    owned_by: "klingai",
    output_modalities: ["image"],
  },

  // === 视频（8）===
  {
    id: "alibaba/happyhorse-1.0",
    display_name: "Alibaba: HappyHorse 1.0",
    owned_by: "alibaba",
    output_modalities: ["video"],
  },
  {
    id: "skyreels/skyreels-v4",
    display_name: "SkyReels V4",
    owned_by: "skyreels",
    output_modalities: ["video"],
  },
  {
    id: "bytedance/doubao-seedance-2.0",
    display_name: "ByteDance: Doubao-Seedance-2.0",
    owned_by: "bytedance",
    output_modalities: ["video"],
  },
  {
    id: "bytedance/doubao-seedance-1.5-pro",
    display_name: "ByteDance: Doubao-Seedance-1.5-pro",
    owned_by: "bytedance",
    output_modalities: ["video"],
  },
  {
    id: "google/veo-3.1-generate-001",
    display_name: "Google: Veo 3.1",
    owned_by: "google",
    output_modalities: ["video"],
  },
  {
    id: "google/veo-3.1-fast-generate-001",
    display_name: "Google: Veo 3.1 Fast",
    owned_by: "google",
    output_modalities: ["video"],
  },
  {
    id: "google/veo-3.1-lite-generate-001",
    display_name: "Google: Veo 3.1 Lite",
    owned_by: "google",
    output_modalities: ["video"],
  },
  {
    id: "sapiens-ai/agnes-video-v1.2",
    display_name: "Sapiens AI: Agnes-Video-V1.2",
    owned_by: "sapiens-ai",
    output_modalities: ["video"],
  },

  // === 向量嵌入（1）===
  {
    id: "openai/text-embedding-3-small",
    display_name: "OpenAI: Text Embedding 3 Small",
    owned_by: "openai",
    output_modalities: ["embedding"],
  },
];

export interface MergedModel extends ZenMuxModel {
  endpoint: Endpoint;
}

export async function GET() {
  try {
    const openaiModels = await listAvailableModels();

    const byId = new Map<string, MergedModel>();
    for (const m of openaiModels) {
      byId.set(m.id, { ...m, endpoint: "openai" });
    }
    for (const m of KNOWN_VERTEX_MODELS) {
      const exist = byId.get(m.id);
      if (exist) {
        byId.set(m.id, { ...exist, endpoint: "both" });
      } else {
        byId.set(m.id, { ...m, endpoint: "vertex" });
      }
    }

    const models = Array.from(byId.values());
    return NextResponse.json({ models });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
