import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatJson, getStyleModel } from "@/lib/zenmux";
import { buildStyleMessages } from "@/lib/prompts/style";
import {
  DEFAULT_COMPONENTS,
  DEFAULT_THEME,
  styleJsonSchema,
  StyleJson,
} from "@/lib/style-schema";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { articleId, userDescription } = await req.json();
  if (!articleId) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article || !article.contentMd) {
    return NextResponse.json(
      { error: "article or content missing" },
      { status: 400 }
    );
  }

  const outline = (article.outlineJson as any) ?? null;
  const messages = buildStyleMessages({
    chosenTitle: article.chosenTitle ?? article.idea.slice(0, 30),
    idea: article.idea,
    contentMd: article.contentMd,
    outline,
    userDescription,
  });

  // 1) 调模型生成 styleJson
  const model = await getStyleModel();
  let raw: unknown;
  try {
    raw = await chatJson({ model, messages, temperature: 0.7 });
  } catch (e: any) {
    return NextResponse.json(
      { error: `style model failed: ${e.message}` },
      { status: 502 }
    );
  }

  // 2) 用 zod 验证 + 容错；任何字段崩了 .catch 兜底
  const parsed = styleJsonSchema.safeParse(raw);
  const warnings: string[] = [];
  let styleJson: StyleJson = parsed.success ? parsed.data : {};
  if (!parsed.success) {
    warnings.push("model output failed schema validation; using empty styleJson");
  }

  // 检查 theme / components 是否缺关键字段并写 warning
  const theme = styleJson.theme ?? {};
  for (const k of Object.keys(DEFAULT_THEME) as (keyof typeof DEFAULT_THEME)[]) {
    if (!(theme as any)[k]) warnings.push(`theme.${k} missing, will use default`);
  }
  const components = styleJson.components ?? {};
  for (const k of Object.keys(DEFAULT_COMPONENTS) as (keyof typeof DEFAULT_COMPONENTS)[]) {
    if (!(components as any)[k]) warnings.push(`components.${k} missing, will use default`);
  }

  // hero 生图已迁出，由「配图」步骤的 image-plan 流程负责。
  // 这里保留 hero 字段（可能含模型出的 prompt），但绝不再调 generateImage。
  styleJson = {
    ...styleJson,
    meta: {
      ...(styleJson.meta ?? {}),
      modelUsed: model,
      generatedAt: new Date().toISOString(),
      _warnings: warnings.length > 0 ? warnings : undefined,
    },
  };

  return NextResponse.json({ styleJson });
}
