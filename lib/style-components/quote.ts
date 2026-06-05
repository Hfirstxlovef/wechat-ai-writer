import { Theme } from "./types";

/** 经典左色条 + 浅背景 — 默认 blockquote */
export function renderQuoteClassic(inner: string, theme: Theme): string {
  const wrap = `margin: 1.4em 0;`;
  const box = `padding: 0.9em 1.1em; border-left: 4px solid ${theme.primary}; background: ${theme.quoteBg}; color: ${theme.secondaryText}; font-size: 15px; line-height: 1.85;`;
  return `<section style="${wrap}"><blockquote style="${box}">${inner}</blockquote></section>`;
}

/** 引号样章式：左上角有大引号字符做装饰 */
export function renderQuoteStamp(inner: string, theme: Theme): string {
  const wrap = `margin: 1.6em 0;`;
  // 外层做模拟"卡片"
  const card = `padding: 1.2em 1.2em 1em; background: ${theme.quoteBg}; border-top: 3px solid ${theme.primary};`;
  const mark = `display: block; font-size: 28px; line-height: 1; color: ${theme.accentDecorative}; font-family: Georgia, serif; margin-bottom: 0.1em;`;
  const body = `margin: 0; padding: 0; color: ${theme.secondaryText}; font-size: 15px; line-height: 1.85; border: 0; background: transparent;`;
  return `<section style="${wrap}"><section style="${card}"><section style="${mark}">“</section><blockquote style="${body}">${inner}</blockquote></section></section>`;
}

/**
 * 纯浅色底卡片（无左竖条）—— 模仿杂志/秀米里常见"染色卡片"。
 * 整段引文都装在一个浅 primary 底色的卡片里，左右内缩，padding 充足，
 * 行高拉宽以提升阅读舒适。
 */
export function renderQuoteTinted(inner: string, theme: Theme): string {
  const wrap = `margin: 1.6em 0;`;
  const card = `padding: 1.1em 1.3em; background: ${theme.quoteBg};`;
  const body = `margin: 0; padding: 0; color: ${theme.text}; font-size: 15px; line-height: 1.9; border: 0; background: transparent;`;
  return `<section style="${wrap}"><section style="${card}"><blockquote style="${body}">${inner}</blockquote></section></section>`;
}

