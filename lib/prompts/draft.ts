interface OutlineSection {
  type: string;
  heading: string;
  point: string;
  wordCount?: number;
}

export interface DraftInput {
  chosenTitle: string;
  outline: { sections: OutlineSection[] };
  angle: string;
  audience: string;
  categoryPrompt?: string | null;
  styleRefs?: { title: string; excerpt: string }[];
}

export function buildDraftMessages(input: DraftInput) {
  const refs =
    input.styleRefs && input.styleRefs.length > 0
      ? `\n# 学习以下范文的语言风格、句式节奏、用词偏好（不要照抄内容，只学风格）：\n` +
        input.styleRefs
          .map((r, i) => `## 参考 ${i + 1}：${r.title}\n${r.excerpt.slice(0, 800)}`)
          .join("\n\n") +
        "\n"
      : "";

  const outlineText = input.outline.sections
    .map(
      (s, i) =>
        `${i + 1}. [${s.type}] ${s.heading} — 要点：${s.point}${s.wordCount ? `（约 ${s.wordCount} 字）` : ""}`
    )
    .join("\n");

  const system = `你是顶级中文公众号写作者。你写的文章特点：
1. 开头 3 句必须抓人——用故事、悬念或反常识陈述切入
2. 短句多、长句少；段落不超过 3 句
3. 善用具体细节代替抽象描述，"她的指甲剪得很短"胜过"她很朴素"
4. 适度使用金句和反问，但不滥用
5. 段与段之间有逻辑钩子（"但是""不过""然而""更糟的是"）
6. 避免 AI 味："综上所述"、"值得注意的是"、"在当今社会"这类词一律不用

最重要：写得**像人写的**。`;

  const user = `请按以下大纲写一篇微信公众号文章。
${input.categoryPrompt ? `\n# 领域写作要求：\n${input.categoryPrompt}\n` : ""}
${refs}
# 标题
${input.chosenTitle}

# 切入角度
${input.angle}

# 目标读者
${input.audience}

# 大纲
${outlineText}

# 要求
- 用 Markdown 输出
- 每段使用 ## 作为段落标题（与大纲对应）
- 总字数控制在大纲规定的范围内
- 不要写"前言""结语"这类生硬的小标题，按大纲给的 heading 写
- 不要在文末加"参考资料""作者简介"

直接输出正文 Markdown，不要任何额外说明：`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
