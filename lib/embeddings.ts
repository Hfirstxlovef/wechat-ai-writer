import { prisma } from "./db";
import { embed } from "./zenmux";

export async function indexStyleRef(styleRefId: string, text: string) {
  const [vec] = await embed(text);
  const vecLiteral = `[${vec.join(",")}]`;
  await prisma.$executeRawUnsafe(
    `UPDATE "StyleRef" SET "embedding" = $1::vector WHERE "id" = $2`,
    vecLiteral,
    styleRefId
  );
}

export interface RetrievedRef {
  id: string;
  title: string;
  content: string;
  distance: number;
}

export async function retrieveSimilarRefs(opts: {
  categoryId: string;
  queryText: string;
  topK?: number;
}): Promise<RetrievedRef[]> {
  const k = opts.topK ?? 3;
  const [vec] = await embed(opts.queryText);
  const vecLiteral = `[${vec.join(",")}]`;
  const rows = await prisma.$queryRawUnsafe<RetrievedRef[]>(
    `SELECT "id", "title", "content",
            ("embedding" <=> $1::vector) AS "distance"
       FROM "StyleRef"
      WHERE "categoryId" = $2 AND "embedding" IS NOT NULL
   ORDER BY "embedding" <=> $1::vector
      LIMIT $3`,
    vecLiteral,
    opts.categoryId,
    k
  );
  return rows;
}

export function refExcerpt(content: string, maxLen = 600): string {
  if (content.length <= maxLen) return content;
  return content.slice(0, maxLen) + "...";
}
