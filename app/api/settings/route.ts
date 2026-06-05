import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, upsertSettings, SETTING_KEYS } from "@/lib/settings";

export async function GET() {
  const s = await getAllSettings();
  return NextResponse.json(s);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const updates: Record<string, string | null> = {};
  // apiKey: 空串/undefined 表示「不修改」；显式传 null 表示「清空回落到 .env」
  if (body.apiKey !== undefined) {
    updates[SETTING_KEYS.ZENMUX_API_KEY] = body.apiKey;
  }
  if (body.modelText !== undefined) {
    updates[SETTING_KEYS.MODEL_TEXT] = body.modelText;
  }
  if (body.modelStyle !== undefined) {
    updates[SETTING_KEYS.MODEL_STYLE] = body.modelStyle;
  }
  if (body.modelImage !== undefined) {
    updates[SETTING_KEYS.MODEL_IMAGE] = body.modelImage;
  }
  if (body.modelEmbedding !== undefined) {
    updates[SETTING_KEYS.MODEL_EMBEDDING] = body.modelEmbedding;
  }
  // language: 仅接受 "zh" | "en"，始终写入非空值（绕开「空串=删除」语义）
  if (body.language === "zh" || body.language === "en") {
    updates[SETTING_KEYS.LANGUAGE] = body.language;
  }
  await upsertSettings(updates);
  const s = await getAllSettings();
  return NextResponse.json(s);
}
