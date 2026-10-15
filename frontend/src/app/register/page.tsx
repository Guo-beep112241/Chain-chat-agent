"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Check, KeyRound, Loader2, Mail, Smartphone, Store, User, X } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { merchantRegister, setMerchantAuth } from "@/lib/api";
import { cn } from "@/lib/utils";

const DRAFT_KEY = "liantan_register_draft";

type Draft = {
  account: string;
  storeName: string;
  phone: string;
  email: string;
  agree: boolean;
};

// 草稿里**刻意不存密码**：sessionStorage 同源可读，任何一段第三方脚本都能拿到，
// 而且浏览器会话恢复会把明文密码留得更久。用户多打一次密码，好过把密码写进存储。
function emptyDraft(): Draft {
  return { account: "", storeName: "", phone: "", email: "", agree: false };
}

function loadDraft(): Draft {
  if (typeof window === "undefined") return emptyDraft();
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (raw) return { ...emptyDraft(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return emptyDraft();
}

function saveDraft(draft: Draft) {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* ignore */ }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

function passwordChecks(pw: string) {
  return [
    { ok: pw.length > 8, label: "长度大于 8 位" },
    { ok: /[a-zA-Z]/.test(pw), label: "包含英文字母" },
    { ok: /[0-9]/.test(pw), label: "包含数字" },
  ];
}

export default function RegisterPage() {
  const router = useRouter();
  const [initial] = useState<Draft>(loadDraft);
  const [account, setAccount] = useState(initial.account);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [storeName, setStoreName] = useState(initial.storeName);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [agree, setAgree] = useState(initial.agree);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    saveDraft({ account, storeName, phone, email, agree });
  }, [account, storeName, phone, email, agree]);

  const checks = passwordChecks(password);
  const doneCount = checks.filter((c) => c.ok).length;
  const passwordOk = doneCount === 3;

  function validate(): string | null {
    if (!/^[A-Za-z0-9_]{3,80}$/.test(account.trim())) return "账号需 3-80 位，仅限字母、数字、下划线";
    if (password.length <= 8) return "密码长度需大于 8 个字符";
    if (!/[a-zA-Z]/.test(password)) return "密码需至少包含一个英文字母";
    if (!/[0-9]/.test(password)) return "密码需至少包含一个数字";
    if (password !== confirm) return "两次输入的密码不一致";
    if (!storeName.trim()) return "请填写商家名称";
    if (!/^\d{11}$/.test(phone.trim())) return "请输入 11 位手机号";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return "请输入正确的邮箱地址";
    if (!agree) return "请先阅读并勾选同意平台须知";
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); return; }
    setSubmitting(true); setError("");
    try {
      const res = await merchantRegister({
        account: account.trim(),
        password,
        store_name: storeName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        agree_terms: true,
      });
      setMerchantAuth(res.access_token);
      clearDraft();
      router.replace("/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "注册失败"); }
    finally { setSubmitting(false); }
  }

  const errorId = error ? "register-error" : undefined;

  return (
    <AuthLayout
      asideTitle="先把底线写下来，再让 AI 去谈"
      asideBody="注册后即可为每个商品配置目标价、硬性上限、起订量、交期与账期，并自定义七维评分权重。规则怎么定，AI 就怎么谈。"
    >
      <div className="p-7 sm:p-8">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">注册商家账号</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">注册成功后自动登录，直接进入采购工作台。</p>

        {error && (
          <div
            id="register-error"
            role="alert"
            className="mt-5 rounded-[var(--radius-control)] border border-[var(--danger)]/25 bg-[var(--danger-faint)] px-3 py-2.5 text-xs text-[var(--danger)]"
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold">登录账号</span>
            <div className="relative mt-2">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                className="pl-9"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="3-80 位字母、数字或下划线"
                autoComplete="username"
                autoFocus
                aria-describedby={errorId}
              />
            </div>
          </label>

          <div>
            <label className="block">
              <span className="text-xs font-semibold">密码</span>
              <div className="mt-2">
                <PasswordInput
                  leadingIcon={<KeyRound className="size-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="大于 8 位，且同时包含字母和数字"
                  autoComplete="new-password"
                  aria-describedby="register-password-rules"
                />
              </div>
            </label>
            {/* 三列一行 + 固定行高：原来竖排三行插在「密码」和「确认密码」之间，
                一输入首字符下面所有字段就整体下移 70px——边填边跳是最容易被记住的廉价感。 */}
            <div id="register-password-rules" className="mt-2 min-h-[18px]">
              <span className="block h-1 w-full overflow-hidden rounded-full bg-[var(--line)]">
                <span
                  className={cn("block h-full rounded-full transition-[width,background-color]", passwordOk ? "bg-[var(--success)]" : "bg-[var(--accent)]")}
                  style={{ width: `${(doneCount / 3) * 100}%` }}
                />
              </span>
              <ul className="mt-2 grid grid-cols-3 gap-1">
                {checks.map((c) => (
                  <li
                    key={c.label}
                    className={cn("flex items-center gap-1 text-[11px] leading-4", c.ok ? "text-[var(--success)]" : "text-[var(--muted)]")}
                  >
                    {c.ok ? <Check className="size-3 shrink-0" /> : <X className="size-3 shrink-0" />}
                    <span className="truncate">{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold">确认密码</span>
            <div className="mt-2">
              <PasswordInput
                leadingIcon={<KeyRound className="size-4" />}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
                aria-describedby={errorId}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold">商家名称</span>
            <div className="relative mt-2">
              <Store className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input className="pl-9" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="例如：小鹿生活馆" aria-describedby={errorId} />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold">绑定手机号</span>
            <div className="relative mt-2">
              <Smartphone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11 位手机号" inputMode="numeric" maxLength={11} autoComplete="tel" aria-describedby={errorId} />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold">绑定邮箱</span>
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" type="email" autoComplete="email" aria-describedby={errorId} />
            </div>
          </label>

          {/* checkbox 与链接必须分开：把 <Link> 包在 <label> 里，点链接时部分浏览器
              会顺手把勾选框也切一下。 */}
          <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--paper)] p-3">
            <input
              id="agree-terms"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
            />
            <div className="text-xs leading-5 text-[var(--muted)]">
              <label htmlFor="agree-terms" className="cursor-pointer">我已阅读并同意</label>
              <Link href="/terms" className="mx-1 font-semibold text-[var(--accent-strong)] underline underline-offset-2">《平台须知》</Link>
              ，知晓平台数据使用与演示说明。
            </div>
          </div>

          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={submitting} aria-busy={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitting ? "正在创建账号…" : "注册并进入工作台"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-[var(--muted)]">
          已有账号？{" "}
          <Link href="/login" className="font-semibold text-[var(--accent-strong)] underline underline-offset-2 hover:text-[var(--accent)]">
            返回登录
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
