import { escapeHtml, Theme } from "./types";

/** 标准带边框图片 */
export function renderImgFramed(opts: { url: string; alt?: string }, theme: Theme): string {
  const url = opts.url;
  const alt = escapeHtml(opts.alt ?? "");
  const wrap = `margin: 1.4em 0; text-align: center;`;
  const img = `max-width: 100%; height: auto; display: block; margin: 0 auto; border: 1px solid #E8E8E8;`;
  return `<section style="${wrap}"><img src="${url}" alt="${alt}" style="${img}" /></section>`;
}

/** 强调式：上下加 accent 色细条 */
export function renderImgSpotlight(opts: { url: string; alt?: string; caption?: string }, theme: Theme): string {
  const url = opts.url;
  const alt = escapeHtml(opts.alt ?? "");
  const caption = opts.caption ? escapeHtml(opts.caption) : "";
  const wrap = `margin: 1.8em 0; text-align: center;`;
  const top = `border-top: 2px solid ${theme.primary}; width: 40px; margin: 0 auto 0.6em; height: 0;`;
  const img = `max-width: 100%; height: auto; display: block; margin: 0 auto;`;
  const cap = caption
    ? `<section style="font-size: 13px; color: ${theme.secondaryText}; margin-top: 0.6em;">${caption}</section>`
    : "";
  const bottom = `border-top: 2px solid ${theme.primary}; width: 40px; margin: 0.6em auto 0; height: 0;`;
  return `<section style="${wrap}"><section style="${top}"></section><img src="${url}" alt="${alt}" style="${img}" />${cap}<section style="${bottom}"></section></section>`;
}
