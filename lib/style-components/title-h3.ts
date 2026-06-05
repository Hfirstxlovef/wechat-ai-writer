import { Theme } from "./types";

export function renderH3Classic(inner: string, theme: Theme): string {
  const style = `font-size: 17px; font-weight: 700; line-height: 1.4; margin: 1.4em 0 0.5em; color: ${theme.text};`;
  return `<section><h3 style="${style}">${inner}</h3></section>`;
}

let h3BadgeCounter = 0;
export function resetH3BadgeCounter() {
  h3BadgeCounter = 0;
}

/**
 * 圆形数字徽章 + 文字（类似 ① ② ③，但用 primary 实心圆 + 数字）。
 * 公众号不支持 border-radius 50% 上限稳定，但小尺寸（22px）一般 OK；
 * 兜底：即使丢失圆角，显示为正方形也不破。
 */
export function renderH3NumberBadge(inner: string, theme: Theme): string {
  h3BadgeCounter += 1;
  const n = h3BadgeCounter;
  const num = n < 10 ? String(n) : String(n);

  const wrap = `margin: 1.5em 0 0.6em;`;
  const row = `display: inline-block; vertical-align: middle;`;
  const badge = `display: inline-block; width: 22px; height: 22px; line-height: 22px; text-align: center; background: ${theme.primary}; color: #fff; font-size: 13px; font-weight: 700; margin-right: 8px; vertical-align: middle; border-radius: 11px;`;
  const title = `display: inline-block; font-size: 17px; font-weight: 700; color: ${theme.text}; line-height: 1.4; vertical-align: middle;`;
  return `<section style="${wrap}"><section style="${row}"><span style="${badge}">${num}</span><h3 style="${title}">${inner}</h3></section></section>`;
}

