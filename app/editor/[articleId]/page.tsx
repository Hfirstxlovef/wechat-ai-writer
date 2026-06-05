import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PipelineEditor } from "@/components/PipelineEditor";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: { articleId: string };
}) {
  const article = await prisma.article.findUnique({
    where: { id: params.articleId },
    include: { category: true, images: true },
  });
  if (!article) notFound();
  return (
    <AppShell>
      <PipelineEditor initialArticle={JSON.parse(JSON.stringify(article))} />
    </AppShell>
  );
}
