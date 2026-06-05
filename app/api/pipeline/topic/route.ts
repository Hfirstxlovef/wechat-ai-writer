import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatJson } from "@/lib/zenmux";
import { buildTopicMessages } from "@/lib/prompts/topic";
import { retrieveSimilarRefs, refExcerpt } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
  const { articleId } = await req.json();
  if (!articleId) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { category: true },
  });
  if (!article) {
    return NextResponse.json({ error: "article not found" }, { status: 404 });
  }

  let styleRefs: { title: string; excerpt: string }[] = [];
  try {
    const refs = await retrieveSimilarRefs({
      categoryId: article.categoryId,
      queryText: article.idea,
      topK: 3,
    });
    styleRefs = refs.map((r) => ({ title: r.title, excerpt: refExcerpt(r.content) }));
  } catch (e) {
    console.warn("[topic] retrieve refs failed:", e);
  }

  const messages = buildTopicMessages({
    idea: article.idea,
    categoryName: article.category.name,
    categoryPrompt: article.category.systemPrompt,
    styleRefs,
  });

  const result = await chatJson<{
    angle: string;
    audience: string;
    titleCandidates: string[];
  }>({ messages, temperature: 0.8 });

  await prisma.article.update({
    where: { id: articleId },
    data: { topicJson: result as any, status: "topic" },
  });

  return NextResponse.json(result);
}
