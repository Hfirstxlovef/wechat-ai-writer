import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { indexStyleRef } from "@/lib/embeddings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  if (!categoryId) {
    return NextResponse.json({ error: "categoryId required" }, { status: 400 });
  }
  const rows = await prisma.$queryRawUnsafe<
    {
      id: string;
      categoryId: string;
      title: string;
      content: string;
      createdAt: Date;
      hasEmbedding: boolean;
    }[]
  >(
    `SELECT "id", "categoryId", "title", "content", "createdAt",
            ("embedding" IS NOT NULL) AS "hasEmbedding"
       FROM "StyleRef"
      WHERE "categoryId" = $1
   ORDER BY "createdAt" DESC`,
    categoryId
  );
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { categoryId, title, content } = body ?? {};
  if (!categoryId || !title || !content) {
    return NextResponse.json(
      { error: "categoryId, title and content are required" },
      { status: 400 }
    );
  }
  const created = await prisma.styleRef.create({
    data: { categoryId, title, content },
  });

  // 异步生成 embedding，不阻塞响应
  indexStyleRef(created.id, `${title}\n\n${content}`).catch((e) => {
    console.error("[style-ref] embedding failed:", e);
  });

  return NextResponse.json(created);
}
