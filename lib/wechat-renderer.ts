/**
 * 把 Markdown 文章渲染为微信公众号兼容的 inline-styled HTML。
 *
 * 微信公众号兼容性约束（写代码时务必遵守）：
 * - 所有样式 inline，无 class/id/<style>/data-*
 * - 不用：linear-gradient、box-shadow、position: absolute/fixed、float、transform、background-image
 * - 慎用：border-radius（老版编辑器会丢，圆角用嵌套 section + 背景色模拟）
 * - <hr> 经常被吃，用 <section style="border-top"> 替代
 * - letter-spacing 中文用 0 或 0.3px（再大字距怪异）
 * - inline SVG 会被 strip — 装饰用 Unicode (❖ ◆ ✦) + 嵌套 section + 颜色块
 * - <img> 复制到公众号后须手动重新上传（外链 URL 无法在公众号显示）
 * - 推荐用 <section> 嵌套而非 <div>
 */

import {
  renderH1Classic,
  renderH1Ornamental,
  renderH2SectionDecorated,
  renderH2SectionNumberBadge,
  renderH2SectionBanner,
  renderH3Classic,
  renderH3NumberBadge,
  renderQuoteClassic,
  renderQuoteStamp,
  renderQuoteTinted,
  renderHrLine,
  renderHrOrnamental,
  renderHrDashedDots,
  renderImgFramed,
  renderImgSpotlight,
  renderOpeningCard,
  renderEndingCard,
  renderCalloutBox,
  resetH2NumberCounter,
  resetH2BannerCounter,
  resetH3BadgeCounter,
  Theme,
} from "./style-components";
import {
  DEFAULT_COMPONENTS,
  DEFAULT_THEME,
  resolveStyleJson,
  StyleOverride,
} from "./style-schema";

export interface RenderOptions {
  /** 旧版主题名，向后兼容 */
  theme?: "wechat-green" | "warm" | "minimal";
  /** 新版 styleJson — 存在时优先使用 */
  styleJson?: unknown;
}

// 旧 3 主题色板 — styleJson 不存在时使用
const LEGACY_THEMES: Record<string, Partial<Theme>> = {
  "wechat-green": {
    primary: "#07C160",
    secondary: "#03894E",
    accentDecorative: "#07C160",
    text: "#1F1F1F",
    secondaryText: "#555555",
    quoteBg: "#F7F7F7",
    codeBg: "#F4F4F4",
    codeText: "#C7254E",
  },
  warm: {
    primary: "#D97706",
    secondary: "#B45309",
    accentDecorative: "#D97706",
    text: "#1F1F1F",
    secondaryText: "#555555",
    quoteBg: "#FEF3C7",
    codeBg: "#FEF9E7",
    codeText: "#9A3412",
  },
  minimal: {
    primary: "#1F1F1F",
    secondary: "#444444",
    accentDecorative: "#888888",
    text: "#1F1F1F",
    secondaryText: "#666666",
    quoteBg: "#FAFAFA",
    codeBg: "#F4F4F4",
    codeText: "#1F1F1F",
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface InlineStyles {
  code: string;
  strong: string;
  em: string;
  a: string;
  img: string;
}

function inlineStyles(theme: Theme): InlineStyles {
  return {
    code: `background: ${theme.codeBg}; padding: 2px 6px; font-size: 0.92em; color: ${theme.codeText}; font-family: 'SF Mono', Consolas, monospace;`,
    strong: `font-weight: 700; color: ${theme.text};`,
    em: `font-style: italic;`,
    a: `color: #576B95; text-decoration: none; border-bottom: 1px solid #576B95;`,
    img: `max-width: 100%; height: auto; display: block; margin: 1em auto;`,
  };
}

/** 行内 markdown 解析：**bold**, *italic*, `code`, [link](url), ![alt](url) */
function renderInline(text: string, st: InlineStyles): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "!" && text[i + 1] === "[") {
      const close = text.indexOf("]", i + 2);
      const open = text.indexOf("(", close);
      const end = text.indexOf(")", open);
      if (close > 0 && open === close + 1 && end > 0) {
        const alt = text.slice(i + 2, close);
        const url = text.slice(open + 1, end);
        out += `<img src="${url}" alt="${escapeHtml(alt)}" style="${st.img}" />`;
        i = end + 1;
        continue;
      }
    }
    if (ch === "[") {
      const close = text.indexOf("]", i + 1);
      const open = text.indexOf("(", close);
      const end = text.indexOf(")", open);
      if (close > 0 && open === close + 1 && end > 0) {
        const label = text.slice(i + 1, close);
        const url = text.slice(open + 1, end);
        out += `<a href="${url}" style="${st.a}">${renderInline(label, st)}</a>`;
        i = end + 1;
        continue;
      }
    }
    if (ch === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > 0) {
        const inner = text.slice(i + 2, end);
        out += `<strong style="${st.strong}">${renderInline(inner, st)}</strong>`;
        i = end + 2;
        continue;
      }
    }
    if (ch === "*" && text[i + 1] !== "*") {
      const end = text.indexOf("*", i + 1);
      if (end > 0) {
        const inner = text.slice(i + 1, end);
        out += `<em style="${st.em}">${escapeHtml(inner)}</em>`;
        i = end + 1;
        continue;
      }
    }
    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > 0) {
        const inner = text.slice(i + 1, end);
        out += `<code style="${st.code}">${escapeHtml(inner)}</code>`;
        i = end + 1;
        continue;
      }
    }
    out += escapeHtml(ch);
    i++;
  }
  return out;
}

// ============ Block 类型 ============
type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "blockquote"; text: string }
  | { kind: "hr" }
  | { kind: "code"; code: string }
  | { kind: "img"; url: string; alt: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ kind: "code", code: codeLines.join("\n") });
      continue;
    }

    const hMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = hMatch[2];
      if (level === 1) blocks.push({ kind: "h1", text });
      else if (level === 2) blocks.push({ kind: "h2", text });
      else blocks.push({ kind: "h3", text });
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // 独立 image 段 ![alt](url) — 当作图片 block 渲染
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      blocks.push({ kind: "img", alt: imgMatch[1], url: imgMatch[2] });
      i++;
      continue;
    }

    // 普通段落（连续非空行合并）
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !lines[i].startsWith(">") &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !/^---+$/.test(lines[i].trim())
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length > 0) {
      blocks.push({ kind: "p", text: para.join(" ") });
    }
  }

  return blocks;
}

// ============ Block 渲染 dispatch ============

function renderBlock(
  block: Block,
  components: typeof DEFAULT_COMPONENTS,
  theme: Theme,
  inline: InlineStyles
): string {
  switch (block.kind) {
    case "h1": {
      const inner = renderInline(block.text, inline);
      return components.h1 === "title-ornamental"
        ? renderH1Ornamental(inner, theme)
        : renderH1Classic(inner, theme);
    }
    case "h2": {
      const inner = renderInline(block.text, inline);
      // 每进入新 h2，h3 序号重新从 1 开始（章节内独立编号）
      resetH3BadgeCounter();
      if (components.h2 === "section-banner") return renderH2SectionBanner(inner, theme);
      if (components.h2 === "section-number-badge")
        return renderH2SectionNumberBadge(inner, theme);
      return renderH2SectionDecorated(inner, theme);
    }
    case "h3": {
      const inner = renderInline(block.text, inline);
      if (components.h3 === "h3-number-badge") return renderH3NumberBadge(inner, theme);
      return renderH3Classic(inner, theme);
    }
    case "p": {
      const inner = renderInline(block.text, inline);
      const style = `margin: 1em 0; line-height: 1.85; letter-spacing: 0.3px; color: ${theme.text};`;
      return `<section><p style="${style}">${inner}</p></section>`;
    }
    case "ul": {
      const ulStyle = `margin: 1em 0; padding-left: 1.5em;`;
      const liStyle = `margin: 0.4em 0; line-height: 1.85; color: ${theme.text};`;
      const items = block.items
        .map((it) => `<li style="${liStyle}">${renderInline(it, inline)}</li>`)
        .join("");
      return `<section><ul style="${ulStyle}">${items}</ul></section>`;
    }
    case "ol": {
      const olStyle = `margin: 1em 0; padding-left: 1.5em;`;
      const liStyle = `margin: 0.4em 0; line-height: 1.85; color: ${theme.text};`;
      const items = block.items
        .map((it) => `<li style="${liStyle}">${renderInline(it, inline)}</li>`)
        .join("");
      return `<section><ol style="${olStyle}">${items}</ol></section>`;
    }
    case "blockquote": {
      const inner = renderInline(block.text, inline);
      if (components.blockquote === "quote-card-stamp") return renderQuoteStamp(inner, theme);
      if (components.blockquote === "quote-card-tinted") return renderQuoteTinted(inner, theme);
      return renderQuoteClassic(inner, theme);
    }
    case "hr": {
      if (components.divider === "hr-ornamental") return renderHrOrnamental(theme);
      if (components.divider === "hr-dashed-dots") return renderHrDashedDots(theme);
      return renderHrLine(theme);
    }
    case "code": {
      const preStyle = `background: ${theme.codeBg}; padding: 1em; overflow-x: auto; font-size: 14px; line-height: 1.5; margin: 1em 0; color: ${theme.codeText}; font-family: 'SF Mono', Consolas, monospace;`;
      return `<section><pre style="${preStyle}"><code>${escapeHtml(block.code)}</code></pre></section>`;
    }
    case "img": {
      return components.img === "img-spotlight"
        ? renderImgSpotlight({ url: block.url, alt: block.alt }, theme)
        : renderImgFramed({ url: block.url, alt: block.alt }, theme);
    }
  }
}

function renderOverride(o: StyleOverride, theme: Theme): string {
  const props = (o.props ?? {}) as Record<string, any>;
  switch (o.type) {
    case "opening-card":
      return renderOpeningCard({ lead: props.lead, tagline: props.tagline }, theme);
    case "ending-card":
      return renderEndingCard(
        { title: props.title, body: props.body, signoff: props.signoff },
        theme
      );
    case "callout-box":
      return renderCalloutBox({ label: props.label, body: props.body }, theme);
    default:
      return "";
  }
}

// h2 文本匹配 — 用于 anchor.headingMatch
function blockHeadingText(b: Block): string | null {
  if (b.kind === "h1" || b.kind === "h2" || b.kind === "h3") return b.text;
  return null;
}

export function renderWechatHtml(
  markdown: string,
  options: RenderOptions = {}
): string {
  // 0. 解析 blocks
  const blocks = parseBlocks(markdown);

  // 1. 解析 theme + components
  const resolved = resolveStyleJson(options.styleJson);
  const themeOverride = options.theme && LEGACY_THEMES[options.theme]
    ? LEGACY_THEMES[options.theme]
    : {};
  // styleJson 存在 → 用 styleJson；不存在 → 用 legacy theme 覆盖默认
  const theme: Theme = options.styleJson
    ? resolved.theme
    : { ...DEFAULT_THEME, ...themeOverride };
  const components = options.styleJson ? resolved.components : DEFAULT_COMPONENTS;

  resetH2NumberCounter();
  resetH2BannerCounter();
  resetH3BadgeCounter();
  const inline = inlineStyles(theme);

  // 2. 渲染主体 blocks
  const rendered: string[] = blocks.map((b) => renderBlock(b, components, theme, inline));

  // 3. 处理 overrides — 插入到对应 anchor 位置
  // anchor "first" → 插到首 block 前
  // anchor "last"  → 插到末 block 后
  // anchor.headingMatch → 插到匹配 heading block 前
  // 失败的 override 静默 drop（已在外层 zod 容忍）
  // 简单实现：从前往后遍历 overrides，每条计算插入位置后填进 segments
  type Segment = { html: string; insertBefore?: number; insertAfter?: number };
  const overrides = resolved.overrides ?? [];
  // 收集插入点 → { beforeIdx: html[], afterIdx: html[] }
  const insertBefore: Record<number, string[]> = {};
  const insertAfter: Record<number, string[]> = {};
  for (const o of overrides) {
    if (!o) continue;
    const html = renderOverride(o, theme);
    if (!html) continue;
    if (o.anchor === "first") {
      if (blocks.length === 0) continue;
      insertBefore[0] = insertBefore[0] || [];
      insertBefore[0].push(html);
    } else if (o.anchor === "last") {
      if (blocks.length === 0) continue;
      const idx = blocks.length - 1;
      insertAfter[idx] = insertAfter[idx] || [];
      insertAfter[idx].push(html);
    } else if (typeof o.anchor === "object" && o.anchor && "headingMatch" in o.anchor) {
      const needle = o.anchor.headingMatch.trim();
      if (!needle) continue;
      const matchIdx = blocks.findIndex((b) => {
        const t = blockHeadingText(b);
        return t && t.includes(needle);
      });
      if (matchIdx === -1) continue;
      insertBefore[matchIdx] = insertBefore[matchIdx] || [];
      insertBefore[matchIdx].push(html);
    }
  }

  // 4. 拼接 — 先 insertBefore[i] → rendered[i] → insertAfter[i]
  const out: string[] = [];
  // hero before-opening：先把 hero <img> 放在最前
  if (resolved.hero.url && resolved.hero.placement === "before-opening") {
    out.push(renderImgFramed({ url: resolved.hero.url, alt: "" }, theme));
  }
  for (let i = 0; i < rendered.length; i++) {
    if (insertBefore[i]) out.push(...insertBefore[i]);
    out.push(rendered[i]);
    if (insertAfter[i]) out.push(...insertAfter[i]);
  }

  // 5. 外层容器
  const baseFont = `font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; font-size: 16px; line-height: 1.75; color: ${theme.text}; word-wrap: break-word;`;

  if (components.articleWrapper === "bordered") {
    // 模仿"杂志精修"——整篇文章包一层细色边框，左右内缩
    const outer = `${baseFont} background: ${theme.background}; padding: 18px 14px; border: 1.5px solid ${theme.primary}; margin: 4px 0;`;
    return `<section style="${outer}">${out.join("")}</section>`;
  }

  const articleStyle = `${baseFont} background: ${theme.background}; padding: 0; margin: 0;`;
  return `<section style="${articleStyle}">${out.join("")}</section>`;
}
