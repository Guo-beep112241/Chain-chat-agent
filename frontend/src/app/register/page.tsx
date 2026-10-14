"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Building2, KeyRound, Loader2, Mail, Smartphone, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { merchantRegister, setMerchantAuth } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      router.replace("/dashboard");
    } catch (err) { setError(err instanceof Error ? err.message : "注册失败"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="animate-rise mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"><ArrowLeft className="size-3.5" />返回首页</Link>

      <Card className="overflow-hidden">
        <div className="h-2 bg-[var(--accent)]" />
        <CardContent className="p-7 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[var(--ink)] text-white"><Building2 className="size-5" /></span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">注册商家账号</h1>
              <p className="mt-0.5 text-xs text-[var(--muted)]">注册成功后自动登录，进入采购工作台</p>
            </div>
          </div>

          {error && <div className="mt-4 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning-faint)] p-3 text-sm text-[var(--warning)]">{error}</div>}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label>
              <span className="text-xs font-semibold">登录账号</span>
              <div className="relative mt-2">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input className="pl-9" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="3-80 位字母、数字或下划线" autoFocus />
              </div>
            </label>

            <label>
              <span className="text-xs font-semibold">密码</span>
              <div className="relative mt-2">
                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input type="password" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="大于 8 位，且同时包含字母和数字" />
              </div>
            </label>

            <label>
              <span className="text-xs font-semibold">确认密码</span>
              <div className="relative mt-2">
                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input type="password" className="pl-9" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再次输入密码" />
              </div>
            </label>

            <label>
              <span className="text-xs font-semibold">商家名称</span>
              <div className="relative mt-2">
                <Store className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input className="pl-9" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="例如：小鹿生活馆" />
              </div>
            </label>

            <label>
              <span className="text-xs font-semibold">绑定手机号</span>
              <div className="relative mt-2">
                <Smartphone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11 位手机号" inputMode="numeric" maxLength={11} />
              </div>
            </label>

            <label>
              <span className="text-xs font-semibold">绑定邮箱</span>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" type="email" />
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" />
              <span className="text-xs leading-5 text-[var(--muted)]">
                我已阅读并同意
                <Link href="/terms" target="_blank" className="mx-1 font-semibold text-[var(--accent-strong)] underline underline-offset-2">《平台须知》</Link>
                ，知晓平台数据使用与演示说明。
              </span>
            </label>

            <Button type="submit" variant="accent" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "注册并进入工作台"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-[var(--muted)]">
            已有账号？{" "}
            <Link href="/" className="font-semibold text-[var(--accent-strong)] underline underline-offset-2 hover:text-[var(--accent)]">返回登录</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
