import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  ClipboardCheck,
  FileBadge2,
  Handshake,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ProductFilm } from "@/components/product-film";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "链谈 Agent | 供应商智能接待、分层谈判与筛选",
  description:
    "为中小采购商家自动接待、筛选并分层供应商的谈判系统。大模型负责理解和表达，底线、评分和决策由程序完成。",
  alternates: { canonical: "/" },
};

const flow = [
  {
    step: "01",
    icon: Bot,
    title: "自动接待",
    body: "供应商上门提交报价、起订量、账期与资质后，AI 立即开始洽谈，不必等你在线。",
  },
  {
    step: "02",
    icon: ShieldCheck,
    title: "底线校验",
    body: "价格上限、起订量、交期、账期、必备资质逐项硬性核对，触碰底线当场说明，不靠模型自觉。",
  },
  {
    step: "03",
    icon: Handshake,
    title: "分层转人工",
    body: "加权评分达到阈值就停止 AI 自动回复并提醒你接管，把精力只花在真正值得谈的供应商上。",
  },
];

const dimensions = [
  { label: "价格竞争力", weight: 30 },
  { label: "起订量", weight: 15 },
  { label: "资质完整度", weight: 20 },
  { label: "交期", weight: 10 },
  { label: "账期", weight: 10 },
  { label: "区域匹配", weight: 5 },
  { label: "沟通配合度", weight: 10 },
];

const capabilities = [
  {
    icon: ClipboardCheck,
    title: "采购底线可配置",
    body: "每个商品单独设定目标价、硬性价格上限、最高起订量、最长交期与账期，以及转人工分数。",
  },
  {
    icon: LineChart,
    title: "评分口径透明",
    body: "七维加权满分，权重由你自己分配；硬性规则优先于评分，任一硬指标触线即淘汰。",
  },
  {
    icon: FileBadge2,
    title: "资质自动初筛",
    body: "营业执照经 OCR 识别并与填写企业名比对，不一致或无法识别时转人工核验，全程留痕。",
  },
  {
    icon: BadgeCheck,
    title: "多商家数据隔离",
    body: "每个商家账号独立存储，商品、规则、谈判记录与资质文件按账号隔离，互不可见。",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-30 bg-[var(--surface)] shadow-[var(--shadow-card)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
          {/* shrink-0 + nowrap：窄屏上品牌名会被 flex 压到换行（「链谈」上一行、「Agent」下一行），
              这是最不该动的元素，宁可让右侧按钮先让位。 */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <BrandMark />
            <span className="whitespace-nowrap text-lg font-bold tracking-tight">
              链谈 <span className="text-[var(--accent-strong)]">Agent</span>
            </span>
          </Link>
          <nav className="ml-4 hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
            <a className="transition-colors hover:text-[var(--ink)]" href="#flow">工作流程</a>
            <a className="transition-colors hover:text-[var(--ink)]" href="#capability">产品能力</a>
            <a className="transition-colors hover:text-[var(--ink)]" href="#supplier">供应商入口</a>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* 360px 以下才收起供应商入口：更窄的屏幕（如 320px 的老机型）放不下两个按钮，
                硬塞会把品牌名挤到换行。供应商入口在正文和页脚仍有可达路径。 */}
            <Link href="/supplier/login" className="hidden min-[360px]:block">
              <Button variant="ghost" size="sm">我是供应商</Button>
            </Link>
            <Link href="/login">
              <Button variant="accent" size="sm">商家登录</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero —— 左栏文案按 60ms 逐项入场，右栏是产品影片（首屏第二顺位出现） */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="anim-rise inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
              <Sparkles className="size-3.5 text-[var(--accent-strong)]" />
              面向中小微采购商家
            </div>
            <h1 className="anim-rise anim-d1 mt-5 text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">
              把时间留给
              <br />
              <span className="text-[var(--accent-strong)]">真正值得谈</span>的供应商
            </h1>
            <p className="anim-rise anim-d2 mt-5 max-w-xl text-base leading-8 text-[var(--muted)]">
              链谈 Agent 自动接待上门的供应商，先按你的采购底线硬性筛选，再按七维权重打分分层。
              达到标准的才提醒你接手，其余由 AI 继续议价。
            </p>
            <p className="anim-rise anim-d3 mt-4 max-w-xl rounded-[var(--radius-control)] border-l-2 border-[var(--accent)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--ink)]">
              <span className="font-semibold">核心原则：</span>
              大模型负责理解和表达，<span className="font-semibold text-[var(--accent-strong)]">底线、评分和决策由程序完成</span>。
            </p>
            <div className="anim-rise anim-d4 mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button variant="accent" size="lg">
                  免费创建商家账号
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">已有账号，直接登录</Button>
              </Link>
            </div>
            <p className="anim-rise anim-d5 mt-4 text-xs text-[var(--muted)]">
              演示环境：注册即用，验证码为演示码，不发送真实短信。
            </p>
          </div>

          <div className="anim-rise anim-d2">
            <ProductFilm />
          </div>
        </div>
      </section>

      {/* 工作流程 */}
      <section id="flow" className="scroll-mt-20 border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">它替你做了什么</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              每一步的判断都由程序给出，AI 不参与决策，只负责把结论讲清楚。
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {flow.map((item, index) => (
              <Reveal key={item.step} delay={index * 80}>
                <Card className="lift h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-[var(--radius-control)] bg-[var(--accent-faint)] text-[var(--accent-strong)]">
                        <item.icon className="size-5" />
                      </span>
                      <span className="tnum text-sm font-bold text-[var(--muted)]">{item.step}</span>
                    </div>
                    <h3 className="mt-5 font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.body}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 产品能力 */}
      <section id="capability" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        {/* 左栏是真实数据（七维权重），右栏是四张说明卡：给数据多留一点宽度，
            窄屏下 7 档权重的差异才读得出来——原来的 0.9/1.1 恰好把这个顺序搞反了。 */}
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <div>
            <Reveal>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">决策规则写在明面上</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                模型会理解供应商在说什么，但「给谁报价机会、给谁转人工、谁直接淘汰」由一套确定的规则计算。
                你可以随时调整权重，结果立刻跟着变。
              </p>
            </Reveal>
            <Reveal delay={80}>
              <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] p-5">
                <div className="text-xs font-semibold text-[var(--muted)]">默认七维满分（可按商品自定义）</div>
                <div className="mt-4 space-y-3">
                  {dimensions.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-sm">{item.label}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--paper-deep)]">
                        <span
                          className="block h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${(item.weight / 30) * 100}%` }}
                        />
                      </span>
                      <span className="tnum w-8 shrink-0 text-right text-sm font-semibold">{item.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {capabilities.map((item, index) => (
              <Reveal key={item.title} delay={index * 80}>
                <Card className="lift h-full">
                  <CardContent className="p-5">
                    <span className="grid size-9 place-items-center rounded-[var(--radius-chip)] bg-[var(--paper)] text-[var(--accent-strong)]">
                      <item.icon className="size-4.5" />
                    </span>
                    <h3 className="mt-4 text-sm font-bold">{item.title}</h3>
                    <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{item.body}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 供应商入口 */}
      <section id="supplier" className="scroll-mt-20 border-y border-[var(--line)] bg-[var(--surface)]">
        <Reveal className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--ink)] text-white">
              <Building2 className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight">我是供应商，想供货</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--muted)]">
                手机号登录后填写报价、起订量、账期与资质，提交前就能看到是否满足采购底线，通过后直接进入 AI 洽谈。
              </p>
            </div>
          </div>
          <Link href="/supplier/login" className="shrink-0">
            <Button variant="accent" size="lg">
              进入供应商入口
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </Reveal>
      </section>

      {/* 页脚 */}
      <footer className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark />
              <span className="font-bold tracking-tight">
                链谈 <span className="text-[var(--accent-strong)]">Agent</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-6 text-[var(--muted)]">
              面向中小微采购商家的供应商智能接待、分层谈判和筛选系统。
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div>
              <div className="font-semibold">产品</div>
              <div className="mt-3 space-y-2 text-[var(--muted)]">
                <Link className="block transition-colors hover:text-[var(--ink)]" href="/register">创建商家账号</Link>
                <Link className="block transition-colors hover:text-[var(--ink)]" href="/login">商家登录</Link>
                <Link className="block transition-colors hover:text-[var(--ink)]" href="/supplier/login">供应商登录</Link>
              </div>
            </div>
            <div>
              <div className="font-semibold">条款</div>
              <div className="mt-3 space-y-2 text-[var(--muted)]">
                <Link className="block transition-colors hover:text-[var(--ink)]" href="/terms">平台须知</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--line)] pt-6 text-xs text-[var(--muted)] sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} 链谈 Agent · 演示环境</span>
          <span>备案号 / 联系方式待上线前补充</span>
        </div>
      </footer>
    </div>
  );
}
