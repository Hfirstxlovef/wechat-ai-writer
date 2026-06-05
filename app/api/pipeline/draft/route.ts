import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { chatStream } from "@/lib/zenmux";
import { buildDraftMessages } from "@/lib/prompts/draft";
import { retrieveSimilarRefs, refExcerpt } from "@/lib/embeddings";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { articleId } = await req.json();
  if (!articleId) {
    return new Response(JSON.stringify({ error: "articleId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: { category: true },
  });
  if (!article || !article.outlineJson || !article.chosenTitle) {
    return new Response(
      JSON.stringify({ error: "article/outline/title missing" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const topic = (article.topicJson as any) ?? {};
  const outline = article.outlineJson as any;

  let styleRefs: { title: string; excerpt: string }[] = [];
  try {
    const refs = await retrieveSimilarRefs({
      categoryId: article.categoryId,
      queryText: `${article.chosenTitle}\n${article.idea}`,
      topK: 3,
    });
    styleRefs = refs.map((r) => ({
      title: r.title,
      excerpt: refExcerpt(r.content, 800),
    }));
  } catch (e) {
    console.warn("[draft] retrieve refs failed:", e);
  }

  const messages = buildDraftMessages({
    chosenTitle: article.chosenTitle,
    outline,
    angle: topic.angle ?? "",
    audience: topic.audience ?? "",
    categoryPrompt: article.category.systemPrompt,
    styleRefs,
  });

  await prisma.article.update({
    where: { id: articleId },
    data: { status: "writing" },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let buf = "";
      try {
        for await (const piece of chatStream({
          messages,
          temperature: 0.75,
          maxTokens: 4000,
        })) {
          buf += piece;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ delta: piece })}\n\n`)
          );
        }
        // 写入数据库
        await prisma.article.update({
          where: { id: articleId },
          data: { contentMd: buf, status: "done" },
        });
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: e?.message ?? String(e) })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
