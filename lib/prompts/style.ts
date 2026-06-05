interface OutlineSection {
  type: string;
  heading: string;
  point?: string;
  wordCount?: number;
}

export interface StylePromptInput {
  chosenTitle: string;
  idea: string;
  contentMd: string;
  outline?: { sections: OutlineSection[] } | null;
  /** 用户在 UI 里写的视觉描述，例如 "想要复古文学杂志风、暖橙色调" */
  userDescription?: string;
}

/**
 * 构建美化 prompt。
 *
 * 输出 styleJson 必须符合 lib/style-schema.ts 中的结构。所有字段都是可选 + 容错，
 * 但 prompt 仍要求模型尽量给齐 8 个 theme 颜色 + 6 个 component 变体选择
 * + 1-3 条 overrides + hero.prompt。
 */
export function buildStyleMessages(input: StylePromptInput) {
  const outlineText = input.outline?.sections?.length
    ? input.outline.sections
        .map((s, i) => `${i + 1}. [${s.type}] ${s.heading}${s.point ? " — " + s.point : ""}`)
        .join("\n")
    : "（无大纲信息）";

  const contentExcerpt = input.contentMd.slice(0, 1500);

  const system = `你是公众号视觉设计师，懂排版美学与微信编辑器兼容性约束。
你不写 HTML，你的输出是 **JSON 配置**，配置会被渲染器翻译成微信公众号兼容的 inline-styled HTML。

视觉风格目标：精致、有呼吸感、像精修过的「秀米」模板，而不是默认 markdown。`;

  const user = `# 文章信息
- 标题：${input.chosenTitle}
- 思路：${input.idea}
- 大纲：
${outlineText}

# 正文片段（截取前 1500 字以判断主题氛围）
${contentExcerpt}

${input.userDescription ? `# 用户视觉偏好\n${input.userDescription}\n` : ""}
# 任务
为这篇文章设计一套视觉风格。输出严格 JSON（不要任何解释文字）：

{
  "theme": {
    "primary":          "#XXXXXX",  // 主色 — 用于标题装饰条、徽章、CTA 背景；要和文章主题氛围契合
    "secondary":        "#XXXXXX",  // 副色 — 比 primary 暗一些或同色系深色
    "background":       "#FFFFFF",  // 卡片底色，建议保持白或极浅
    "text":             "#1F1F1F",  // 正文色
    "secondaryText":    "#555555",  // 引文、辅助文字
    "quoteBg":          "#XXXXXX",  // 引用块底色（很浅）
    "codeBg":           "#F4F4F4",  // 代码块底色
    "codeText":         "#XXXXXX",  // 代码文字色
    "accentDecorative": "#XXXXXX"   // 装饰元素强调色，可与 primary 同色或互补
  },

  "components": {
    "h1":             "title-classic" | "title-ornamental",
    "h2":             "section-decorated" | "section-number-badge" | "section-banner",
    "h3":             "title-classic" | "h3-number-badge",
    "blockquote":     "quote-card-classic" | "quote-card-stamp" | "quote-card-tinted",
    "divider":        "hr-line" | "hr-ornamental" | "hr-dashed-dots",
    "img":            "img-framed" | "img-spotlight",
    "articleWrapper": "plain" | "bordered"
  },

  "overrides": [
    { "anchor": "first",
      "type": "opening-card",
      "props": { "lead": "...", "tagline": "..." } },
    { "anchor": "last",
      "type": "ending-card",
      "props": { "title": "...", "body": "...", "signoff": "—— END ——" } }
  ],

  "hero": {
    "prompt":    "用于 AI 文生图的英文 prompt — 描述能代表本文气质的主视觉，扁平插画/水彩/版画风格，避免文字",
    "placement": "before-opening"
  }
}

# 变体选择规则（务必读完再选）

## 风格判断（先判断文章氛围）
1. **教程 / 知识科普 / 技术分享 / 步骤拆解**（有"步骤""教程""怎么做""原理"等关键词，或大纲有 3+ 个并列要点）：
   - h2 选 **\`section-banner\`**（杂志 Part 01 风）
   - h3 选 **\`h3-number-badge\`**（圆形序号 ①②③）
   - blockquote 选 **\`quote-card-tinted\`**（纯浅色卡片）
   - divider 选 **\`hr-dashed-dots\`**（虚线+圆点）
   - img 选 \`img-framed\`
   - articleWrapper 选 **\`bordered\`**（整篇带细色边框，杂志感）
   - h1 选 \`title-classic\`

2. **文艺 / 散文 / 故事 / 情感**：
   - h1 选 \`title-ornamental\`、blockquote 选 \`quote-card-stamp\`、divider 选 \`hr-ornamental\`、img 选 \`img-spotlight\`、articleWrapper 选 \`plain\`
   - h2 选 \`section-decorated\`、h3 选 \`title-classic\`

3. **严肃 / 商务 / 评论**：
   - 全部用最朴素的 classic 系列：h1=\`title-classic\`、h2=\`section-decorated\`、h3=\`title-classic\`、blockquote=\`quote-card-classic\`、divider=\`hr-line\`、img=\`img-framed\`、articleWrapper=\`plain\`

## 强制规则（不能违反）
- 当 articleWrapper="bordered" 时，theme.primary 必须是较饱和的颜色（不要灰、不要黑），不然边框会太抢戏
- h2 选 \`section-banner\` 时，h3 应该选 \`h3-number-badge\`（视觉风格匹配）；反过来不强制
- 同一 styleJson 内只能选一种 h2 variant、一种 h3 variant；不能 hybrid

# overrides 规则
- 至少给 1 条 anchor="first" 的 \`opening-card\`（lead 简短 6-10 字，tagline 一句话点题，10-25 字）
- 至少给 1 条 anchor="last" 的 \`ending-card\`（title 短语，body 一句话，可以呼吁转发/在看/留言）
- **教程 / 科普类务必加 2-3 条** \`callout-box\`：
  - 每条用 \`{"anchor": {"headingMatch": "<该 h2/h3 标题里的独特词，4-8 字>"}, "type": "callout-box", "props": {"label": "<标签>", "body": "<一句话总结/警示>"}}\`
  - label 候选："重点" / "提示" / "注意" / "概念" / "关键" / "踩坑"
  - body 写一句话总结性提炼，10-30 字
  - 优先放在涉及"原理 / 警示 / 易踩坑 / 关键步骤"的章节
- overrides 总条数：文艺类 2 条；教程/科普类 **4-5 条**（开+结+2-3 中段 callout）

# hero.prompt 规则
- 必须英文，30 词左右
- 描述画面 + 风格 + 色调（与 theme.primary 呼应），用逗号分隔
- 不要文字 (text/letters/word) 不要 logo
- 例如："a vintage typewriter on a desk strewn with sheets of paper, warm orange tones, flat illustration, editorial style, no text"

# 颜色建议
- 不要纯黑/纯白做 primary
- 同一篇文章里 primary 和 accentDecorative 可以同色或同色系
- quoteBg 要比 background 略带颜色或灰度，保证视觉层次（不要 #FFFFFF）

直接输出 JSON：`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
