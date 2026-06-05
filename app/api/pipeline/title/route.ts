import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatJson } from "@/lib/zenmux";
import { buildTitleMessages } from "@/lib/prompts/title";

export async function POST(req: NextRequest) {
  const { articleId } = await req.json();
  if (!articleId) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { category: true },
  });
  if (!article || !article.contentMd) {
    return NextResponse.json(
      { error: "article or content missing" },
      { status: 400 }
    );
  }
  const messages = buildTitleMessages({
    content: article.contentMd,
    currentTitle: article.chosenTitle ?? undefined,
    categoryName: article.category.name,
  });
  const result = await chatJson<{
    titles: Array<{ type: string; title: string }>;
  }>({ messages, temperature: 0.85 });
  return NextResponse.json(result);
}
