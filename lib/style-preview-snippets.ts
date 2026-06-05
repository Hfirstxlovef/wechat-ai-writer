/**
 * 给「美化」控制台用的迷你预览片段。
 * 不调 API，纯函数 — 客户端组件可直接 import 调用。
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
} from "./style-components";
import type { Theme } from "./style-components/types";
import {
  DEFAULT_THEME,
  StyleComponents,
  StyleOverride,
  StyleTheme,
} from "./style-schema";

/** 把可能不完整的 theme merge 到默认上，得到 Required<StyleTheme>。 */
export function resolveTheme(t: Partial<StyleTheme> | undefined | null): Theme {
  return { ...DEFAULT_THEME, ...(t ?? {}) } as Theme;
}

const SAMPLE_TEXT = {
  h1: "示例标题",
  h2: "示例章节标题",
  h3: "小节标题",
  blockquote: "这是一段引用文字，用来展示该样式的视觉效果。",
};

// 1px 透明 svg 作为图片占位（不依赖外网，避免预览拉远图卡）
const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#E5E7EB"/><text x="160" y="95" font-family="sans-serif" font-size="16" fill="#9CA3AF" text-anchor="middle">示例配图</text></svg>`
  );

/** 预览前重置 banner/badge 计数器，让每次预览都从 1/01 开始。 */
function resetCounters() {
  resetH2NumberCounter();
  resetH2BannerCounter();
  resetH3BadgeCounter();
}

export function previewH1(variant: string, theme: Theme): string {
  resetCounters();
  if (variant === "title-ornamental") return renderH1Ornamental(SAMPLE_TEXT.h1, theme);
  return renderH1Classic(SAMPLE_TEXT.h1, theme);
}

export function previewH2(variant: string, theme: Theme): string {
  resetCounters();
  if (variant === "section-banner") return renderH2SectionBanner(SAMPLE_TEXT.h2, theme);
  if (variant === "section-number-badge")
    return renderH2SectionNumberBadge(SAMPLE_TEXT.h2, theme);
  return renderH2SectionDecorated(SAMPLE_TEXT.h2, theme);
}

export function previewH3(variant: string, theme: Theme): string {
  resetCounters();
  if (variant === "h3-number-badge") return renderH3NumberBadge(SAMPLE_TEXT.h3, theme);
  return renderH3Classic(SAMPLE_TEXT.h3, theme);
}

export function previewBlockquote(variant: string, theme: Theme): string {
  if (variant === "quote-card-stamp") return renderQuoteStamp(SAMPLE_TEXT.blockquote, theme);
  if (variant === "quote-card-tinted") return renderQuoteTinted(SAMPLE_TEXT.blockquote, theme);
  return renderQuoteClassic(SAMPLE_TEXT.blockquote, theme);
}

export function previewDivider(variant: string, theme: Theme): string {
  if (variant === "hr-ornamental") return renderHrOrnamental(theme);
  if (variant === "hr-dashed-dots") return renderHrDashedDots(theme);
  return renderHrLine(theme);
}

export function previewImg(variant: string, theme: Theme): string {
  if (variant === "img-spotlight")
    return renderImgSpotlight({ url: PLACEHOLDER_IMG, alt: "示例", caption: "配图说明" }, theme);
  return renderImgFramed({ url: PLACEHOLDER_IMG, alt: "示例" }, theme);
}

/**
 * articleWrapper 是顶层「整篇风格」，单独显示成一个状态卡。
 * plain    → 显示"无外框，正文从纸张边缘开始"
 * bordered → 模拟整篇被蓝色细边框包住的状态
 */
export function previewArticleWrapper(variant: string, theme: Theme): string {
  if (variant === "bordered") {
    const outer = `padding: 14px 12px; border: 1.5px solid ${theme.primary}; background: ${theme.background};`;
    const fakeLine1 = `height: 8px; background: ${theme.primary}; opacity: 0.18; margin: 0 0 6px;`;
    const fakeLine2 = `height: 6px; background: ${theme.primary}; opacity: 0.1; margin: 0 0 6px; width: 80%;`;
    const fakeLine3 = `height: 6px; background: ${theme.primary}; opacity: 0.1; margin: 0; width: 60%;`;
    return `<section style="${outer}"><section style="${fakeLine1}"></section><section style="${fakeLine2}"></section><section style="${fakeLine3}"></section></section>`;
  }
  // plain
  const fakeLine1 = `height: 8px; background: #D1D5DB; margin: 0 0 6px;`;
  const fakeLine2 = `height: 6px; background: #E5E7EB; margin: 0 0 6px; width: 80%;`;
  const fakeLine3 = `height: 6px; background: #E5E7EB; margin: 0; width: 60%;`;
  return `<section style="padding: 14px 12px; background: ${theme.background};"><section style="${fakeLine1}"></section><section style="${fakeLine2}"></section><section style="${fakeLine3}"></section></section>`;
}

export function previewOverride(o: StyleOverride, theme: Theme): string {
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

export function previewComponent(
  type: keyof StyleComponents,
  variant: string,
  theme: Theme
): string {
  switch (type) {
    case "h1":
      return previewH1(variant, theme);
    case "h2":
      return previewH2(variant, theme);
    case "h3":
      return previewH3(variant, theme);
    case "blockquote":
      return previewBlockquote(variant, theme);
    case "divider":
      return previewDivider(variant, theme);
    case "img":
      return previewImg(variant, theme);
    case "articleWrapper":
      return previewArticleWrapper(variant, theme);
    default:
      return "";
  }
}
