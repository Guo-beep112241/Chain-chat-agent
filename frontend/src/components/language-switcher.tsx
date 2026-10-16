"use client";

import { Languages } from "lucide-react";
import { LOCALE_FULL_NAMES, LOCALE_LABELS, LOCALES, htmlLang, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

/**
 * 中英语言切换按钮。
 *
 * 两种形态，按宽度切换（纯 CSS，不用 JS 判断，避免首帧闪一下）：
 *   ≥420px：分段控件，两个语言并排，当前语言高亮——一眼看出「现在是什么、还能切到什么」。
 *   <420px：收成一个按钮，标签是**要切过去的那个语言**（中文界面显示 EN，英文界面显示 中文）。
 *
 * 为什么窄屏要收：英文界面下品牌名「LianTan Agent」比中文宽 34px，
 * 顶栏还要放主 CTA，320–419px 放不下「分段控件 + CTA」。收成一个按钮后，
 * 最窄的 320px 老机型也不会横向溢出（溢出会让手机把整页缩小，比少个按钮更糟）。
 *
 * 视觉沿用站点既有令牌：外框 --line、底 --surface、选中态 --accent-strong
 * （与 Button 的 accent 变体同色，白字 5.17:1 达标）。
 *
 * 切换期间禁用：过渡层已经在跑，中途再点只会让 cookie 与正在加载的内容对不上。
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, d, switching, setLocale } = useI18n();
  const target: Locale = locale === "en" ? "zh" : "en";

  const shell = cn(
    "flex shrink-0 items-center gap-0.5 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-0.5",
    className,
  );
  const segment = "h-6 rounded-[calc(var(--radius-control)-3px)] px-1.5 text-[11px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1";
  const idle = "text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]";
  const active = "bg-[var(--accent-strong)] text-white";

  return (
    <div role="group" aria-label={d.common.language.label} className={shell}>
      {/* 窄屏：单个按钮，标签是目标语言。
          320–359px 连这个短标签都放不下（英文界面下品牌名 + 主 CTA 已占满一行），
          于是只留一个地球图标，名称由 aria-label / title 提供。 */}
      <button
        type="button"
        lang={htmlLang(target)}
        aria-label={format(d.common.language.switchTo, { target: LOCALE_FULL_NAMES[target] })}
        title={format(d.common.language.switchTo, { target: LOCALE_FULL_NAMES[target] })}
        disabled={switching}
        onClick={() => setLocale(target)}
        className={cn(segment, idle, "min-[420px]:hidden", switching && "cursor-default opacity-60")}
      >
        <Languages className="size-3.5 min-[360px]:hidden" aria-hidden="true" />
        <span className="hidden min-[360px]:inline">{LOCALE_LABELS[target]}</span>
      </button>

      {/* ≥420px：分段控件 */}
      <div className="hidden items-center gap-0.5 min-[420px]:flex">
        {LOCALES.map((option: Locale) => {
          const isActive = option === locale;
          return (
            <button
              key={option}
              type="button"
              lang={htmlLang(option)}
              aria-pressed={isActive}
              disabled={switching}
              title={format(d.common.language.switchTo, { target: LOCALE_FULL_NAMES[option] })}
              onClick={() => setLocale(option)}
              className={cn(segment, isActive ? active : idle, switching && "cursor-default opacity-60")}
            >
              {LOCALE_LABELS[option]}
            </button>
          );
        })}
      </div>

      {/* 图标只在 ≥sm 出现：它是「这里能切语言」的提示，不是必需信息，窄屏优先让位给文字。 */}
      <Languages className="mx-1 hidden size-3.5 text-[var(--muted)] sm:block" aria-hidden="true" />
    </div>
  );
}
