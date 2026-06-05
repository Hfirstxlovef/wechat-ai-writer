import { NextRequest, NextResponse } from "next/server";
import { uploadBuffer } from "@/lib/storage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.split(".").pop() || "png";
  const uploaded = await uploadBuffer({
    buffer,
    ext,
    mimeType: file.type || undefined,
  });
  return NextResponse.json({ url: uploaded.url, key: uploaded.key });
}
