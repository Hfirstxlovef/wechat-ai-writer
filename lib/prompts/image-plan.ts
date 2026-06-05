interface OutlineSection {
  type: string;
  heading: string;
  point?: string;
  wordCount?: number;
}

export interface ImagePlanPromptInput {
  chosenTitle: string;
  idea: string;
  contentMd: string;
  outline?: { sections: OutlineSection[] } | null;
}

export interface PlannedSlot {
  /** kebab-case 短标识，文章内全局唯一，例如 "cover" / "scene-typewriter" / "step-1" */
  slot: string;
  /** 角色：cover=封面/置顶；inline=正文配图 */
  role: "cover" | "inline";
  /** AI 生图用的英文 prompt（30 词左右，无文字） */
  prompt: string;
  /** 用户可读的中文上下文提示，说明此图配哪一段，10-25 字 */
  contextHint: string;
  /**
   * 插入位置标识：
   *   "__top__"     = 文章最前（cover 必须用这个）
   *   "<短语>"      = markdown 标题里能匹配到的独特短语，slot 注释将插入此标题之后、正文前
   */
  insertAfter: string;
}

export interface ImagePlanOutput {
  slots: PlannedSlot[];
}

export function buildImagePlanMessages(input: ImagePlanPromptInput) {
  const outlineText = input.outline?.sections?.length
    ? input.outline.sections
        .map(
          (s, i) =>
            `${i + 1}. [${s.type}] ${s.heading}${s.point ? " — " + s.point : ""}`
        )
        .join("\n")
    : "（无大纲信息）";

  const wordCount = input.contentMd.length;
  const contentExcerpt = input.contentMd.slice(0, 4000);

  const system = `你是公众号视觉编辑，负责为推文规划配图。
你的输出是一份 JSON 配图计划：包含 1 张封面 + 若干内文配图，每张都给出生图 prompt 与插入位置。
你不直接生图，也不写 HTML。`;

  const user = `# 文章信息
- 标题：${input.chosenTitle}
- 思路：${input.idea}
- 大纲：
${outlineText}

# 正文（共 ${wordCount} 字，截取前 4000 字）
${contentExcerpt}

# 任务
为这篇文章设计配图计划。严格输出 JSON（不要任何解释文字）：

{
  "slots": [
    {
      "slot": "cover",
      "role": "cover",
      "prompt": "英文生图 prompt，30 词左右",
      "contextHint": "封面 — 一句中文说明这张图配什么气质",
      "insertAfter": "__top__"
    },
    {
      "slot": "scene-typewriter",
      "role": "inline",
      "prompt": "英文生图 prompt，30 词左右",
      "contextHint": "配 xxx 段 — 中文说明 10-25 字",
      "insertAfter": "标题里的独特短语 4-8 字"
    }
  ]
}

# 数量建议
- 必须有 1 张 role="cover" 的封面，且 insertAfter="__top__"
- 内文配图按字数：
  * < 1000 字：0 张
  * 1000-2000 字：1-2 张
  * 2000-4000 字：2-3 张
  * > 4000 字：3-5 张
- 总数不超过 6 张（含封面）

# slot 命名规则
- 全文唯一、kebab-case、不超过 20 字符
- cover 用固定值 "cover"
- 内文图根据画面内容取义：scene-typewriter / diagram-flow / step-prep / metaphor-bridge / quote-mountain ...

# insertAfter 规则
- cover 必须 "__top__"
- 内文图：从 contentMd 里挑一个该段的 markdown 标题（## 或 ### 开头那行），取标题中**独特**的 4-8 字短语；不要选可能在多个标题里重复的通用词
- 例：标题 "## 第一步：准备打字机零件"，insertAfter 写 "准备打字机零件" 而非 "第一步"
- 一个标题只能被一个 slot 引用，避免多张图挤在同一段后

# prompt 规则
- 必须英文，约 30 词
- 描述画面 + 风格 + 色调，用逗号分隔
- 风格建议：flat illustration / editorial / minimal line art / watercolor / vintage poster / Studio Ghibli style — 选一种贯穿整套配图，保持风格统一
- 严禁出现：text, letters, word, logo, watermark, signature
- 例：
  * "a vintage typewriter on a wooden desk surrounded by crumpled papers, warm orange tones, flat editorial illustration, no text"
  * "an abstract bridge connecting two cliffs over fog, muted blue and grey palette, minimal line art style, no text"

# contextHint 规则
- 中文，10-25 字
- 让用户一眼看懂"这张图配的是文章哪一段、表达什么意境"
- 例："封面 — 体现写作孤独感的主视觉" / "配第二节 — 给『跨越鸿沟』段一个隐喻画面"

# 强制规则（不可违反）
- 必须有 1 张且仅 1 张 cover（insertAfter="__top__"）
- 所有 slot 必须不同
- 内文图的 insertAfter 必须能在 contentMd 的某个 markdown 标题里子串匹配到
- 风格保持统一（同一套 prompt 用同一种 illustration style 关键词）

直接输出 JSON：`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}
