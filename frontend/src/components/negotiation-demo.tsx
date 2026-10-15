"use client";

import * as React from "react";
import { BadgeCheck, Bell, Bot, Check, CircleCheck, FileBadge2, Handshake, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================================================
 * 首页产品影片（1280×960 定尺舞台）
 * ——
 * 为什么是一段「时间的纯函数」而不是几张手绘截图：
 *   1. 首页要放动态演示，而视频必须能逐帧录制，所以每一帧都得能被时间唯一确定。
 *      本文件里**没有一处 CSS 动画 / transition**——位移、透明度、进度条、数字
 *      全部由 time 算出。同一个 time 永远得到同一帧，录制才可复现、才能重跑。
 *   2. 同一个组件既是影片的源，也能在任意时刻定格成静态帧（减少动态效果用户的
 *      降级画面就是从这里取的），两者不会随改动而漂移。
 *
 * 影片讲什么（严格照产品的真实决策链路，不编造产品做不到的事）：
 *   01 自动接待 → 02 底线校验全部通过 → 03 首次评分 62 未达阈值，AI 继续议价
 *   → 供应商让步后**重新校验**，62 → 86 达标 → 04 分层转人工
 *   注意：硬性底线一旦触碰是「立即礼貌结束」而不是继续谈，所以这里不能为了
 *   戏剧性演「报价超上限还被压价成功」——那会宣传一个产品并不具备的行为。
 * ============================================================================ */

/** 影片时长（秒）。改这里要同步 build-demo-video.mjs 的 --poster-at。 */
export const DEMO_SECONDS = 16.2;

/** 五幕的起点（秒）：顶部进度轨、场景位移、脚本取帧共用这一份时间轴。 */
const SCENE = { reception: 0, bottomline: 2.8, scoring: 6.6, recheck: 10, handoff: 13.2 } as const;

const RAIL = [
  { step: "01", label: "自动接待" },
  { step: "02", label: "底线校验" },
  { step: "03", label: "分层转人工" },
] as const;

const SUPPLIER = { name: "东莞恒达五金", contact: "陈经理" };

const QUOTE = [
  { label: "报价", value: "¥42.50", unit: "/ 件" },
  { label: "起订量", value: "800", unit: "件" },
  { label: "交期", value: "12", unit: "天" },
  { label: "账期", value: "30", unit: "天" },
];

/** 硬性底线：与首页「采购底线可配置」一一对应，任一触线即当场说明。 */
const BOTTOM_LINES = [
  { label: "报价", rule: "不高于硬性价格上限 ¥43.00", value: "¥42.50" },
  { label: "起订量", rule: "不高于硬性上限 1000 件", value: "800 件" },
  { label: "交期", rule: "不超过 15 天", value: "12 天" },
  { label: "账期", rule: "不低于 30 天", value: "30 天" },
  { label: "必备资质", rule: "营业执照等文件已上传", value: "已核验" },
];

/**
 * 七维加权：low 是首次评分（合计 62，未达阈值），high 是供应商让步后重算的分
 * （合计 86，达标）。两组都必须等于大屏总分，否则影片自己就打脸「评分口径透明」。
 * 议价谈的是起订量、账期与价格——哪几维变了一目了然。
 */
const DIMENSIONS = [
  { label: "价格竞争力", low: 20, high: 27, max: 30 },
  { label: "起订量", low: 7, high: 13, max: 15 },
  { label: "资质完整度", low: 20, high: 20, max: 20 },
  { label: "交期", low: 6, high: 8, max: 10 },
  { label: "账期", low: 4, high: 8, max: 10 },
  { label: "区域匹配", low: 2, high: 3, max: 5 },
  { label: "沟通配合度", low: 3, high: 7, max: 10 },
];
const SCORE_LOW = DIMENSIONS.reduce((sum, item) => sum + item.low, 0);
const SCORE_HIGH = DIMENSIONS.reduce((sum, item) => sum + item.high, 0);
const THRESHOLD = 80;

const DELTAS = [
  { label: "报价", from: "¥42.50", to: "¥41.80" },
  { label: "起订量", from: "800 件", to: "500 件" },
  { label: "账期", from: "30 天", to: "45 天" },
];

/* ------------------------------ 时间工具 ------------------------------ */

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/** 分段进度：把绝对时间切成「第 X 秒到第 Y 秒之间从 0 走到 1」，越界即夹住。 */
function seg(time: number, start: number, end: number, ease: (p: number) => number = easeOut) {
  if (end <= start) return time >= end ? 1 : 0;
  return ease(clamp01((time - start) / (end - start)));
}

/** 入场：12px 位移 + 淡入，与全站 rise 动效同一套手感。 */
function enter(progress: number, shift = 12): React.CSSProperties {
  return { opacity: progress, transform: `translateY(${(1 - progress) * shift}px)` };
}

/* ------------------------------ 零件 ------------------------------ */

function FilmBrandMark() {
  return (
    <span className="relative grid size-11 place-items-center rounded-[14px] bg-[var(--ink)]" aria-hidden="true">
      <span className="absolute left-[11px] top-[11px] size-[9px] rounded-full border-2 border-[var(--accent)]" />
      <span className="absolute bottom-[11px] right-[11px] size-[9px] rounded-full border-2 border-white" />
      <span className="h-px w-5 rotate-45 bg-white/70" />
    </span>
  );
}

/** 三点「正在输入」。相位由 time 推导，因此录制时同样可复现。 */
function TypingDots({ time, tone }: { time: number; tone: "ink" | "accent" }) {
  return (
    <span className="inline-flex items-center gap-[7px]" aria-hidden="true">
      {[0, 1, 2].map((index) => {
        const wave = 0.5 + 0.5 * Math.sin((time * 5.2 - index * 0.75) * Math.PI);
        return (
          <span
            key={index}
            className="inline-block rounded-full"
            style={{
              width: 9,
              height: 9,
              background: tone === "ink" ? "var(--muted)" : "var(--accent)",
              opacity: 0.3 + 0.7 * wave,
              transform: `translateY(${-2.5 * wave}px)`,
            }}
          />
        );
      })}
    </span>
  );
}

/** 顶部进度轨：三幕的骨架，始终可见，让「现在讲到哪一步」一眼可读。 */
function Rail({ time }: { time: number }) {
  const active = time < SCENE.bottomline ? 0 : time < SCENE.handoff ? 1 : 2;
  const links = [
    seg(time, SCENE.bottomline - 0.6, SCENE.bottomline + 0.5),
    seg(time, SCENE.handoff - 0.6, SCENE.handoff + 0.5),
  ];

  return (
    <div className="flex items-center gap-5 border-b border-[var(--line)] px-12 py-6">
      {RAIL.map((item, index) => (
        <React.Fragment key={item.step}>
          {index > 0 && (
            <span className="relative h-px flex-1 bg-[var(--line)]">
              <span className="absolute inset-y-0 left-0 bg-[var(--accent)]" style={{ width: `${links[index - 1] * 100}%` }} />
            </span>
          )}
          <span className="flex items-center gap-3">
            <span
              className={cn(
                "tnum grid size-8 place-items-center rounded-full text-[15px] font-bold",
                index === active
                  ? "bg-[var(--accent)] text-white"
                  : index < active
                    ? "bg-[var(--accent-faint)] text-[var(--accent-strong)]"
                    : "bg-[var(--paper-deep)] text-[var(--muted)]",
              )}
            >
              {index < active ? <Check className="size-4" /> : item.step}
            </span>
            <span className={cn("text-[22px] font-semibold", index === active ? "text-[var(--ink)]" : "text-[var(--muted)]")}>
              {item.label}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/** 供应商头像：方牌 + 一个字，和产品里的会话列表同一形制。 */
function SupplierAvatar() {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[var(--paper-deep)] text-[19px] font-bold text-[var(--ink-soft)]">
      供
    </span>
  );
}

/* ------------------------------ 第一幕：自动接待 ------------------------------ */

function ReceptionScene({ time }: { time: number }) {
  const greeting = seg(time, 0.35, 0.85);
  const quote = seg(time, 1.15, 1.65);
  const typing = time >= 1.95 && time < 2.4;
  const reply = seg(time, 2.4, 2.8);

  return (
    <div className="flex h-full flex-col px-12 py-8">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[30px] font-bold tracking-tight">AI 正在自动接待</h3>
        <span className="text-[22px] text-[var(--muted)]">供应商不必等你在线</span>
      </div>

      <div className="mt-7 flex flex-1 flex-col gap-5">
        <div className="flex items-start gap-4" style={enter(greeting)}>
          <SupplierAvatar />
          <div className="max-w-[760px] rounded-[18px] rounded-tl-[6px] border border-[var(--line)] bg-[var(--surface)] px-6 py-5">
            <p className="text-[28px] leading-[1.5]">你好，我们是{SUPPLIER.name}，想给这款收纳盒报个价。</p>
          </div>
        </div>

        {/* 条款结构化：报价不再只是聊天里的一句话，而是一组可校验的字段 */}
        <div className="ml-[60px] rounded-[18px] border border-[var(--line)] bg-[var(--paper)] p-6" style={enter(quote)}>
          <div className="mb-5 flex items-center justify-between">
            <span className="text-[20px] font-semibold text-[var(--muted)]">供应商提交的条款</span>
            <span className="rounded-full bg-[var(--paper-deep)] px-4 py-1.5 text-[19px] font-semibold text-[var(--ink-soft)]">
              待程序校验
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {QUOTE.map((item) => (
              <div key={item.label}>
                <div className="text-[20px] text-[var(--muted)]">{item.label}</div>
                <div className="tnum mt-2 text-[36px] font-bold leading-none">
                  {item.value}
                  <span className="ml-1 text-[20px] font-normal text-[var(--muted)]">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-start justify-end gap-4">
          <div className="flex flex-col items-end gap-3">
            {typing && (
              <div className="rounded-[18px] rounded-tr-[6px] border border-[var(--line)] bg-[var(--surface)] px-5 py-4">
                <TypingDots time={time} tone="ink" />
              </div>
            )}
            {reply > 0 && (
              <div
                className="max-w-[780px] rounded-[18px] rounded-tr-[6px] px-6 py-5 text-white"
                style={{ ...enter(reply), background: "var(--surface-inverse)" }}
              >
                <p className="text-[28px] leading-[1.5]">
                  收到。我先按贵司的采购底线逐项核对报价、起订量、交期、账期与资质。
                </p>
              </div>
            )}
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[var(--accent)] text-white">
            <Bot className="size-6" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ 第二幕：底线校验 ------------------------------ */

function BottomLineScene({ time }: { time: number }) {
  const head = seg(time, 2.9, 3.25);
  const summary = seg(time, 6.05, 6.4);

  return (
    <div className="flex h-full flex-col px-12 py-7">
      <div className="flex items-baseline justify-between" style={enter(head)}>
        <h3 className="flex items-center gap-3 text-[30px] font-bold tracking-tight">
          <ShieldCheck className="size-7 text-[var(--accent)]" />
          采购底线逐项硬性核对
        </h3>
        <span className="text-[22px] text-[var(--muted)]">程序判定，不靠模型自觉</span>
      </div>

      <div className="mt-5 flex flex-1 flex-col justify-center gap-2">
        {BOTTOM_LINES.map((line, index) => {
          const rowIn = seg(time, 3.05 + index * 0.1, 3.35 + index * 0.1);
          const tickAt = 3.35 + index * 0.44;
          const tick = seg(time, tickAt, tickAt + 0.3);
          const passed = tick > 0;
          return (
            <div
              key={line.label}
              className="flex items-center gap-5 rounded-[16px] border px-6 py-3"
              style={{
                ...enter(rowIn),
                borderColor: passed ? "color-mix(in srgb, var(--success) 28%, transparent)" : "var(--line)",
                background: passed ? "var(--success-faint)" : "var(--surface)",
              }}
            >
              <span
                className="grid size-11 shrink-0 place-items-center rounded-full"
                style={{
                  background: passed ? "var(--success)" : "var(--paper-deep)",
                  color: passed ? "#fff" : "var(--muted)",
                  transform: `scale(${0.86 + 0.14 * tick})`,
                }}
              >
                {passed ? <Check className="size-6" /> : <span className="text-[19px] font-bold">{index + 1}</span>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[26px] font-bold leading-tight">{line.label}</span>
                <span className="mt-1 block text-[19px] leading-tight text-[var(--muted)]">{line.rule}</span>
              </span>
              <span
                className="tnum text-[28px] font-bold"
                style={{ color: passed ? "var(--success)" : "var(--muted)", opacity: 0.45 + 0.55 * tick }}
              >
                {line.value}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-3 flex items-center gap-3 rounded-[16px] bg-[var(--success-faint)] px-6 py-3.5 text-[24px] font-semibold text-[var(--success)]"
        style={enter(summary, 8)}
      >
        <CircleCheck className="size-6" />
        5 项全部通过 · 未触碰采购底线，进入加权评分
      </div>
    </div>
  );
}

/* ------------------------------ 第三幕：首次评分 62，未达阈值 ------------------------------ */

function ScoringScene({ time }: { time: number }) {
  const head = seg(time, 6.75, 7.1);
  const chip = seg(time, 9.3, 9.65);

  // 每一维各自填条，总分等于「当前已填出的分数之和」：
  // 条走到哪大数字就跟到哪，不会出现「条没填完总分先跳完」的假动画。
  const animated = DIMENSIONS.map((item, index) => item.low * seg(time, 6.9 + index * 0.3, 7.36 + index * 0.3));
  const total = Math.round(animated.reduce((sum, value) => sum + value, 0));

  return (
    <div className="flex h-full flex-col px-12 py-8">
      <div className="flex items-baseline justify-between" style={enter(head)}>
        <h3 className="flex items-center gap-3 text-[30px] font-bold tracking-tight">
          <Handshake className="size-7 text-[var(--accent)]" />
          首次加权评分
        </h3>
        <span className="text-[22px] text-[var(--muted)]">七维权重由商家自定义</span>
      </div>

      <div className="mt-6 flex flex-1 gap-10">
        <div className="flex w-[300px] shrink-0 flex-col justify-center">
          <div className="text-[20px] text-[var(--muted)]">供应商综合评分</div>
          <div className="mt-2 flex items-end gap-3">
            <span className="tnum text-[132px] font-bold leading-[.9] tracking-tight">{total}</span>
            <span className="pb-3 text-[24px] text-[var(--muted)]">/ 100</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--paper-deep)]">
              <span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${total}%` }} />
            </span>
            <span className="tnum text-[20px] text-[var(--muted)]">阈值 {THRESHOLD}</span>
          </div>
          <div
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--warning-faint)] px-4 py-2 text-[22px] font-semibold text-[var(--warning)]"
            style={enter(chip, 6)}
          >
            <TriangleAlert className="size-5" />
            未达阈值 · AI 继续议价
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-3.5">
          {DIMENSIONS.map((item, index) => {
            const start = 6.9 + index * 0.3;
            const fill = seg(time, start, start + 0.46);
            const rowIn = seg(time, start - 0.3, start + 0.05);
            return (
              <div key={item.label} className="flex items-center gap-5" style={enter(rowIn, 6)}>
                <span className="w-[150px] shrink-0 text-[24px]">{item.label}</span>
                <span className="h-[14px] flex-1 overflow-hidden rounded-full bg-[var(--paper-deep)]">
                  <span
                    className="block h-full rounded-full bg-[var(--paper-deep)]"
                    style={{ width: "100%" }}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(item.low / item.max) * 100}%`,
                        background: "var(--accent)",
                        transform: `scaleX(${fill})`,
                        transformOrigin: "left center",
                      }}
                    />
                  </span>
                </span>
                <span className="tnum w-[104px] shrink-0 whitespace-nowrap text-right text-[24px] font-semibold">
                  {Math.round(item.low * fill)}
                  <span className="text-[var(--muted)]"> / {item.max}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[16px] bg-[var(--warning-faint)] px-6 py-4 text-[24px] font-semibold text-[var(--warning)]" style={enter(seg(time, 9.5, 9.85), 8)}>
        <TriangleAlert className="size-6" />
        {total} 分 &lt; 转人工阈值 {THRESHOLD} · 不打扰商家，AI 继续谈
      </div>
    </div>
  );
}

/* ------------------------------ 第四幕：供应商让步，重新校验 62 → 86 ------------------------------ */

function RecheckScene({ time }: { time: number }) {
  const ask = seg(time, 10.15, 10.55);
  const reply = seg(time, 10.9, 11.3);
  const panel = seg(time, 11.5, 11.85);
  const swap = seg(time, 11.7, 12.5);
  const system = seg(time, 12.55, 12.9);

  const total = Math.round(SCORE_LOW + (SCORE_HIGH - SCORE_LOW) * swap);

  return (
    <div className="flex h-full flex-col px-12 py-8">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[30px] font-bold tracking-tight">AI 议价 → 程序重新校验</h3>
        <span className="text-[22px] text-[var(--muted)]">条款一变，评分立刻重算</span>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-start justify-end gap-4" style={enter(ask)}>
          <div
            className="max-w-[860px] rounded-[18px] rounded-tr-[6px] px-6 py-5 text-white"
            style={{ background: "var(--surface-inverse)" }}
          >
            <p className="text-[27px] leading-[1.5]">
              当前 {SCORE_LOW} 分，未达贵司设定的转人工线 {THRESHOLD} 分。若起订量降到 500 件、账期延到 45 天，可以继续。
            </p>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[var(--accent)] text-white">
            <Bot className="size-6" />
          </span>
        </div>

        <div className="flex items-start gap-4" style={enter(reply)}>
          <SupplierAvatar />
          <div className="max-w-[820px] rounded-[18px] rounded-tl-[6px] border border-[var(--line)] bg-[var(--surface)] px-6 py-5">
            <p className="text-[27px] leading-[1.5]">起订量 500 件、账期 45 天都可以，价格再让到 ¥41.80。</p>
          </div>
        </div>
      </div>

      {/* 变化的三个字段直接摊开：这是「规则写在明面上」最有说服力的一屏 */}
      <div className="mt-5 grid grid-cols-3 gap-4" style={enter(panel, 8)}>
        {DELTAS.map((delta) => (
          <div key={delta.label} className="rounded-[16px] border border-[var(--line)] bg-[var(--paper)] px-5 py-4">
            <div className="text-[19px] text-[var(--muted)]">{delta.label}</div>
            <div className="tnum mt-2 flex items-center gap-2 text-[26px] font-semibold">
              <span className="text-[var(--muted)] line-through decoration-[var(--muted)]/50">{delta.from}</span>
              <span className="text-[var(--accent-strong)]">→</span>
              <span className="font-bold">{delta.to}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-6 rounded-[18px] border px-7 py-5"
        style={{
          ...enter(panel, 8),
          borderColor: "color-mix(in srgb, var(--success) 28%, transparent)",
          background: "var(--success-faint)",
        }}
      >
        <span className="text-[22px] font-semibold text-[var(--muted)]">重新校验评分</span>
        <span className="tnum flex items-end gap-3">
          <span className="text-[42px] font-bold text-[var(--muted)]">{SCORE_LOW}</span>
          <span className="pb-1.5 text-[30px] text-[var(--muted)]">→</span>
          <span className="text-[64px] font-bold leading-none text-[var(--success)]">{total}</span>
        </span>
        <span className="ml-auto flex items-center gap-2 rounded-full bg-[var(--success)] px-5 py-2.5 text-[22px] font-semibold text-white">
          <BadgeCheck className="size-5" />
          达标 · 优质候选
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[22px] text-[var(--muted)]" style={enter(system, 6)}>
        <CircleCheck className="size-5 text-[var(--success)]" />
        系统消息：重新校验评分 {SCORE_LOW} → {SCORE_HIGH}，分类「AI 拉锯」→「优质候选」
      </div>
    </div>
  );
}

/* ------------------------------ 第五幕：分层转人工 ------------------------------ */

function HandoffScene({ time }: { time: number }) {
  const banner = seg(time, 13.35, 13.8);
  const stop = seg(time, 13.8, 14.2);
  const alert = seg(time, 14.25, 14.65);
  const card = seg(time, 14.7, 15.15);
  const bell = 1 + 0.06 * Math.sin((time - 14.25) * Math.PI * 3.2);

  return (
    <div className="flex h-full flex-col px-12 py-8">
      <div
        className="flex items-center gap-5 rounded-[20px] border px-7 py-6"
        style={{
          ...enter(banner, 8),
          borderColor: "color-mix(in srgb, var(--success) 30%, transparent)",
          background: "var(--success-faint)",
        }}
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--success)] text-white">
          <CircleCheck className="size-8" />
        </span>
        <span className="flex-1">
          <span className="tnum block text-[34px] font-bold leading-tight text-[var(--success)]">
            {SCORE_HIGH} 分 ≥ 阈值 {THRESHOLD} · 判定为优质候选
          </span>
          <span className="mt-1.5 block text-[22px] text-[var(--muted)]">
            评分由程序算出，AI 不参与决策，只负责把结论讲清楚
          </span>
        </span>
      </div>

      <div className="mt-6 flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-4" style={enter(stop, 6)}>
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--paper-deep)] text-[var(--muted)]">
            <Bot className="size-6" />
          </span>
          <span className="text-[27px]">
            已<span className="font-bold">停止 AI 自动回复</span>，不再替商家继续许诺
          </span>
        </div>

        <div className="flex items-center gap-4" style={enter(alert, 6)}>
          <span
            className="relative grid size-11 shrink-0 place-items-center rounded-full bg-[var(--accent-faint)] text-[var(--accent-strong)]"
            style={{ transform: `scale(${bell})` }}
          >
            <Bell className="size-6" />
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[var(--danger)] text-[12px] font-bold text-white">
              1
            </span>
          </span>
          <span className="text-[27px]">
            已<span className="font-bold">提醒商家接管</span>，高质量候选不再排队等 AI
          </span>
        </div>

        <div
          className="mt-auto flex items-center gap-5 rounded-[18px] border border-[var(--line)] bg-[var(--paper)] px-6 py-5"
          style={enter(card, 8)}
        >
          <SupplierAvatar />
          <span className="min-w-0 flex-1">
            <span className="block text-[26px] font-bold">
              {SUPPLIER.name} · {SUPPLIER.contact}
            </span>
            <span className="mt-1 block text-[20px] text-[var(--muted)]">
              最新报价 ¥41.80 / 件 · 起订量 500 件 · 账期 45 天 · 评分轨迹 {SCORE_LOW} → {SCORE_HIGH}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[21px] font-semibold text-white">
            <FileBadge2 className="size-5" />
            待人工接管
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ 主组件 ------------------------------ */

export function NegotiationDemo({ time, className }: { time: number; className?: string }) {
  const t = Math.max(0, Math.min(DEMO_SECONDS, time));

  // 幕间位移：0 → 4，每段 0.45s，与场景内部的入场动画并行推进
  const stage =
    seg(t, SCENE.bottomline, SCENE.bottomline + 0.45)
    + seg(t, SCENE.scoring, SCENE.scoring + 0.45)
    + seg(t, SCENE.recheck, SCENE.recheck + 0.45)
    + seg(t, SCENE.handoff, SCENE.handoff + 0.45);

  // 首尾各 0.35s 让整块卡片淡入淡出：录出来的视频可以无缝循环，
  // 而不是从「待人工接管」硬切回空白。
  const veil = Math.min(seg(t, 0, 0.35), 1 - seg(t, DEMO_SECONDS - 0.35, DEMO_SECONDS));

  const live = t < SCENE.handoff;
  const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * Math.PI * 1.6));

  return (
    <div className={cn("relative h-[960px] w-[1280px] overflow-hidden bg-[var(--paper)]", className)}>
      {/* 环境底纹：与认证页品牌区同一套 48px 网格，让影片和整站是同一个世界 */}
      <div className="ambient-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div
        className="relative m-16 flex h-[832px] flex-col overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_40px_-24px_rgba(26,26,46,.28)]"
        style={{ opacity: veil }}
      >
        <div className="flex items-center gap-4 border-b border-[var(--line)] px-12 py-5">
          <FilmBrandMark />
          <span className="text-[26px] font-bold tracking-tight">
            链谈 <span className="text-[var(--accent)]">Agent</span>
          </span>
          <span className="h-6 w-px bg-[var(--line)]" />
          <span className="text-[23px] text-[var(--muted)]">采购谈判台 · {SUPPLIER.name}</span>

          <span className="ml-auto flex items-center gap-3">
            <span
              className="flex items-center gap-2.5 rounded-full px-4 py-2 text-[21px] font-semibold"
              style={
                live
                  ? { background: "var(--accent-faint)", color: "var(--accent-strong)" }
                  : { background: "var(--paper-deep)", color: "var(--muted)" }
              }
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: live ? "var(--accent)" : "var(--muted)", opacity: live ? pulse : 1 }}
              />
              {live ? "AI 自动接待中" : "已转人工 · 待接管"}
            </span>
          </span>
        </div>

        <Rail time={t} />

        {/* 舞台：五幕纵向串成一条带子，按时间平移。用位移而不是交叉淡出，
            避免两幕内容叠在一起互相糊住。 */}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-x-0 top-0" style={{ height: "500%", transform: `translateY(-${(stage * 100) / 5}%)` }}>
            {/* 每一幕都 overflow-hidden：内容一旦比幕高更高，宁可裁掉也不能溢到相邻幕上，
                否则平移过程中会出现「上一幕的结论条压在下一幕标题上」这种穿帮。 */}
            <div className="h-1/5 overflow-hidden"><ReceptionScene time={t} /></div>
            <div className="h-1/5 overflow-hidden"><BottomLineScene time={t} /></div>
            <div className="h-1/5 overflow-hidden"><ScoringScene time={t} /></div>
            <div className="h-1/5 overflow-hidden"><RecheckScene time={t} /></div>
            <div className="h-1/5 overflow-hidden"><HandoffScene time={t} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
