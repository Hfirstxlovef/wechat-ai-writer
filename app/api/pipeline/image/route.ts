import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateImage } from "@/lib/zenmux";
import { uploadBase64, uploadFromUrl } from "@/lib/storage";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { articleId, prompt, size, quality, asCover, slot, role } =
    await req.json();
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const gen = await generateImage({ prompt, size, quality });

  let uploaded: { key: string; url: string };
  if (gen.b64) {
    uploaded = await uploadBase64({ b64: gen.b64, ext: "png", mimeType: "image/png" });
  } else if (gen.url) {
    uploaded = await uploadFromUrl({ remoteUrl: gen.url });
  } else {
    return NextResponse.json(
      { error: "image generation returned no data" },
      { status: 500 }
    );
  }

  const effectiveRole = role ?? (asCover ? "cover" : null);
  const isCover = effectiveRole === "cover" || asCover === true;

  let imageId: string | null = null;
  if (articleId) {
    // 同 slot 已有图：覆盖（重新生成场景），其他 slot 保留
    if (slot) {
      await prisma.image.deleteMany({ where: { articleId, slot } });
    }
    const created = await prisma.image.create({
      data: {
        articleId,
        url: uploaded.url,
        prompt,
        model: gen.model,
        slot: slot ?? null,
        role: effectiveRole,
      },
    });
    imageId = created.id;
    if (isCover) {
      await prisma.article.update({
        where: { id: articleId },
        data: { coverImage: uploaded.url },
      });
    }
  }

  return NextResponse.json({
    url: uploaded.url,
    key: uploaded.key,
    imageId,
    slot: slot ?? null,
    role: effectiveRole,
  });
}
