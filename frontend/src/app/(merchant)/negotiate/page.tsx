"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileBadge2,
  Hand,
  Inbox,
  Info,
  MessageSquare,
  Pause,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChatMessageList } from "@/components/chat-message";
import { Textarea } from "@/components/ui/textarea";
import {
  getNegotiation,
  getNegotiations,
  handoffNegotiation,
  openQualificationFile,
  resumeAiNegotiation,
  sendHumanMessage,
  sendSupplierMessage,
  toggleQualificationVerified,
  type Negotiation,
} from "@/lib/api";
import { DEBUG_TOOLS_ENABLED } from "@/lib/constants";
import { subscribeNegotiations } from "@/lib/stream";
import { cn } from "@/lib/utils";

const statusText: Record<string, string> = {
  ai_active: "AI 自动谈判中",
  manual_required: "等待人工接管",
  human_active: "人工沟通中",
  closed: "已结束",
};
const MESSAGE_PAGE_SIZE = 10;

type SessionFilter = "all" | "pending" | "ai" | "human" | "closed";
type SessionSort = "recent" | "score";

const SESSION_FILTERS: { key: SessionFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待接管" },
  { key: "ai", label: "AI 谈判中" },
  { key: "human", label: "人工中" },
  { key: "closed", label: "已结束" },
];

function matchesFilter(item: Negotiation, filter: SessionFilter): boolean {
  if (filter === "pending") return item.classification === "qualified" && item.status === "ai_active";
  if (filter === "ai") return item.status === "ai_active";
  if (filter === "human") return item.status === "human_active";
  if (filter === "closed") return item.status === "closed";
  return true;
}

// 会话列表按「最近有消息」排序：后端返回顺序不保证，历史会话会插在中间。
// 注意不能直接取 messages 的最后一条——后端关系上没有 ORDER BY，
// 因此这里取所有消息时间的最大值，避免排序结果不稳定。
function lastActivityAt(item: Negotiation): number {
  let latest = 0;
  for (const message of item.messages) {
    const time = new Date(message.created_at).getTime();
    if (Number.isFinite(time) && time > latest) latest = time;
  }
  return latest;
}

export default function NegotiatePage() {
  const [sessions, setSessions] = useState<Negotiation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"buyer" | "supplier-test">("buyer");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SessionFilter>("all");
  const [sort, setSort] = useState<SessionSort>("recent");
  const [visibleMessageCount, setVisibleMessageCount] =
    useState(MESSAGE_PAGE_SIZE);
  const messageViewportRef = useRef<HTMLDivElement>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number | null>(null);
  // 是否跟随最新消息。用户向上翻阅历史时置为 false，避免被自动滚动打断。
  const stickToBottomRef = useRef(true);
  // 标记「这次滚动是程序贴底造成的」，避免它被误判成用户向上翻阅。
  const programmaticScrollRef = useRef(false);
  const active = useMemo(
    () => sessions.find((item) => item.id === selectedId) ?? null,
    [sessions, selectedId],
  );
  const visibleMessages = active?.messages.slice(-visibleMessageCount) ?? [];
  const hasOlderMessages = Boolean(
    active && visibleMessageCount < active.messages.length,
  );

  // 会话列表的筛选、搜索与排序：会话一多（几十上百条）时，
  // 原来只能靠后端返回顺序一条条翻，找不到人。
  const filterCounts = useMemo(() => {
    const counts: Record<SessionFilter, number> = { all: sessions.length, pending: 0, ai: 0, human: 0, closed: 0 };
    for (const item of sessions) {
      for (const key of ["pending", "ai", "human", "closed"] as SessionFilter[]) {
        if (matchesFilter(item, key)) counts[key] += 1;
      }
    }
    return counts;
  }, [sessions]);

  const visibleSessions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = sessions.filter((item) => {
      if (!matchesFilter(item, filter)) return false;
      if (!keyword) return true;
      return [item.supplier.company_name, item.product.name, item.supplier.region]
        .some((value) => (value ?? "").toLowerCase().includes(keyword));
    });
    return [...filtered].sort((a, b) =>
      sort === "score" ? b.score - a.score : lastActivityAt(b) - lastActivityAt(a),
    );
  }, [sessions, filter, query, sort]);

  const pinToBottom = useCallback(() => {
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    programmaticScrollRef.current = true;
    viewport.scrollTop = viewport.scrollHeight;
  }, []);

  // 切换会话：重置分页、恢复跟随状态，并连续若干帧贴底。
  // 只贴一次是不够的——消息区高度要等字体、换行、图片定型后才稳定，
  // 实测只贴一次会停在对话中部（约 450px 处），永远看不到最新几条。
  useLayoutEffect(() => {
    setVisibleMessageCount(MESSAGE_PAGE_SIZE);
    stickToBottomRef.current = true;
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    let frames = 0;
    let raf = 0;
    const tick = () => {
      pinToBottom();
      if (++frames < 12) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [selectedId, pinToBottom]);

  useLayoutEffect(() => {
    const viewport = messageViewportRef.current;
    if (previousScrollHeightRef.current !== null && viewport) {
      viewport.scrollTop +=
        viewport.scrollHeight - previousScrollHeightRef.current;
      previousScrollHeightRef.current = null;
    }
  }, [visibleMessageCount]);

  // 新增消息时跟随最新一条。
  useLayoutEffect(() => {
    if (stickToBottomRef.current) pinToBottom();
  }, [active?.messages.length, pinToBottom]);

  // 内容高度可能在上述帧之后才变化（字体、图片、异步刷新），用 ResizeObserver 继续跟随。
  useEffect(() => {
    const content = messageContentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) pinToBottom();
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [pinToBottom, selectedId]);

  function loadOlderMessages() {
    if (!active || !hasOlderMessages) return;
    const viewport = messageViewportRef.current;
    previousScrollHeightRef.current = viewport?.scrollHeight ?? null;
    setVisibleMessageCount((current) =>
      Math.min(current + MESSAGE_PAGE_SIZE, active.messages.length),
    );
  }

  function handleMessageScroll() {
    const viewport = messageViewportRef.current;
    if (!viewport) return;
    if (programmaticScrollRef.current) {
      // 这次滚动是程序贴底造成的，不代表用户向上翻阅。
      programmaticScrollRef.current = false;
      return;
    }
    // 距底部 80px 以内视为「正在跟随最新消息」。
    stickToBottomRef.current =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
    if (viewport.scrollTop < 48) loadOlderMessages();
  }

  const load = useCallback(async (preferredId?: number | null) => {
    try {
      const items = await getNegotiations();
      setSessions(items);
      const params = new URLSearchParams(window.location.search);
      const queryId = preferredId ?? Number(params.get("id") || 0);
      if (params.get("view") === "supplier-test" && DEBUG_TOOLS_ENABLED) setView("supplier-test");
      setSelectedId((current) =>
        items.some((item) => item.id === (queryId || current))
          ? queryId || current
          : (items[0]?.id ?? null),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法读取谈判会话");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  // 实时通道：任一会话出现新消息或状态变化即刷新当前视图，供应商在另一端发言时商家无需手动点「刷新」。
  useEffect(() => subscribeNegotiations(() => { void load(); }), [load]);

  function replaceSession(updated: Negotiation) {
    setSessions((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }
  async function takeOver() {
    if (!active) return;
    try {
      replaceSession((await handoffNegotiation(active.id)) as Negotiation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "接管失败");
    }
  }
  async function resumeAi() {
    if (!active) return;
    try {
      replaceSession(await resumeAiNegotiation(active.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法恢复 AI");
    }
  }
  async function toggleVerify(fileId: string) {
    try {
      await toggleQualificationVerified(fileId);
      await load(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "核验状态更新失败");
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    await doSend();
  }
  async function doSend() {
    if (!active || !draft.trim()) return;
    const canSupplierSend =
      view === "supplier-test" &&
      !["closed"].includes(active.status) &&
      active.classification !== "eliminated";
    const canBuyerSend = view === "buyer" && active.status === "human_active";
    if (!canSupplierSend && !canBuyerSend) return;
    setSending(true);
    try {
      if (view === "supplier-test") {
        await sendSupplierMessage(active.id, draft.trim(), "admin");
        replaceSession(await getNegotiation(active.id, "admin"));
      } else {
        replaceSession(await sendHumanMessage(active.id, draft.trim()));
      }
      setDraft("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  }
  function selectSession(id: number) {
    setSelectedId(id);
    window.history.replaceState(null, "", `/negotiate?id=${id}&view=${view}`);
  }
  function changeView(next: "buyer" | "supplier-test") {
    setView(next);
    setDraft("");
    if (selectedId)
      window.history.replaceState(
        null,
        "",
        `/negotiate?id=${selectedId}&view=${next}`,
      );
  }

  if (loading)
    return (
      <div className="animate-rise">
        <div className="mb-5">
          <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--paper-deep)]" />
          <div className="mt-4 h-8 w-64 animate-pulse rounded-[var(--radius-control)] bg-[var(--paper-deep)]" />
          <div className="mt-3 h-4 w-44 animate-pulse rounded-full bg-[var(--paper-deep)]" />
        </div>
        <div className="grid min-h-[680px] gap-5 lg:grid-cols-[260px_1fr] xl:grid-cols-[270px_1fr_300px]">
          <div className="h-[680px] animate-pulse rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]" />
          <div className="h-[680px] animate-pulse rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]" />
          <div className="h-[680px] animate-pulse rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] lg:col-span-2 xl:col-span-1" />
        </div>
      </div>
    );
  if (!active)
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="p-10 text-center">
          <Inbox className="mx-auto size-10 text-[var(--muted)]" />
          <h1 className="mt-4 text-xl font-bold">还没有谈判会话</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            供应商提交资料后，会自动在这里生成独立会话。
          </p>
        </CardContent>
      </Card>
    );

  const humanMode = active.status === "human_active";
  const supplierCanSend = active.status !== "closed";
  const canTakeOver =
    !["closed", "human_active"].includes(active.status) &&
    active.classification !== "eliminated";
  const classificationText =
    (
      {
        negotiating: "AI 拉锯",
        qualified: "优质候选",
        eliminated: "当前方案超出底线",
      } as Record<string, string>
    )[active.classification] ?? active.classification;
  const scoreMatches = active.messages
    .map((message) =>
      message.sender === "system"
        ? message.content.match(/重新校验评分：(\d+) → (\d+)/)
        : null,
    )
    .filter(Boolean) as RegExpMatchArray[];
  const scoreTrail = scoreMatches.length
    ? [scoreMatches[0]![1], ...scoreMatches.map((match) => match![2])]
    : [];
  const rounds = active.messages.filter(
    (message) => message.sender === "supplier",
  ).length;
  const lastSupplierMessage = [...active.messages]
    .reverse()
    .find((message) => message.sender === "supplier");
  return (
    <div className="animate-rise xl:flex xl:h-[calc(100dvh-8rem)] xl:min-h-0 xl:flex-col">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--accent-strong)]">
            <span className="h-px w-5 bg-[var(--accent)]" />
            实时谈判
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {active.supplier.company_name}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {active.product.name} · {active.supplier.region} · 会话 #{active.id}
          </p>
        </div>
          <div className="flex flex-wrap items-center gap-2">
          {DEBUG_TOOLS_ENABLED && (
            <div className="flex rounded-xl border border-dashed border-[var(--line)] bg-white p-1">
              <button
                onClick={() => changeView("buyer")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold",
                  view === "buyer" && "bg-[var(--ink)] text-white",
                )}
              >
                采购方视角
              </button>
              <button
                onClick={() => changeView("supplier-test")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold",
                  view === "supplier-test" && "bg-[var(--accent)] text-white",
                )}
              >
                模拟供应商
              </button>
            </div>
          )}
          <Badge
            className={cn(
              "border-0 px-3 py-1.5",
              active.status === "ai_active"
                ? "bg-[var(--success-faint)] text-[var(--success)]"
                : "bg-[var(--accent-faint)] text-[var(--accent-strong)]",
            )}
          >
            {statusText[active.status] ?? active.status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(selectedId)}
          >
            <RefreshCw className="size-3.5" />
            刷新
          </Button>
        </div>
      </div>
      {view === "supplier-test" && (
        <div className="mb-5 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning-faint)] px-4 py-3 text-xs leading-5 text-[var(--warning)]">
          <strong>本地测试模式：</strong>
          你发送的内容会被记录为当前供应商的真实发言，并触发采购 AI
          回复。达到优质候选阈值后，AI 仍会按规则停止自动回复。
        </div>
      )}
      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning-faint)] p-3 text-sm text-[var(--warning)]">
          <AlertTriangle className="size-4" />
          {error}
        </div>
      )}
      {active.classification === "qualified" &&
        active.status === "ai_active" && (
          <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-faint)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold">
                该供应商已达到建议接管标准
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                AI 仍在继续回复；只有点击接管后才会切换为人工沟通。
              </p>
            </div>
            <Button variant="accent" onClick={() => void takeOver()}>
              <Hand className="size-4" />
              现在接管
            </Button>
          </div>
        )}

      <div className="grid min-h-[680px] gap-5 lg:grid-cols-[260px_1fr] xl:min-h-0 xl:flex-1 xl:grid-cols-[270px_1fr_300px] xl:overflow-hidden">
        <Card className="min-h-0 overflow-hidden">
          <CardContent className="flex h-full min-h-0 flex-col p-0">
            <div className="space-y-3 border-b border-[var(--line)] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold">洽谈会话</div>
                <button
                  type="button"
                  onClick={() => setSort((current) => (current === "recent" ? "score" : "recent"))}
                  className="rounded-[var(--radius-chip)] border border-[var(--line)] px-2 py-1 text-[11px] font-semibold text-[var(--muted)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
                >
                  {sort === "recent" ? "最近活跃" : "评分最高"}
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索供应商、商品或地区"
                  aria-label="搜索洽谈会话"
                  className="h-8 w-full rounded-[var(--radius-chip)] border border-[var(--line)] bg-[var(--surface)] pl-8 pr-2 text-xs outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {SESSION_FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={cn(
                      "tnum rounded-[var(--radius-chip)] px-2 py-1 text-[11px] font-semibold transition",
                      filter === item.key
                        ? "bg-[var(--ink)] text-white"
                        : "text-[var(--muted)] hover:bg-[var(--paper)] hover:text-[var(--ink)]",
                    )}
                  >
                    {item.label} {filterCounts[item.key]}
                  </button>
                ))}
              </div>
            </div>
            <div className="thin-scrollbar min-h-0 flex-1 divide-y divide-[var(--line)] overflow-y-auto">
              {visibleSessions.length ? visibleSessions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectSession(item.id)}
                  className={cn(
                    "w-full p-4 text-left transition hover:bg-[var(--paper)]",
                    item.id === active.id &&
                      "border-l-2 border-[var(--accent)] bg-[var(--accent-faint)]/45",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {item.supplier.company_name}
                    </span>
                    <span className="tnum text-xs font-bold text-[var(--accent-strong)]">
                      {item.score}
                    </span>
                  </div>
                  <div className="mt-1.5 truncate text-xs text-[var(--muted)]">
                    {item.product.name}
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--muted)]">
                    {statusText[item.status] ?? item.status}
                  </div>
                </button>
              )) : (
                <div className="px-4 py-10 text-center text-xs text-[var(--muted)]">
                  <Inbox className="mx-auto mb-2 size-6" />
                  {sessions.length ? "没有符合条件的会话" : "暂无洽谈会话"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-[680px] flex-col overflow-hidden xl:min-h-0">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <ShieldCheck className="size-4 text-[var(--success)]" />
              每个会话单独保存消息和状态
            </div>
            <span className="text-xs text-[var(--muted)]">
              {active.messages.length} 条消息
            </span>
          </div>
          <div
            ref={messageViewportRef}
            onScroll={handleMessageScroll}
            className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--chat-canvas)] p-4 sm:p-6"
          >
            <div ref={messageContentRef} className="flex min-h-full flex-col gap-5">
            {hasOlderMessages && (
              <button
                type="button"
                onClick={loadOlderMessages}
                className="mx-auto block rounded-full bg-[var(--paper-deep)] px-3 py-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--ink)]"
              >
                向上滚动加载更早消息
              </button>
            )}
            {active.messages.length ? (
              <ChatMessageList
                messages={visibleMessages}
                supplierName={active.supplier.company_name}
              />
            ) : (
              <div className="grid flex-1 place-items-center text-center text-sm text-[var(--muted)]">
                <div>
                  <Inbox className="mx-auto mb-3 size-8" />
                  会话已创建，尚无沟通消息
                </div>
              </div>
            )}
            </div>
          </div>
          <form
            onSubmit={send}
            className="shrink-0 border-t border-[var(--line)] bg-white p-4"
          >
            {view === "supplier-test" &&
              active.classification === "qualified" &&
              active.status === "ai_active" && (
                <div className="mb-2 rounded-lg bg-[var(--warning-faint)] px-2.5 py-1.5 text-xs text-[var(--warning)]">
                  该会话已达建议接管标准；商家点击接管前，AI 仍会继续回复。
                </div>
              )}
            <div className="mb-2 text-xs font-semibold">
              {view === "supplier-test"
                ? `以“${active.supplier.company_name}”身份发言`
                : "采购方人工回复"}
            </div>
            <div className="relative">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={
                  view === "supplier-test" ? !supplierCanSend : !humanMode
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!sending) void doSend();
                  }
                }}
                placeholder={
                  view === "supplier-test"
                    ? supplierCanSend
                      ? "输入供应商的报价、让步或问题，发送后等待采购 AI 回复…"
                      : "该会话已经结束，不能继续发送"
                    : humanMode
                      ? "输入给供应商的消息…"
                      : "AI 正在自动接待，接管后可手动回复"
                }
                className="min-h-20 pr-14"
              />
              <Button
                type="submit"
                variant="accent"
                size="icon"
                disabled={
                  sending ||
                  !draft.trim() ||
                  (view === "supplier-test" ? !supplierCanSend : !humanMode)
                }
                className="absolute bottom-2 right-2 size-9"
              >
                <ArrowUp className="size-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Info className="size-3" />
              {view === "supplier-test"
                ? "测试发言与 AI 回复都会写入当前供应商会话"
                : "人工消息会写入当前供应商的谈判记录"}
            </div>
          </form>
        </Card>

        <div className="thin-scrollbar min-h-0 space-y-5 overflow-y-auto lg:col-span-2 xl:col-span-1">
          <Card>
            <CardContent className="p-5">
              <div className="text-xs font-semibold text-[var(--muted)]">
                供应商综合评分
              </div>
              <div className="tnum mt-1 text-4xl font-bold">
                {active.score}
                <span className="text-sm font-normal text-[var(--muted)]">
                  {" "}
                  / 100
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                <Stat label="报价" value={`¥${active.quoted_price}`} />
                <Stat label="起订量" value={`${active.moq} 件`} />
                <Stat label="交期" value={`${active.lead_days} 天`} />
                <Stat label="联系人" value={active.supplier.contact_name} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="text-sm font-bold">规则结果</div>
              <div className="mt-3 text-xs text-[var(--muted)]">
                {active.hard_fail_reasons.length ? (
                  active.hard_fail_reasons.map((reason) => (
                    <div key={reason} className="mt-2 flex gap-2">
                      <AlertTriangle className="size-4 text-[var(--warning)]" />
                      {reason}
                    </div>
                  ))
                ) : (
                  <div className="flex gap-2 text-[var(--success)]">
                    <CheckCircle2 className="size-4" />
                    已通过采购底线
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  <ClipboardList className="size-4 text-[var(--accent)]" />
                  AI 谈判摘要
                </div>
                <span className="text-[11px] text-[var(--muted)]">
                  自动生成
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Stat label="最新报价" value={`¥${active.quoted_price}`} />
                <Stat label="最新起订量" value={`${active.moq} 件`} />
                <Stat label="账期" value={`${active.payment_days} 天`} />
                <Stat label="交期" value={`${active.lead_days} 天`} />
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-[var(--muted)]">
                <div>
                  已谈{" "}
                  <span className="font-bold text-[var(--ink)]">{rounds}</span>{" "}
                  轮 · 当前分类{" "}
                  <span className="font-bold text-[var(--ink)]">
                    {classificationText}
                  </span>
                </div>
                {scoreTrail.length > 0 && (
                  <div>评分轨迹：{scoreTrail.join(" → ")}</div>
                )}
                {lastSupplierMessage && (
                  <div className="leading-5">
                    供应商最新发言：{lastSupplierMessage.content.slice(0, 60)}
                    {lastSupplierMessage.content.length > 60 ? "…" : ""}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  <FileBadge2 className="size-4 text-[var(--accent)]" />
                  资质文件 · 人工核验
                </div>
                <span className="text-[11px] text-[var(--muted)]">
                  {active.supplier.qualification_files.length} 份
                </span>
              </div>
              {active.supplier.qualification_files.length ? (
                <div className="mt-3 space-y-2">
                  {active.supplier.qualification_files.map((file) => {
                    // OCR 状态枚举集中在一处，避免散落的四组条件判断把行结构撑变形。
                    const status =
                      file.ocr_status === "passed"
                        ? { label: "识别一致", tone: "text-[var(--success)]" }
                        : file.ocr_status === "mismatch"
                          ? { label: "识别不一致", tone: "text-[var(--danger)]" }
                          : { label: "转人工核验", tone: "text-[var(--warning)]" };
                    return (
                      <div
                        key={file.id}
                        className="rounded-[var(--radius-control)] border border-[var(--line)] p-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <FileBadge2 className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium" title={file.original_name}>
                              {file.original_name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--muted)]">
                              <span className="tnum">{Math.max(1, Math.round(file.size_bytes / 1024))} KB</span>
                              <span>·</span>
                              <span className="tnum">{new Date(file.uploaded_at).toLocaleDateString("zh-CN")}</span>
                              <span>·</span>
                              <span className={cn("font-semibold", status.tone)}>{status.label}</span>
                            </div>
                            {file.ocr_detail && (
                              <p className="mt-1.5 text-[11px] leading-5 text-[var(--muted)]">
                                {file.ocr_detail}
                              </p>
                            )}
                          </div>
                        </div>
                        {/* 操作放到独立一行：300px 宽的右栏里，按钮和文件名挤在一行必然折行 */}
                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => void openQualificationFile(file.id)}
                          >
                            <ExternalLink className="size-3.5" />
                            查看文件
                          </Button>
                          <Button
                            size="sm"
                            variant={file.verified ? "outline" : "accent"}
                            className="flex-1"
                            aria-pressed={file.verified}
                            onClick={() => void toggleVerify(file.id)}
                          >
                            <BadgeCheck className="size-3.5" />
                            {file.verified ? "已核验" : "标记核验"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 text-xs text-[var(--muted)]">
                  该供应商未上传资质文件（未勾选资质时无需上传）。
                </div>
              )}
            </CardContent>
          </Card>
          {active.status === "ai_active" &&
            active.classification === "negotiating" && (
              <Link href={`/supplier/chat?id=${active.id}`} className="block">
                <Button variant="outline" size="lg" className="w-full">
                  <MessageSquare className="size-4" />
                  查看 AI 洽谈对话
                </Button>
              </Link>
            )}
          {canTakeOver && (
            <Button
              variant="accent"
              size="lg"
              className="w-full"
              onClick={() => void takeOver()}
            >
              <Pause className="size-4" />
              停止 AI 并接管
            </Button>
          )}
          {humanMode && active.classification === "negotiating" && (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => void resumeAi()}
            >
              <RotateCcw className="size-4" />
              恢复 AI 自动谈判
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--paper)] p-3">
      <div className="text-[var(--muted)]">{label}</div>
      <div className="tnum mt-1.5 truncate font-bold">{value}</div>
    </div>
  );
}
