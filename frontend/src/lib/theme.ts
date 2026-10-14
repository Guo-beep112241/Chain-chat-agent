/**
 * 品牌色的唯一来源。
 *
 * 为什么这里还是字面量：Next 的 metadata API（viewport.themeColor）与
 * manifest.ts 只接受字符串常量，无法引用 CSS 变量。
 * 因此把值集中在这里，并在下方注明必须与 globals.css 的令牌保持一致，
 * 避免两个文件各写一份、改一处漏一处。
 *
 * 对应 globals.css:
 *   --color-accent: #1d4ed8
 *   --color-paper:  #f7f8fa
 */
export const BRAND_COLORS = {
  accent: "#1d4ed8",
  paper: "#f7f8fa",
} as const;
