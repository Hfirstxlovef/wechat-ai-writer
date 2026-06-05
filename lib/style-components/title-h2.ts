import { Theme } from "./types";

/** 左侧粗色条 + 文字 — 当前默认 h2 */
export function renderH2SectionDecorated(inner: string, theme: Theme): string {
  const wrap = `margin: 1.6em 0 0.6em;`;
  const inner1 = `padding-left: 12px; border-left: 4px solid ${theme.primary}; font-size: 19px; font-weight: 700; line-height: 1.4; color: ${theme.text};`;
  return `<section style="${wrap}"><h2 style="${inner1}">${inner}</h2></section>`;
}

let h2Counter = 0;
export function resetH2NumberCounter() {
  h2Counter = 0;
}

/** 圆形数字徽章 + 文字 */
export function renderH2SectionNumberBadge(inner: string, theme: Theme): string {
  h2Counter += 1;
  const n = h2Counter;
  const wrap = `margin: 1.8em 0 0.8em; padding: 0;`;
  const row = `display: inline-block; vertical-align: middle;`;
  const badge = `display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background: ${theme.primary}; color: #fff; font-size: 14px; font-weight: 700; margin-right: 10px; vertical-align: middle;`;
  const title = `display: inline-block; font-size: 19px; font-weight: 700; color: ${theme.text}; line-height: 1.4; vertical-align: middle;`;
  // 整段下还附一条细线
  const rule = `border-top: 1px solid ${theme.primary}; margin: 0.4em 0 0; opacity: 0.3;`;
  return `<section style="${wrap}"><section style="${row}"><span style="${badge}">${n < 10 ? "0" + n : n}</span><h2 style="${title}">${inner}</h2></section><section style="${rule}"></section></section>`;
}

let h2BannerCounter = 0;
export function resetH2BannerCounter() {
  h2BannerCounter = 0;
}

/**
 * 杂志 banner — 模仿"Part 01 + 标题 + 装饰圆点群"。
 * 公众号不支持 flex/grid，用 inline-block + width 百分比凑横向。
 */
export function renderH2SectionBanner(inner: string, theme: Theme): string {
  h2BannerCounter += 1;
  const n = h2BannerCounter;
  const num = n < 10 ? "0" + n : String(n);

  const wrap = `margin: 2em 0 1em;`;
  // 上方小标签 "Part 01"
  const tag = `display: inline-block; padding: 3px 12px; background: ${theme.primary}; color: #fff; font-size: 11px; letter-spacing: 0.18em; font-weight: 600;`;
  // 标题主体 + 右侧 3 个圆点
  const titleRow = `margin-top: 0.5em;`;
  const titleStyle = `display: inline-block; font-size: 20px; font-weight: 700; color: ${theme.text}; margin: 0; line-height: 1.4; vertical-align: middle;`;
  const dotsWrap = `display: inline-block; margin-left: 12px; vertical-align: middle; line-height: 1;`;
  const dot = (op: number) =>
    `display: inline-block; width: 7px; height: 7px; background: ${theme.primary}; opacity: ${op}; margin-right: 4px; vertical-align: middle;`;
  // 底部细色条
  const rule = `border-top: 2px solid ${theme.primary}; margin-top: 0.5em; opacity: 0.85;`;

  return `<section style="${wrap}"><section><span style="${tag}">PART ${num}</span></section><section style="${titleRow}"><h2 style="${titleStyle}">${inner}</h2><span style="${dotsWrap}"><span style="${dot(1)}"></span><span style="${dot(0.55)}"></span><span style="${dot(0.25)}"></span></span></section><section style="${rule}"></section></section>`;
}

