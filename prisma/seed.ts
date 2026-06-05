import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.category.upsert({
    where: { slug: "general" },
    update: {},
    create: {
      name: "通用",
      slug: "general",
      systemPrompt:
        "你是一个优秀的微信公众号内容创作者。写作时注重：语言流畅自然、有人味儿；结构清晰；金句和故事并重；适合在手机上阅读。",
      toneNotes: "默认风格：自然口语化、有温度、易读；段落不超过 3 句。",
    },
  });

  console.log("[seed] done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
