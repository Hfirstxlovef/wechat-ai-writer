import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderWechatHtml } from "@/lib/wechat-renderer";

/**
 * 临时预览端点。接收 styleJson + articleId，用当前 contentMd 渲染出 HTML。
 * 不写入数据库。专供 StyleStep 实时刷新右侧手机预览。
 */
export async function POST(req: NextRequest) {
  const { articleId, styleJson, contentMd } = await req.json();
  if (!articleId && !contentMd) {
    return NextResponse.json({ error: "articleId or contentMd required" }, { status: 400 });
  }

  let md = contentMd as string | undefined;
  if (!md && articleId) {
    const article = await prisma.article.findUnique({ where: { id: articleId } });
    if (!article || !article.contentMd) {
      return NextResponse.json({ error: "article or content missing" }, { status: 400 });
    }
    md = article.contentMd;
  }

  const html = renderWechatHtml(md ?? "", { styleJson });
  return NextResponse.json({ html });
}
