import { escapeHtml, Theme } from "./types";

export interface OpeningCardProps {
  lead?: string;
  tagline?: string;
}

/**
 * 开头条 — 类似公众号常见的「点击蓝字 · 关注我们」+ 一句导语。
 * 用嵌套 section + 颜色块模拟，不依赖 border-radius / gradient。
 */
export function renderOpeningCard(props: OpeningCardProps, theme: Theme): string {
  const lead = escapeHtml(props.lead ?? "点击蓝字 · 关注我们");
  const tagline = props.tagline ? escapeHtml(props.tagline) : "";

  const wrap = `margin: 1em 0 1.6em;`;
  // 横向小色块装饰条 + 一行文字
  const head = `text-align: center;`;
  const headInner = `display: inline-block; padding: 4px 14px; background: ${theme.primary}; color: #fff; font-size: 12px; letter-spacing: 0.15em;`;
  const taglineStyle = tagline
    ? `margin-top: 0.8em; text-align: center; font-size: 14px; color: ${theme.secondaryText}; line-height: 1.7;`
    : "";
  const taglineBlock = tagline ? `<section style="${taglineStyle}">${tagline}</section>` : "";

  return `<section style="${wrap}"><section style="${head}"><span style="${headInner}">${lead}</span></section>${taglineBlock}</section>`;
}
