import "dotenv/config";
import { chat, embed } from "../lib/zenmux";

async function main() {
  console.log("=== chat (default text model) ===");
  const reply = await chat({
    messages: [
      { role: "user", content: "用一句话介绍微信公众号是什么。" },
    ],
    maxTokens: 200,
  });
  console.log(reply);

  console.log("\n=== embed (default embedding model) ===");
  try {
    const vecs = await embed(["微信公众号是什么？"]);
    console.log("vec dim:", vecs[0].length);
  } catch (e: any) {
    console.error("embedding failed:", e?.message ?? e);
  }
}

main().catch(console.error);
