import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { chatJson, getTextModel } from "@/lib/zenmux";
import {
  buildImagePlanMessages,
  type ImagePlanOutput,
  type PlannedSlot,
} from "@/lib/prompts/image-plan";

export const maxDuration = 60;

const slotSchema = z.object({
  slot: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slot 必须 kebab-case"),
  role: z.enum(["cover", "inline"]),
  prompt: z.string().min(10),
  contextHint: z.string().min(1).max(80),
  insertAfter: z.string().min(1),
});

const planSchema = z.object({
  slots: z.array(slotSchema).min(1).max(8),
});

const SLOT_COMMENT_RE = /<!--\s*img-slot:[^>]+-->/g;

/** 在 markdown 标题（# 开头那行）后插入 slot 注释 */
function insertAfterHeading(
  md: string,
  needle: string,
  comment: string
): { md: string; matched: boolean } {
  const lines = md.split("\n");
  const lower = needle.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i]) && lines[i].toLowerCase().includes(lower)) {
      lines.splice(i + 1, 0, "", comment, "");
      return { md: lines.join("\n"), matched: true };
    }
  }
  return { md, matched: false };
}

export async function POST(req: NextRequest) {
  const { articleId } = await req.json();
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
  const messages = buildImagePlanMessages({
    chosenTitle: article.chosenTitle ?? article.idea.slice(0, 30),
    idea: article.idea,
    contentMd: article.contentMd,
    outline,
  });

  const model = await getTextModel();
  let raw: unknown;
  try {
    raw = await chatJson({ model, messages, temperature: 0.6 });
  } catch (e: any) {
    return NextResponse.json(
      { error: `image-plan model failed: ${e.message}` },
      { status: 502 }
    );
  }

  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "model output failed schema validation",
        detail: parsed.error.issues.slice(0, 5),
        raw,
      },
      { status: 422 }
    );
  }
  const plan: ImagePlanOutput = parsed.data;

  // 去重 slot id
  const seen = new Set<string>();
  const slots: PlannedSlot[] = [];
  for (const s of plan.slots) {
    if (seen.has(s.slot)) continue;
    seen.add(s.slot);
    slots.push(s);
  }

  // 改写 contentMd：先去除旧 slot 注释，再按 plan 重新插入
  let md = article.contentMd.replace(SLOT_COMMENT_RE, "").replace(/\n{3,}/g, "\n\n");

  const warnings: string[] = [];
  const finalSlots: PlannedSlot[] = [];
  for (const s of slots) {
    const comment = `<!-- img-slot:${s.slot} -->`;
    if (s.role === "cover" || s.insertAfter === "__top__") {
      md = `${comment}\n\n${md.trimStart()}`;
      finalSlots.push({ ...s, insertAfter: "__top__" });
      continue;
    }
    const res = insertAfterHeading(md, s.insertAfter, comment);
    if (res.matched) {
      md = res.md;
      finalSlots.push(s);
    } else {
      warnings.push(
        `slot "${s.slot}": insertAfter "${s.insertAfter}" 在正文中未匹配到标题，已跳过`
      );
    }
  }

  const imagePlanJson = {
    slots: finalSlots,
    meta: {
      modelUsed: model,
      generatedAt: new Date().toISOString(),
      _warnings: warnings.length > 0 ? warnings : undefined,
    },
  };

  // 清掉旧 plan 对应的 Image 记录（slot 不为 null 的；用户手动加的没 slot 的保留）
  await prisma.image.deleteMany({
    where: { articleId, slot: { not: null } },
  });
  // article.coverImage 也清掉（cover 会通过新的生图流程重新写入）
  await prisma.article.update({
    where: { id: articleId },
    data: {
      contentMd: md,
      imagePlanJson: imagePlanJson as any,
      coverImage: null,
    },
  });

  return NextResponse.json({
    contentMd: md,
    imagePlanJson,
    warnings,
  });
}
