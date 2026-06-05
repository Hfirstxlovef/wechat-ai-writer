import { escapeHtml, Theme } from "./types";

export interface CalloutBoxProps {
  /** 小标签 / 类型，如 "重点" "提示" "关键" */
  label?: string;
  /** 主要文本内容（纯文本，自动 escape） */
  body?: string;
}

/**
 * 强调框 — 用嵌套 section + 边框模拟卡片，标签做色块。
 */
export function renderCalloutBox(props: CalloutBoxProps, theme: Theme): string {
  const label = escapeHtml(props.label ?? "重点");
  const body = escapeHtml(props.body ?? "");
  if (!body) return "";

  const wrap = `margin: 1.6em 0;`;
  const card = `border-left: 4px solid ${theme.primary}; background: ${theme.quoteBg}; padding: 0.9em 1.1em;`;
  const labelStyle = `display: inline-block; padding: 2px 10px; background: ${theme.primary}; color: #fff; font-size: 12px; letter-spacing: 0.1em; margin-bottom: 0.6em;`;
  const bodyStyle = `font-size: 15px; line-height: 1.85; color: ${theme.text}; margin: 0;`;

  return `<section style="${wrap}"><section style="${card}"><span style="${labelStyle}">${label}</span><section style="${bodyStyle}">${body}</section></section></section>`;
}
