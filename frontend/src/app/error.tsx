"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // 生产环境只保留摘要，避免把堆栈直接渲染给用户；完整信息交给浏览器控制台与后续接入的监控。
    console.error("页面渲染出错：", error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center sm:p-10">
          <div className="mx-auto grid size-14 place-items-center rounded-[var(--radius-card)] bg-[var(--warning-faint)] text-[var(--warning)]">
            <AlertTriangle className="size-7" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">页面出了点问题</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            已记录这次异常。你可以重试一次；如果一直失败，请稍后再试或联系管理员。
          </p>
          {error.digest && (
            <p className="tnum mt-2 text-xs text-[var(--muted)]">错误编号：{error.digest}</p>
          )}
          <Button variant="accent" size="lg" className="mt-7 w-full" onClick={() => reset()}>
            <RotateCcw className="size-4" />
            重试
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
