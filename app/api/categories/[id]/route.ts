import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.category.findUnique({
    where: { id: params.id },
    include: { _count: { select: { articles: true, styleRefs: true } } },
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const updated = await prisma.category.update({
    where: { id: params.id },
    data: {
      name: body.name,
      slug: body.slug,
      systemPrompt: body.systemPrompt,
      toneNotes: body.toneNotes,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // 把同 category 的文章和 styleRefs 一起删
  await prisma.styleRef.deleteMany({ where: { categoryId: params.id } });
  await prisma.article.deleteMany({ where: { categoryId: params.id } });
  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
