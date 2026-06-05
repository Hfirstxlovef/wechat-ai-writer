import { Theme } from "./types";

/** 一条简单细线 */
export function renderHrLine(theme: Theme): string {
  // <hr> 在老版编辑器易丢，改用 <section border-top>
  const style = `border-top: 1px solid #E5E5E5; margin: 2em 0; height: 0; line-height: 0;`;
  return `<section style="${style}"></section>`;
}

/** Unicode 装饰居中分隔 */
export function renderHrOrnamental(theme: Theme): string {
  const wrap = `text-align: center; margin: 2em 0; color: ${theme.accentDecorative}; font-size: 14px; letter-spacing: 0.4em; line-height: 1;`;
  return `<section style="${wrap}">◆ ❖ ◆</section>`;
}

/**
 * 虚线 + 中央 3 圆点。模拟参考样文里的章节间分隔。
 * 公众号兼容性：用左右两条 dashed border + 中间 3 个 inline-block 圆点。
 * 不依赖 flex，用 text-align: center 居中。
 */
export function renderHrDashedDots(theme: Theme): string {
  const wrap = `text-align: center; margin: 2em 0; line-height: 0;`;
  // 用左右两条短虚线 + 中间 3 个圆点
  // 单独的虚线段：用 inline-block + dashed border
  const line = `display: inline-block; width: 30%; vertical-align: middle; border-top: 1px dashed ${theme.primary}; opacity: 0.4;`;
  const dotsWrap = `display: inline-block; padding: 0 12px; vertical-align: middle;`;
  const dotMain = `display: inline-block; width: 8px; height: 8px; background: ${theme.primary}; margin: 0 3px; vertical-align: middle; border-radius: 4px;`;
  const dotSide = `display: inline-block; width: 6px; height: 6px; background: ${theme.primary}; opacity: 0.4; margin: 0 3px; vertical-align: middle; border-radius: 3px;`;
  return `<section style="${wrap}"><span style="${line}"></span><span style="${dotsWrap}"><span style="${dotSide}"></span><span style="${dotMain}"></span><span style="${dotSide}"></span></span><span style="${line}"></span></section>`;
}

