import type { StyleTheme } from "../style-schema";

/**
 * 所有样式组件共享的类型。
 *
 * 公众号兼容性约束：
 * - 所有样式 inline，无 class/id/<style>/data-*
 * - 不用 linear-gradient / box-shadow / position / float / transform / background-image
 * - 慎用 border-radius（老编辑器丢），圆角用嵌套 section + 背景模拟
 * - inline SVG 会被 strip，装饰只能用 Unicode (❖ ◆ ✦) + 颜色块
 * - <img> 走本地 /uploads/ URL，仅本机预览可见；用户复制到公众号编辑器后须手动重新上传
 */
export type Theme = Required<StyleTheme>;

export interface ComponentContext {
  theme: Theme;
  /** 已经渲染好的 inner HTML（含 inline markdown），可直接插入 */
  inner?: string;
}

/** 简单 escape；renderInline 已经在 inline 处理时 escape 过，这里只用于 props 字段 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
