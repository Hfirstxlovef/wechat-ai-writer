import { escapeHtml, Theme } from "./types";

export interface EndingCardProps {
  /** 例如 "感谢阅读" */
  title?: string;
  /** 一段副文，如 "若觉得有用，欢迎转发与点赞" */
  body?: string;
  /** 二级 CTA，如 "—— END ——" */
  signoff?: string;
}

/**
 * 结尾卡 — 段落上方加细分割条，下方"END"风格小字。
 */
export function renderEndingCard(props: EndingCardProps, theme: Theme): string {
  const title = escapeHtml(props.title ?? "感谢阅读");
  const body = props.body ? escapeHtml(props.body) : "若觉得有用，欢迎转发给朋友。";
  const signoff = escapeHtml(props.signoff ?? "—— END ——");

  const wrap = `margin: 2.4em 0 1em;`;
  const topDeco = `text-align: center; color: ${theme.accentDecorative}; font-size: 14px; letter-spacing: 0.4em; margin-bottom: 0.6em; line-height: 1;`;
  const titleStyle = `text-align: center; font-size: 17px; font-weight: 700; color: ${theme.text}; margin: 0 0 0.4em;`;
  const bodyStyle = `text-align: center; font-size: 14px; color: ${theme.secondaryText}; line-height: 1.8; margin: 0 0 1em;`;
  const signoffStyle = `text-align: center; color: ${theme.secondaryText}; font-size: 12px; letter-spacing: 0.3em; margin-top: 0.8em;`;

  return `<section style="${wrap}"><section style="${topDeco}">◆ ❖ ◆</section><section style="${titleStyle}">${title}</section><section style="${bodyStyle}">${escapeHtml(body)}</section><section style="${signoffStyle}">${signoff}</section></section>`;
}
