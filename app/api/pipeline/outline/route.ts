import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { chatJson } from "@/lib/zenmux";
import { buildOutlineMessages } from "@/lib/prompts/outline";

export async function POST(req: NextRequest) {
  const { articleId, chosenTitle } = await req.json();
  if (!articleId || !chosenTitle) {
    return NextResponse.json(
      { error: "articleId and chosenTitle required" },
      { status: 400 }
    );
  }
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { category: true },
  });
  if (!article) {
    return NextResponse.json({ error: "article not found" }, { status: 404 });
  }
  const topic = (article.topicJson as any) ?? {};

  const messages = buildOutlineMessages({
    chosenTitle,
    angle: topic.angle ?? "",
    audience: topic.audience ?? "",
    idea: article.idea,
    categoryPrompt: article.category.systemPrompt,
  });

  const result = await chatJson<{
    sections: Array<{ type: string; heading: string; point: string; wordCount?: number }>;
  }>({ messages, temperature: 0.7 });

  await prisma.article.update({
    where: { id: articleId },
    data: {
      chosenTitle,
      outlineJson: result as any,
      status: "outline",
    },
  });

  return NextResponse.json(result);
}
