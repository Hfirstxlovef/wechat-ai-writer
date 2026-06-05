export interface TopicInput {
  idea: string;
  categoryName: string;
  categoryPrompt?: string | null;
  styleRefs?: { title: string; excerpt: string }[];
}

export function buildTopicMessages(input: TopicInput) {
  const refs =
    input.styleRefs && input.styleRefs.length > 0
      ? `\n\n# 该领域过往代表作（学习其文风和切入角度）：\n` +
        input.styleRefs
          .map((r, i) => `## 参考 ${i + 1}：${r.title}\n${r.excerpt}`)
          .join("\n\n")
      : "";

  const system = `你是资深微信公众号主编，擅长把用户的模糊想法变成有传播力的选题。`;

  const user = `# 领域：${input.categoryName}
${input.categoryPrompt ? `\n# 该领域写作要求：\n${input.categoryPrompt}\n` : ""}
${refs}

# 用户的初步思路：
${input.idea}

# 任务
基于上面的思路，请输出选题深化结果。要求：
1. 提炼一个清晰的"角度"——告诉读者文章会从哪个切口讲
2. 明确目标读者画像（1-2 句）
3. 给出 5 个**爆款标题**候选，要求：吸引点击但不标题党、长度 12-22 字、风格各异（数字型/悬念型/共鸣型/反差型/价值型至少各一）

# 输出严格用如下 JSON 格式（不要任何额外文字）：
{
  "angle": "...",
  "audience": "...",
  "titleCandidates": ["...", "...", "...", "...", "..."]
}`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
