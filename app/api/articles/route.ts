import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const items = await prisma.article.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      idea: true,
      status: true,
      chosenTitle: true,
      coverImage: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { categoryId, idea } = body ?? {};
  if (!categoryId || !idea) {
    return NextResponse.json(
      { error: "categoryId and idea are required" },
      { status: 400 }
    );
  }
  const created = await prisma.article.create({
    data: { categoryId, idea, status: "draft" },
  });
  return NextResponse.json(created);
}
