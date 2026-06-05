export interface TitleInput {
  content: string;
  currentTitle?: string;
  categoryName?: string;
}

export function buildTitleMessages(input: TitleInput) {
  const system = `你是公众号标题专家。爆款标题的核心法则：
1. 长度 12-22 字最适合手机端
2. 利用具体数字、反差、悬念、情绪触发或价值承诺
3. 避免"震惊""速看""刷屏"这类廉价词
4. 让人在 0.5 秒内决定要不要点
`;

  const user = `${input.categoryName ? `# 领域：${input.categoryName}\n` : ""}${input.currentTitle ? `# 当前标题：${input.currentTitle}\n` : ""}
# 正文（节选）
${input.content.slice(0, 2500)}
${input.content.length > 2500 ? "...(略)" : ""}

# 任务
基于这篇文章，重新设计 5 个备选标题。每个标题要：
- 风格不同（数字型/悬念型/共鸣型/反差型/价值型 各一）
- 准确反映文章内容，不能虚假承诺

严格输出 JSON：
{
  "titles": [
    { "type": "数字型", "title": "..." },
    { "type": "悬念型", "title": "..." },
    { "type": "共鸣型", "title": "..." },
    { "type": "反差型", "title": "..." },
    { "type": "价值型", "title": "..." }
  ]
}`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
