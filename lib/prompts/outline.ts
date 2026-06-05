export interface OutlineInput {
  chosenTitle: string;
  angle: string;
  audience: string;
  idea: string;
  categoryPrompt?: string | null;
}

export function buildOutlineMessages(input: OutlineInput) {
  const system = `你是微信公众号长文结构师，擅长设计能让读者一口气读完的文章骨架。`;

  const user = `# 文章信息
- 标题：${input.chosenTitle}
- 切入角度：${input.angle}
- 目标读者：${input.audience}
- 原始思路：${input.idea}
${input.categoryPrompt ? `\n# 写作要求：\n${input.categoryPrompt}\n` : ""}

# 任务
设计这篇文章的大纲。要求：
1. 开头 1 段（必须有钩子，让人想读下去）
2. 主体 3-5 段（每段一个要点，标题简短有力）
3. 结尾 1 段（升华或引发互动）
4. 每段标注一句话要点 + 建议字数（总字数控制在 1500-2500）

# 输出严格 JSON：
{
  "sections": [
    { "type": "opening", "heading": "...", "point": "...", "wordCount": 200 },
    { "type": "body",    "heading": "...", "point": "...", "wordCount": 400 },
    { "type": "body",    "heading": "...", "point": "...", "wordCount": 400 },
    { "type": "ending",  "heading": "...", "point": "...", "wordCount": 200 }
  ]
}`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
