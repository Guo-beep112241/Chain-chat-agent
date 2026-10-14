"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  ChevronRight,
  Clock3,
  Info,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProductLibraryDrawer } from "@/components/product-library-drawer";
import { getDashboardSummary, type DashboardItem, type DashboardSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

type MetricKey = "today" | "ai" | "qualified" | "saved";
type SortKey = "recent" | "score" | "price" | "moq";

const PAGE_SIZE = 10;

const RANGES: { days: number; label: string }[] = [
  { days: 0, label: "全部" },
  { days: 7, label: "近 7 天" },
  { days: 30, label: "近 30 天" },
  { days: 90, label: "近 90 天" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "最近活跃" },
  { key: "score", label: "评分" },
  { key: "price", label: "报价" },
  { key: "moq", label: "起订量" },
];

const emptySummary: DashboardSummary = {
  today_received: 0, ai_active: 0, qualified: 0, minutes_saved: 0,
  items: [], range_days: 0, range_received: 0,
};

// 中文语境下不用 0h 30m 这类英文单位；不足 1 小时只显示分钟。
function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} 分钟`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`;
}

function matchesMetric(item: DashboardItem, metric: MetricKey): boolean {
  if (metric === "today") return item.is_today;
  if (metric === "ai") return item.status === "ai_active";
  if (metric === "qualified") return item.classification === "qualified";
  return true;
}

function statusLabel(item: DashboardItem): string {
  if (item.status === "ai_active") return "AI 谈判中";
  if (item.classification === "qualified") return "待人工接管";
  if (item.status === "human_active") return "人工沟通中";
  return "已结束";
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [online, setOnline] = useState(true);
  const [metric, setMetric] = useState<MetricKey>("today");
  const [days, setDays] = useState(0);
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [showCostBasis, setShowCostBasis] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  const refresh = useCallback(async (rangeDays: number) => {
    try {
      setSummary(await getDashboardSummary(rangeDays));
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => { void refresh(days); }, [refresh, days]);
  // 切换口径或指标后回到第一页，避免停在空白页。
  useEffect(() => { setPage(1); }, [metric, days, sort]);

  const metrics = [
    { key: "today" as const, label: "今日接待", value: String(summary.today_received), note: "今日新提交的供应商", icon: UsersRound },
    { key: "ai" as const, label: "AI 自动谈判中", value: String(summary.ai_active), note: "本口径内仍在 AI 谈判", icon: Bot },
    { key: "qualified" as const, label: "优质候选", value: String(summary.qualified), note: "本口径内已达接管标准", icon: PackageCheck },
    { key: "saved" as const, label: "为您节省", value: formatMinutes(summary.minutes_saved), note: "按接待与 AI 回复估算", icon: Clock3 },
  ];
  const selectedMetric = metrics.find((item) => item.key === metric)!;

  const visibleItems = useMemo(() => {
    const filtered = summary.items.filter((item) => matchesMetric(item, metric));
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === "score") return b.score - a.score;
      if (sort === "price") return a.price - b.price;
      if (sort === "moq") return a.moq - b.moq;
      return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
    });
    return sorted;
  }, [summary.items, metric, sort]);

  const pageCount = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedItems = visibleItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 评分分布：用当前口径下的真实评分画直方图，不编造趋势数据。
  const scoreBuckets = useMemo(() => {
    const buckets = [
      { label: "0-59", min: 0, max: 59, count: 0 },
      { label: "60-69", min: 60, max: 69, count: 0 },
      { label: "70-79", min: 70, max: 79, count: 0 },
      { label: "80-89", min: 80, max: 89, count: 0 },
      { label: "90-100", min: 90, max: 100, count: 0 },
    ];
    for (const item of summary.items) {
      const bucket = buckets.find((b) => item.score >= b.min && item.score <= b.max);
      if (bucket) bucket.count += 1;
    }
    return buckets;
  }, [summary.items]);
  const maxBucket = Math.max(1, ...scoreBuckets.map((b) => b.count));
  const rangeLabel = RANGES.find((r) => r.days === days)?.label ?? "全部";

  return (
    <div className="animate-rise space-y-6">
      {/* 页头 */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--accent-strong)]">
            <span className="h-px w-5 bg-[var(--accent)]" />
            商家管理后台
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">采购工作台</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            统计口径：<span className="font-semibold text-[var(--ink)]">{rangeLabel}</span>
            {" · "}本口径内 {summary.range_received} 条接待记录，由真实数据自动生成。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-1">
            {RANGES.map((item) => (
              <button
                key={item.days}
                type="button"
                onClick={() => setDays(item.days)}
                className={cn(
                  "rounded-[var(--radius-chip)] px-2.5 py-1.5 text-xs font-semibold transition",
                  days === item.days ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => void refresh(days)}>
            <RefreshCw className="size-4" />
            刷新
          </Button>
          <Button variant="accent" onClick={() => setProductsOpen(true)}>
            <PackagePlus className="size-4" />
            商品库管理
          </Button>
        </div>
      </section>

      {!online && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-[var(--warning)]/20 bg-[var(--warning-faint)] px-4 py-3 text-sm text-[var(--warning)]">
          <span>服务暂时不可用，数据未能加载。请稍后重试。</span>
          <Button size="sm" variant="outline" onClick={() => void refresh(days)}>
            <RefreshCw className="size-3.5" />
            重试
          </Button>
        </div>
      )}

      {/* 指标卡 */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <button key={item.key} onClick={() => setMetric(item.key)} className="text-left">
            <Card className={cn("h-full transition hover:-translate-y-0.5", metric === item.key && "border-[var(--accent)] ring-2 ring-[var(--accent-faint)]")}>
              <CardContent className="p-5">
                <item.icon className={cn("size-5", index === 2 ? "text-[var(--success)]" : "text-[var(--accent)]")} />
                <div className="tnum mt-5 text-3xl font-bold">{item.value}</div>
                <div className="mt-1 text-sm font-semibold">{item.label}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{item.note}</span>
                  <ChevronRight className="size-4" />
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* 明细 */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-bold">{selectedMetric.label}明细</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                共 {visibleItems.length} 条，按「{SORTS.find((s) => s.key === sort)?.label}」排序。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-[var(--radius-control)] border border-[var(--line)] p-0.5">
                {SORTS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSort(item.key)}
                    className={cn(
                      "rounded-[var(--radius-chip)] px-2 py-1 text-[11px] font-semibold transition",
                      sort === item.key ? "bg-[var(--paper-deep)] text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {metric === "saved" && (
              <div className="mb-4 rounded-[var(--radius-control)] bg-[var(--paper)] p-4 text-xs leading-5 text-[var(--muted)]">
                节省时间采用透明估算：每次自动接待计 5 分钟，每条 AI 回复计 3 分钟。
                本口径内 {summary.items.length} 条接待记录合计得出上方数字。
              </div>
            )}

            {pagedItems.length ? (
              <>
                <div className="divide-y divide-[var(--line)]">
                  {pagedItems.map((item) => (
                    <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1.3fr_1fr_.55fr_.8fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{item.supplier}</div>
                        <div className="truncate text-xs text-[var(--muted)]">{item.product}</div>
                      </div>
                      <div className="tnum text-sm">¥{item.price} · {item.moq} 件</div>
                      <div className="tnum text-sm font-bold">{item.score} 分</div>
                      <div className="flex flex-col gap-1">
                        <Badge className="w-fit">{statusLabel(item)}</Badge>
                        <span className="tnum text-[11px] text-[var(--muted)]">
                          {new Date(item.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      <Link
                        href={`/negotiate?id=${item.id}`}
                        aria-label={`查看 ${item.supplier} 的洽谈会话`}
                        className="grid size-8 place-items-center rounded-[var(--radius-chip)] border border-[var(--line)] transition hover:border-[var(--ink)]"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    </div>
                  ))}
                </div>
                {pageCount > 1 && (
                  <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span className="tnum">第 {currentPage} / {pageCount} 页</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                        上一页
                      </Button>
                      <Button size="sm" variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
                        下一页
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-10 text-center text-sm text-[var(--muted)]">
                <p>当前口径下没有符合该栏目的记录</p>
                {summary.items.length > 0 && (
                  <p className="mt-2 text-xs">
                    本口径内共有 {summary.items.length} 条接待记录，换个栏目或口径就能看到。
                  </p>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {days !== 0 && (
                    <Button size="sm" variant="outline" onClick={() => setDays(0)}>切换到「全部」</Button>
                  )}
                  {metric !== "saved" && summary.items.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => setMetric("saved")}>查看全部记录</Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 评分分布 + 口径说明 */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <h2 className="font-bold">评分分布</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">
                本口径内 {summary.items.length} 条接待记录的评分区间构成。
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {scoreBuckets.map((bucket) => (
                <div key={bucket.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="tnum text-[var(--muted)]">{bucket.label} 分</span>
                    <span className="tnum font-semibold">{bucket.count} 家</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--paper-deep)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${(bucket.count / maxBucket) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {!summary.items.length && (
                <p className="py-6 text-center text-xs text-[var(--muted)]">当前口径内还没有接待记录</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-1.5">
                <Info className="size-4 text-[var(--accent)]" />
                <h2 className="font-bold">口径说明</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-6 text-[var(--muted)]">
              <p>
                上方四张卡与明细列表使用同一口径：只看
                <span className="font-semibold text-[var(--ink)]">{rangeLabel}</span>
                内新提交的供应商会话。切换口径时数字与列表会一起变化。
              </p>
              <button
                type="button"
                onClick={() => setShowCostBasis((v) => !v)}
                aria-expanded={showCostBasis}
                className="font-semibold text-[var(--accent-strong)] underline underline-offset-2"
              >
                {showCostBasis ? "收起「为您节省」的估算方式" : "「为您节省」是怎么算的？"}
              </button>
              {showCostBasis && (
                <div className="rounded-[var(--radius-control)] bg-[var(--paper)] p-3 leading-6">
                  每次自动接待计 <span className="tnum font-semibold text-[var(--ink)]">5 分钟</span>，
                  每条 AI 回复计 <span className="tnum font-semibold text-[var(--ink)]">3 分钟</span>。
                  本口径内 {summary.range_received} 条接待记录合计约{" "}
                  <span className="tnum font-semibold text-[var(--ink)]">{formatMinutes(summary.minutes_saved)}</span>。
                  这是估算值，不是实际计时。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {productsOpen && (
        <ProductLibraryDrawer
          onClose={() => setProductsOpen(false)}
          onChanged={() => void refresh(days)}
        />
      )}
    </div>
  );
}
