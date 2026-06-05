import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.article.findUnique({
    where: { id: params.id },
    include: { category: true, images: true },
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of [
    "idea",
    "status",
    "topicJson",
    "chosenTitle",
    "outlineJson",
    "contentMd",
    "contentHtml",
    "styleJson",
    "imagePlanJson",
    "coverImage",
  ]) {
    if (k in body) data[k] = body[k];
  }
  const updated = await prisma.article.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.image.deleteMany({ where: { articleId: params.id } });
  await prisma.article.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
