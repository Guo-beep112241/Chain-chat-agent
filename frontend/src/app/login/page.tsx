"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KeyRound, Loader2, Smartphone, User } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { merchantCodeLogin, merchantLogin, requestMerchantCode, consumeSessionExpired, setMerchantAuth } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
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
  // 「为什么突然回到登录页」要说清楚，否则用户只会以为系统坏了。
  // 只在挂载后读：服务端没有 sessionStorage，写在 render 里会造成水合不一致。
  const [expiredNotice, setExpiredNotice] = useState(false);

  useEffect(() => { setExpiredNotice(consumeSessionExpired() !== null); }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function switchMode(next: "password" | "code") {
    setMode(next);
    setError("");
    setNotice("");
    setDemoCode("");
    // 输入框里的验证码必须一起清掉：它跟 demoCode 是同一轮取码的产物，
    // 只清展示块会留下一个「看不见但可以直接提交」的旧验证码。
    // 倒计时保留——它属于手机号而不是当前标签，清了反而会引诱用户连点撞 429。
    setCode("");
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

  const errorId = error ? "login-error" : undefined;

  return (
    <AuthLayout
      asideTitle="把时间留给真正值得谈的供应商"
      asideBody="链谈 Agent 自动接待上门的供应商，先按你的采购底线硬性筛选，再按七维权重打分分层。达到标准的才提醒你接手。"
    >
      <div className="p-7 sm:p-8">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">进入采购工作台</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          采购方用账号密码或手机验证码登录；供应商走手机号验证码入口。
        </p>

        {expiredNotice && (
          <p
            role="status"
            className="mt-4 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--paper)] px-3 py-2.5 text-xs leading-5 text-[var(--muted)]"
          >
            登录状态已过期（令牌默认 30 天有效），请重新登录后继续。
          </p>
        )}

        {/* 身份入口做成一行轻量导航，而不是第二个分段控件：
            两个长得一样的分段控件摞在一起，用户要先分辨「哪一排是身份、哪一排是方式」。
            这里只留「你在哪、怎么去对面」。 */}
        <div className="mt-6 flex items-center gap-2 text-xs">
          <span className="text-[var(--muted)]">当前身份</span>
          <span className="rounded-full bg-[var(--paper)] px-2.5 py-1 font-semibold text-[var(--ink)]">采购方</span>
          <Link
            href="/supplier/login"
            className="ml-auto font-semibold text-[var(--accent-strong)] underline underline-offset-2 transition-colors hover:text-[var(--accent)]"
          >
            我是供应商 →
          </Link>
        </div>

        {/* 登录方式切换用两个 aria-pressed 按钮而不是 role="tablist"：
            真正的 tab 语义要求非激活面板留在 DOM 里用 hidden 隐藏，而这里是互斥渲染——
            那样写会让其中一个 tab 的 aria-controls 永远指向不存在的 id。
            按钮语义在这里既准确又不需要自己实现方向键。 */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-[var(--radius-control)] bg-[var(--paper)] p-1">
          <button
            type="button"
            aria-pressed={mode === "password"}
            onClick={() => switchMode("password")}
            className={cn(
              "rounded-[var(--radius-chip)] px-3 py-2 text-xs font-semibold transition-colors",
              mode === "password" ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]",
            )}
          >
            账号密码登录
          </button>
          <button
            type="button"
            aria-pressed={mode === "code"}
            onClick={() => switchMode("code")}
            className={cn(
              "rounded-[var(--radius-chip)] px-3 py-2 text-xs font-semibold transition-colors",
              mode === "code" ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]",
            )}
          >
            手机验证码登录
          </button>
        </div>

        {mode === "password" ? (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold">登录账号</span>
              <div className="relative mt-2">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  className="pl-9"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="登录账号"
                  autoComplete="username"
                  // 手机键盘默认首字母大写，账号 admin 会被自动写成 Admin。
                  // 后端已按忽略大小写匹配，这里再从输入端关掉自动大写与自动纠错。
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={Boolean(error) && !account.trim()}
                  aria-describedby={errorId}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold">登录密码</span>
              <div className="mt-2">
                <PasswordInput
                  leadingIcon={<KeyRound className="size-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="登录密码"
                  autoComplete="current-password"
                  onKeyDown={(e) => { if (e.key === "Enter") void loginBuyer(); }}
                  aria-invalid={Boolean(error) && !password}
                  aria-describedby={errorId}
                />
              </div>
            </label>
          </div>
        ) : (
          <div id="panel-code" className="mt-4 space-y-3">
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
          </div>
        )}

        {error && (
          <div
            id="login-error"
            role="alert"
            className="mt-3 rounded-[var(--radius-control)] border border-[var(--danger)]/25 bg-[var(--danger-faint)] px-3 py-2.5 text-xs text-[var(--danger)]"
          >
            {error}
          </div>
        )}

        <Button
          variant="accent"
          size="lg"
          className="mt-5 w-full"
          disabled={submitting}
          aria-busy={submitting}
          onClick={() => void loginBuyer()}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitting ? "正在进入工作台…" : "登录并进入"}
        </Button>

        <p className="mt-5 text-center text-xs text-[var(--muted)]">
          没有账号？{" "}
          <Link href="/register" className="font-semibold text-[var(--accent-strong)] underline underline-offset-2 hover:text-[var(--accent)]">
            立即注册商家账号
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
