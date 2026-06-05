import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderWechatHtml } from "@/lib/wechat-renderer";

export async function POST(req: NextRequest) {
  const { articleId, theme } = await req.json();
  if (!articleId) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { images: { where: { slot: { not: null } } } },
  });
  if (!article || !article.contentMd) {
    return NextResponse.json(
      { error: "article or content missing" },
      { status: 400 }
    );
  }

  // 把 contentMd 里的 <!-- img-slot:xxx --> 替换为 markdown 图片或占位提醒
  const slotToUrl = new Map<string, string>();
  for (const img of article.images) {
    if (img.slot) slotToUrl.set(img.slot, img.url);
  }
  const plan = (article.imagePlanJson as any)?.slots ?? [];
  const slotToPrompt = new Map<string, string>();
  for (const s of plan) {
    if (s?.slot && s?.prompt) slotToPrompt.set(s.slot, s.prompt);
  }

  const processedMd = article.contentMd.replace(
    /<!--\s*img-slot:([^\s>]+)\s*-->/g,
    (_m, slot: string) => {
      const url = slotToUrl.get(slot);
      if (url) return `\n\n![](${url})\n\n`;
      const promptShort = (slotToPrompt.get(slot) ?? "").slice(0, 60);
      return `\n\n> ⚠️ 配图 slot:${slot} 待生成${promptShort ? ` — ${promptShort}` : ""}\n\n`;
    }
  );

  const html = article.styleJson
    ? renderWechatHtml(processedMd, { styleJson: article.styleJson })
    : renderWechatHtml(processedMd, { theme });

  await prisma.article.update({
    where: { id: articleId },
    data: { contentHtml: html },
  });
  return NextResponse.json({ html });
}
