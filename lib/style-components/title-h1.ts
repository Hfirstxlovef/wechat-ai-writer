import { Theme } from "./types";

/** 朴素居中粗体标题 */
export function renderH1Classic(inner: string, theme: Theme): string {
  const style = `font-size: 22px; font-weight: 700; line-height: 1.4; margin: 1.6em 0 0.8em; color: ${theme.text}; text-align: center;`;
  return `<section><h1 style="${style}">${inner}</h1></section>`;
}

/** 带上下装饰条的标题（用 Unicode + 颜色块） */
export function renderH1Ornamental(inner: string, theme: Theme): string {
  const wrap = `margin: 1.8em 0 1em; text-align: center;`;
  const topDeco = `display: block; color: ${theme.accentDecorative}; font-size: 14px; letter-spacing: 0.6em; margin-bottom: 0.4em;`;
  const title = `font-size: 22px; font-weight: 700; line-height: 1.4; color: ${theme.text}; margin: 0;`;
  const bottomDeco = `display: block; color: ${theme.accentDecorative}; font-size: 14px; letter-spacing: 0.6em; margin-top: 0.4em;`;
  return `<section style="${wrap}"><section style="${topDeco}">❖ ❖ ❖</section><h1 style="${title}">${inner}</h1><section style="${bottomDeco}">❖ ❖ ❖</section></section>`;
}
