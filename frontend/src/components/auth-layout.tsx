import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

/**
 * 三个认证页共用的外壳：左边品牌区，右边表单区。
 *
 * 品牌区为什么放「采购底线样张」而不是插画或截图：
 *   这个产品最独有、最难被抄的东西就是「规则写在明面上」。放一张插画，用户读完
 *   仍然不知道它是干什么的；放一张真实形态的底线表，用户在第一屏就明白了它的
 *   工作方式——而且这张表不需要插画师，纯排版就成立，跟整站「文档化」的气质一致。
 *
 * 窄屏：品牌区整体收起（只留一行品牌条），表单优先占满首屏——
 *   认证页的第一要务是让人把表填完，不是看宣传。
 */
const RULES = [
  { label: "目标价", value: "¥40.00" },
  { label: "硬性价格上限", value: "¥43.00", hard: true },
  { label: "最高起订量", value: "1000 件" },
  { label: "最长交期", value: "15 天" },
  { label: "最短账期", value: "30 天" },
  { label: "转人工分数", value: "80" },
];

export function AuthLayout({
  asideTitle,
  asideBody,
  children,
}: {
  asideTitle: string;
  asideBody: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[var(--paper)]">
      <div className="ambient-grid anim-fade pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16 lg:px-6 lg:py-14 xl:gap-20">
        {/* 品牌区（≥lg 才出现） */}
        <section className="hidden lg:block">
          <Link href="/" className="anim-rise inline-flex items-center gap-3">
            <BrandMark />
            <span className="text-lg font-bold tracking-tight">
              链谈 <span className="text-[var(--accent-strong)]">Agent</span>
            </span>
          </Link>

          <h1 className="anim-rise anim-d1 mt-8 text-[32px] font-bold leading-[1.25] tracking-tight">{asideTitle}</h1>
          <p className="anim-rise anim-d2 mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">{asideBody}</p>

          <div className="anim-rise anim-d3 mt-8 max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
              <span className="text-xs font-semibold text-[var(--muted)]">采购底线 · 示例（收纳盒 / 商品 A-2307）</span>
              <span className="text-[11px] text-[var(--muted)]">按商品配置</span>
            </div>
            <dl className="divide-y divide-[var(--line)]">
              {RULES.map((rule) => (
                <div key={rule.label} className="flex items-center justify-between px-5 py-2.5">
                  <dt className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    {rule.label}
                    {rule.hard && (
                      <span className="rounded-full bg-[var(--accent-faint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-strong)]">
                        硬性
                      </span>
                    )}
                  </dt>
                  <dd className="tnum text-sm font-semibold">{rule.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="anim-rise anim-d4 mt-4 max-w-lg text-xs leading-6 text-[var(--muted)]">
            以上阈值全部由你自己配置，可按商品单独覆盖。触碰任一项，程序当场拦截并说明原因，不交给模型判断。
          </p>
        </section>

        {/* 表单区 */}
        <main className="w-full">
          {/* 窄屏品牌条：品牌区收起后，这里承担「这是哪、怎么回去」 */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandMark />
              <span className="font-bold tracking-tight">
                链谈 <span className="text-[var(--accent-strong)]">Agent</span>
              </span>
            </Link>
            <Link href="/" className="text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink)]">
              返回首页
            </Link>
          </div>

          <div className="anim-slide-right overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
