import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const items = await prisma.category.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { articles: true, styleRefs: true } },
    },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, slug, systemPrompt, toneNotes } = body ?? {};
  if (!name || !slug) {
    return NextResponse.json(
      { error: "name and slug are required" },
      { status: 400 }
    );
  }
  const created = await prisma.category.create({
    data: { name, slug, systemPrompt: systemPrompt ?? null, toneNotes: toneNotes ?? null },
  });
  return NextResponse.json(created);
}
