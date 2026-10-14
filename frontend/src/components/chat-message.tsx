"use client";

import { AlertTriangle, Bot, Info, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: number;
  sender: "supplier" | "ai" | "human" | "system";
  content: string;
  created_at: string;
};

// 模型不可用时的系统提示：既匹配后端的新文案，也兼容历史库里已经写成 AI 发言的旧兜底文案。
const SERVICE_NOTICE_PREFIXES = ["AI 服务暂时不可用", "模型服务暂时不可用"];

function isServiceNotice(message: ChatMessage): boolean {
  return SERVICE_NOTICE_PREFIXES.some((prefix) => message.content.startsWith(prefix));
}

/**
 * 谈判消息单行渲染。商家端与供应商端共用，避免两处样式各自漂移。
 * - supplier：左侧白底气泡
 * - ai / human：右侧深色气泡（AI 为墨黑，人工为品牌蓝）
 * - system：居中的事件行；AI 服务不可用时用琥珀色警示样式，避免被当成 AI 的回复
 */
export function ChatMessageItem({ message, supplierName }: { message: ChatMessage; supplierName: string }) {
  if (message.sender === "system" || isServiceNotice(message)) {
    const alert = isServiceNotice(message);
    return (
      <div className="flex justify-center">
        <div
          className={cn(
            "flex max-w-[92%] items-start gap-2 rounded-xl border px-3 py-2 text-xs leading-5",
            alert
              ? "border-[var(--warning)]/25 bg-[var(--warning-faint)] text-[var(--warning)]"
              : "border-[var(--line)] bg-[var(--paper-deep)] text-[var(--muted)]",
          )}
        >
          {alert ? (
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <Info className="mt-0.5 size-3.5 shrink-0" />
          )}
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  const fromSupplier = message.sender === "supplier";
  return (
    <div className={cn("flex gap-2.5", !fromSupplier && "justify-end")}>
      {fromSupplier && (
        <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[var(--paper-deep)] text-xs font-bold">
          {supplierName.slice(0, 1)}
        </div>
      )}
      <div className={cn("max-w-[82%]", !fromSupplier && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-3 text-left text-sm leading-6",
            fromSupplier
              ? "rounded-tl-sm border border-[var(--line)] bg-white"
              : message.sender === "ai"
                ? "rounded-tr-sm bg-[var(--ink)] text-white"
                : "rounded-tr-sm bg-[var(--accent)] text-white",
          )}
        >
          {message.sender === "ai" && (
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-[#93c5fd]">
              <Bot className="size-3" />
              AI 采购助手
            </div>
          )}
          {message.sender === "human" && (
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-white/75">
              <UserRound className="size-3" />
              店长本人
            </div>
          )}
          {message.content}
        </div>
        <div className="mt-1 text-[10px] text-[var(--muted)]">
          {new Date(message.created_at).toLocaleString("zh-CN")}
        </div>
      </div>
    </div>
  );
}
