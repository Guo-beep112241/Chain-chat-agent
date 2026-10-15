"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Loader2, Smartphone } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestSupplierCode, setSupplierAuth, supplierLogin } from "@/lib/api";

export default function SupplierLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [countdown, setCountdown] = useState(0);

  // 后端对同一手机号的取码限制是 60 秒 1 次，前端用倒计时对齐，
  // 避免用户连点后撞上 429 只看到一句报错。
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  async function sendCode() {
    const trimmed = phone.trim();
    if (!/^\d{11}$/.test(trimmed)) { setError("请输入 11 位手机号"); return; }
    setRequesting(true); setError(""); setNotice("");
    try {
      const res = await requestSupplierCode(trimmed);
      setDemoCode(res.code ?? "");
      setCode(res.code ?? ""); // 演示模式：自动填入验证码
      setNotice(res.code ? `演示验证码已生成：${res.code}（5 分钟内有效）` : "验证码已发送，请查看短信");
      setCountdown(60);
    } catch (e) { setError(e instanceof Error ? e.message : "获取验证码失败"); }
    finally { setRequesting(false); }
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    // 不在「没填完」时禁用按钮：灰掉的按钮不会告诉用户为什么不能点，
    // 提交一次、给一句明确的报错，比让按钮沉默要好。
    if (!/^\d{11}$/.test(phone.trim())) { setError("请输入 11 位手机号"); return; }
    if (!code.trim()) { setError("请先获取并填写验证码"); return; }
    setLoggingIn(true); setError("");
    try {
      const res = await supplierLogin(phone.trim(), code.trim());
      setSupplierAuth(res.access_token, res.phone);
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/supplier") ? next : "/supplier");
    } catch (err) { setError(err instanceof Error ? err.message : "登录失败"); }
    finally { setLoggingIn(false); }
  }

  const errorId = error ? "supplier-login-error" : undefined;

  return (
    <AuthLayout
      asideTitle="有货要供？先让程序替你算一遍"
      asideBody="手机号登录后填写报价、起订量、交期、账期与资质，提交前就能看到是否满足采购底线与实时预评估分数，通过后直接进入 AI 洽谈。"
    >
      <div className="p-7 sm:p-8">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">供应商登录</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">登录后提交供货方案，并进入 AI 洽谈。</p>

        <div className="mt-6 flex items-center gap-2 text-xs">
          <span className="text-[var(--muted)]">当前身份</span>
          <span className="rounded-full bg-[var(--paper)] px-2.5 py-1 font-semibold text-[var(--ink)]">供应商</span>
          <Link
            href="/login"
            className="ml-auto font-semibold text-[var(--accent-strong)] underline underline-offset-2 transition-colors hover:text-[var(--accent)]"
          >
            我是采购方 →
          </Link>
        </div>

        {/* 这只是一条中性说明，不是「已通过 / 识别一致」——不占用 success 的语义色 */}
        <p className="mt-4 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-xs leading-5 text-[var(--muted)]">
          演示环境使用假验证码：点击「获取验证码」后会直接显示在页面上，不发送真实短信。
        </p>

        {error && (
          <div
            id="supplier-login-error"
            role="alert"
            className="mt-4 rounded-[var(--radius-control)] border border-[var(--danger)]/25 bg-[var(--danger-faint)] px-3 py-2.5 text-xs text-[var(--danger)]"
          >
            {error}
          </div>
        )}

        <form onSubmit={login} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold">手机号</span>
            <div className="relative mt-2">
              <Smartphone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                className="pl-9"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入 11 位手机号"
                inputMode="numeric"
                maxLength={11}
                autoComplete="tel"
                aria-describedby={errorId}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold">验证码</span>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  className="pl-9"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6 位验证码"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  aria-describedby={errorId}
                />
              </div>
              <Button type="button" variant="outline" onClick={() => void sendCode()} disabled={requesting || countdown > 0}>
                {requesting ? <Loader2 className="size-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : "获取验证码"}
              </Button>
            </div>
          </label>

          {demoCode && (
            <div className="rounded-[var(--radius-control)] border border-dashed border-[var(--accent)]/40 bg-[var(--accent-faint)] p-3">
              <div className="text-xs font-semibold text-[var(--accent-strong)]">演示验证码</div>
              <div className="tnum mt-1 font-mono text-lg font-bold tracking-[.3em] text-[var(--ink)]">{demoCode}</div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{notice}</p>
            </div>
          )}

          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loggingIn} aria-busy={loggingIn}>
            {loggingIn ? <Loader2 className="size-4 animate-spin" /> : null}
            {loggingIn ? "正在进入供应商入口…" : "登录并进入供应商入口"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-[var(--muted)]">
          登录即表示你确认使用本手机号作为供应商身份标识。相关说明见{" "}
          <Link href="/terms" className="font-semibold text-[var(--accent-strong)] underline underline-offset-2 hover:text-[var(--accent)]">
            《平台须知》
          </Link>
          。
        </p>
      </div>
    </AuthLayout>
  );
}
