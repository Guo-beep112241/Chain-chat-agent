"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, KeyRound, Loader2, PackageOpen, Smartphone, User } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { merchantCodeLogin, merchantLogin, requestMerchantCode, setMerchantAuth } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "buyer">("choose");
  const [mode, setMode] = useState<"password" | "code">("password");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [notice, setNotice] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function close() {
    setOpen(false);
    setStep("choose");
    setMode("password");
    setAccount("");
    setPassword("");
    setPhone("");
    setCode("");
    setDemoCode("");
    setNotice("");
    setCountdown(0);
    setError("");
  }

  function switchMode(next: "password" | "code") {
    setMode(next);
    setError("");
    setNotice("");
    setDemoCode("");
  }

  function goSupplier() {
    router.push("/supplier");
  }

  function goRegister() {
    close();
    router.push("/register");
  }

  async function sendCode() {
    if (!/^\d{11}$/.test(phone.trim())) {
      setError("请输入 11 位手机号");
      return;
    }
    setRequesting(true);
    setError("");
    setNotice("");
    try {
      const res = await requestMerchantCode(phone.trim());
      setDemoCode(res.code ?? "");
      setCode(res.code ?? ""); // 演示模式：验证码自动填入
      setNotice(res.code ? `演示验证码已生成：${res.code}（5 分钟内有效）` : "验证码已发送，请查看短信");
      setCountdown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取验证码失败");
    } finally {
      setRequesting(false);
    }
  }

  async function loginBuyer() {
    setError("");
    if (mode === "password") {
      if (!account.trim()) { setError("请输入登录账号"); return; }
      if (!password) { setError("请输入登录密码"); return; }
    } else {
      if (!/^\d{11}$/.test(phone.trim())) { setError("请输入 11 位手机号"); return; }
      if (!code.trim()) { setError("请输入验证码"); return; }
    }
    setSubmitting(true);
    try {
      const res = mode === "password"
        ? await merchantLogin(account.trim(), password)
        : await merchantCodeLogin(phone.trim(), code.trim());
      setMerchantAuth(res.access_token);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="animate-rise w-full max-w-md">
        <Card className="overflow-hidden">
          <div className="h-2 bg-[var(--accent)]" />
          <CardContent className="p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="grid size-16 place-items-center rounded-2xl bg-[var(--ink)] shadow-lg">
                <BrandMark />
              </div>
              <h1 className="mt-6 text-3xl font-bold tracking-tight">
                链谈 <span className="text-[var(--accent)]">Agent</span>
              </h1>
              <p className="mt-1 text-[10px] tracking-[.22em] text-[var(--muted)]">SUPPLY NEGOTIATOR</p>
              <p className="mt-5 max-w-xs text-sm leading-6 text-[var(--muted)]">为中小商家自动接待、筛选和分层供应商的采购谈判工作台。</p>
            </div>
            <Button
              variant="accent"
              size="lg"
              className="mt-8 w-full"
              onClick={() => {
                setStep("choose");
                setError("");
                setOpen(true);
              }}
            >
              登录
            </Button>
            <p className="mt-4 text-center text-xs leading-4 text-[var(--muted)]">采购方使用账号密码或手机验证码登录 · 供应商使用手机号验证码登录</p>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={open}
        onClose={close}
        title={step === "choose" ? "选择进入身份" : "采购方登录"}
        description={step === "choose" ? "采购方与供应商对应不同的进入方式" : "账号密码或手机验证码两种方式进入采购工作台"}
        footer={step === "buyer" ? (
          <>
            <div className="w-full">
              <Button variant="accent" size="lg" className="w-full" disabled={submitting} onClick={() => void loginBuyer()}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : "登录并进入"}
              </Button>
              <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--paper)] p-3 text-xs leading-5 text-[var(--muted)]">
                演示凭证：账号 <span className="font-semibold text-[var(--ink)]">admin</span> · 手机号 <span className="font-semibold text-[var(--ink)]">13800138000</span>。验证码为演示码，点击「获取验证码」直接返回。
              </div>
              <p className="mt-4 text-center text-xs text-[var(--muted)]">
                没有账号？{" "}
                <button onClick={goRegister} className="font-semibold text-[var(--accent-strong)] underline underline-offset-2 hover:text-[var(--accent)]">
                  立即注册
                </button>
              </p>
            </div>
          </>
        ) : undefined}
      >
        {step === "choose" ? (
          <div className="space-y-3">
            <button
              onClick={() => setStep("buyer")}
              className="flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-faint)]/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--ink)] text-white"><Building2 className="size-5" /></span>
              <span><span className="block text-sm font-bold">采购方</span><span className="block text-xs text-[var(--muted)]">密码登录，进入采购工作台与实时谈判</span></span>
            </button>
            <button
              onClick={goSupplier}
              className="flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--accent)] hover:bg-[var(--accent-faint)]/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--ink)] text-white"><PackageOpen className="size-5" /></span>
              <span><span className="block text-sm font-bold">供应商</span><span className="block text-xs text-[var(--muted)]">手机号登录，进入供应商入口</span></span>
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => { setStep("choose"); switchMode("password"); setError(""); setAccount(""); setPassword(""); setPhone(""); setCode(""); setDemoCode(""); setNotice(""); setCountdown(0); }}
              className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
            >
              <ArrowLeft className="size-3.5" />返回身份选择
            </button>

            <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-[var(--paper)] p-1">
              <button
                onClick={() => switchMode("password")}
                className={cn("rounded-[var(--radius-chip)] px-3 py-2 text-xs font-semibold transition", mode === "password" ? "bg-[var(--surface)] text-[var(--ink)] shadow" : "text-[var(--muted)] hover:text-[var(--ink)]")}
              >
                账号密码登录
              </button>
              <button
                onClick={() => switchMode("code")}
                className={cn("rounded-[var(--radius-chip)] px-3 py-2 text-xs font-semibold transition", mode === "code" ? "bg-[var(--surface)] text-[var(--ink)] shadow" : "text-[var(--muted)] hover:text-[var(--ink)]")}
              >
                手机验证码登录
              </button>
            </div>

            {mode === "password" ? (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                  <Input className="pl-9" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="登录账号" />
                </div>
                <PasswordInput leadingIcon={<KeyRound className="size-4" />} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="登录密码" onKeyDown={(e) => { if (e.key === "Enter") void loginBuyer(); }} />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                  <Input className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入 11 位手机号" inputMode="numeric" maxLength={11} />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                    <Input className="pl-9" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 位验证码" inputMode="numeric" maxLength={6} />
                  </div>
                  <Button type="button" variant="outline" onClick={() => void sendCode()} disabled={requesting || countdown > 0 || !phone.trim()}>
                    {requesting ? <Loader2 className="size-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : "获取验证码"}
                  </Button>
                </div>
                {demoCode && (
                  <div className="rounded-[var(--radius-control)] border border-dashed border-[var(--accent)]/30 bg-[var(--accent-faint)] p-3 text-sm">
                    <div className="text-xs font-semibold text-[var(--accent-strong)]">演示验证码</div>
                    <div className="tnum mt-1 font-mono text-lg font-bold tracking-[.3em] text-[var(--ink)]">{demoCode}</div>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">{notice}</p>
                  </div>
                )}
              </div>
            )}

            {error && <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--warning)]/20 bg-[var(--warning-faint)] p-2.5 text-xs text-[var(--warning)]">{error}</div>}
          </>
        )}
      </Dialog>
    </div>
  );
}
