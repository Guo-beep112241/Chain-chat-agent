"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  FileBadge2,
  PackageOpen,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { evaluateSupplierOffer, getProductCatalog, getSupplierPhone, getSupplierToken, uploadQualificationFile, type ManagedProduct, type QualificationFile } from "@/lib/api";
import { DEBUG_TOOLS_ENABLED, QUALIFICATION_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type BottomLine = { label: string; spec: string; current: string; ok: boolean; hard: boolean; hint?: string };

const EMPTY_FORM = { company: "", contact: "", phone: "", price: "", moq: "", region: "", leadTime: "", payment: "", cooperation: "" };

export default function SupplierPage() {
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [serverResult, setServerResult] = useState<{ hardPass: boolean; score: number; level: string; negotiationId: number | null; classification?: string; hardFailReasons?: string[] } | null>(null);
  const [apiStatus, setApiStatus] = useState<"idle" | "saved" | "local">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [productId, setProductId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [qualFiles, setQualFiles] = useState<QualificationFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showAllChecks, setShowAllChecks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const product = products.find((p) => p.id === productId);
  const qualsNeedFiles = qualifications.length > 0 && qualFiles.length === 0;

  useEffect(() => {
    if (!getSupplierToken()) {
      const next = window.location.pathname + window.location.search;
      router.replace(`/supplier/login?next=${encodeURIComponent(next)}`);
      return;
    }
    const phone = getSupplierPhone();
    if (phone) setForm((f) => ({ ...f, phone }));
  }, [router]);

  useEffect(() => {
    getProductCatalog()
      .then((items) => { setProducts(items); setProductId(items[0]?.id ?? null); })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, []);

  // 必填项逐项判定，用于字段级提示与完成度进度，而不是只在提交时给一个总布尔值。
  const requiredFields = useMemo(() => ([
    { key: "product", label: "供货商品", ok: Boolean(product) },
    { key: "company", label: "企业名称", ok: Boolean(form.company.trim()) },
    { key: "contact", label: "联系人", ok: Boolean(form.contact.trim()) },
    { key: "region", label: "所在地区", ok: Boolean(form.region.trim()) },
    { key: "leadTime", label: "备货周期", ok: Boolean(form.leadTime) },
    { key: "price", label: "含税单价", ok: Boolean(form.price) },
    { key: "moq", label: "最低起订量", ok: Boolean(form.moq) },
    { key: "payment", label: "账期", ok: Boolean(form.payment) },
  ]), [product, form.company, form.contact, form.region, form.leadTime, form.price, form.moq, form.payment]);

  const missingFields = requiredFields.filter((item) => !item.ok);
  const doneCount = requiredFields.length - missingFields.length;
  const missingKey = (key: string) => missingFields.some((item) => item.key === key);
  const isReady = missingFields.length === 0 && !qualsNeedFiles;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadQualificationFile(file, form.company);
        setQualFiles((current) => [...current, uploaded]);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "上传失败，请重试");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleQualification(value: string) {
    setQualifications((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  // 提交前「底线对照」：只校验采购方设定的硬性底线（与后端 enforce_hard_rules 同口径），
  // 不再在前端复刻评分公式；最终评分与分类以提交后系统返回为准。
  const result = useMemo(() => {
    const checks: BottomLine[] = [];
    if (product) {
      const price = form.price === "" ? null : Number(form.price);
      const moq = form.moq === "" ? null : Number(form.moq);
      const leadDays = form.leadTime === "" ? null : Number(form.leadTime);
      const payment = form.payment === "" ? null : Number(form.payment);
      const hasRequired = product.required_qualifications.every((q) => qualifications.includes(q));
      const missingQuals = product.required_qualifications.filter((q) => !qualifications.includes(q));
      const inPreferredRegion = !product.preferred_regions.length || product.preferred_regions.some((r) => form.region.includes(r));
      // 已经填了数字但未达标时，直接算出「还差多少」，比只显示红色叉号可操作得多。
      const gap = (value: number | null, limit: number, unit: string, direction: "down" | "up") => {
        if (value === null) return `填写后需 ≤ ${limit}${unit}`;
        const delta = direction === "down" ? value - limit : limit - value;
        if (delta <= 0) return undefined;
        return direction === "down" ? `再降 ${Math.round(delta * 100) / 100}${unit} 即可达标` : `再增加 ${delta}${unit} 即可达标`;
      };
      checks.push(
        { label: "报价上限", spec: `≤ ¥${product.hard_max_price}`, current: price === null ? "未填" : `¥${price}`, ok: price !== null && price <= product.hard_max_price, hard: true, hint: price !== null && price > product.hard_max_price ? gap(price, product.hard_max_price, " 元", "down") : undefined },
        { label: "起订量上限", spec: `≤ ${product.max_moq} 件`, current: moq === null ? "未填" : `${moq} 件`, ok: moq !== null && moq <= product.max_moq, hard: true, hint: moq !== null && moq > product.max_moq ? gap(moq, product.max_moq, " 件", "down") : undefined },
        { label: "备货周期", spec: `≤ ${product.max_lead_days} 天`, current: leadDays === null ? "未填" : `${leadDays} 天`, ok: leadDays !== null && leadDays <= product.max_lead_days, hard: true, hint: leadDays !== null && leadDays > product.max_lead_days ? gap(leadDays, product.max_lead_days, " 天", "down") : undefined },
        { label: "账期", spec: `≥ ${product.max_payment_days} 天`, current: payment === null ? "未填" : `${payment} 天`, ok: payment !== null && payment >= product.max_payment_days, hard: true, hint: payment !== null && payment < product.max_payment_days ? gap(payment, product.max_payment_days, " 天", "up") : undefined },
        { label: "必备资质", spec: product.required_qualifications.length ? product.required_qualifications.join("、") : "无要求", current: product.required_qualifications.length ? `${product.required_qualifications.filter((q) => qualifications.includes(q)).length}/${product.required_qualifications.length}` : "—", ok: hasRequired, hard: true, hint: missingQuals.length ? `还缺：${missingQuals.join("、")}` : undefined },
        { label: "目标采购价", spec: `≤ ¥${product.target_price}`, current: price === null ? "未填" : `¥${price}`, ok: price !== null && price <= product.target_price, hard: false, hint: "参考目标，不构成一票否决" },
        { label: "产地偏好", spec: product.preferred_regions.length ? product.preferred_regions.join("、") : "不限地区", current: form.region ? (product.preferred_regions.length ? (inPreferredRegion ? "优先区域" : "普通区域") : "不限") : "未填", ok: inPreferredRegion, hard: false, hint: "参考目标，不构成一票否决" },
      );
    }
    const hardPass = product ? checks.filter((c) => c.hard).every((c) => c.ok) : false;
    return { hardPass, checks };
  }, [form.price, form.moq, form.leadTime, form.payment, form.region, product, qualifications]);

  const hardChecks = result.checks.filter((c) => c.hard);
  const softChecks = result.checks.filter((c) => !c.hard);
  const failedHard = hardChecks.filter((c) => !c.ok);

  const evaluateAndSubmit = useCallback(async () => {
    if (!product) return null;
    setSubmitting(true);
    try {
      const response = await evaluateSupplierOffer({
        product_id: product.id,
        company_name: form.company,
        contact_name: form.contact,
        phone: form.phone,
        region: form.region,
        quoted_price: Number(form.price),
        moq: Number(form.moq),
        lead_days: Number(form.leadTime),
        payment_days: Number(form.payment),
        qualifications,
        qualification_file_ids: qualFiles.map((file) => file.id),
        cooperation_note: form.cooperation,
        cooperation_rating: form.cooperation.length > 24 ? 90 : 60,
      });
      setServerResult({
        hardPass: response.hard_pass,
        score: response.score,
        level: response.classification === "qualified" ? "优质候选" : response.classification === "negotiating" ? "可进入议价" : "不匹配",
        negotiationId: response.negotiation_id,
        classification: response.classification,
        hardFailReasons: response.hard_fail_reasons,
      });
      setApiStatus("saved");
      return response;
    } catch {
      setServerResult({
        hardPass: result.hardPass,
        score: 0,
        level: result.hardPass ? "已通过底线" : "未通过底线",
        negotiationId: null,
        classification: result.hardPass ? "negotiating" : "eliminated",
        hardFailReasons: failedHard.map((c) => `${c.label} ${c.spec}（当前：${c.current}）`),
      });
      setApiStatus("local");
      return null;
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  }, [form, product, qualifications, qualFiles, result, failedHard]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await evaluateAndSubmit();
  }

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: "evaluate_current_supplier_offer",
        title: "评估当前供货方案",
        description: "校验供应商页面当前已填写的报价、起订量、资质、地区和配合方案，并在页面中展示分类结果。",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute() {
          if (!isReady || Number(form.price) <= 0 || Number(form.moq) <= 0) {
            throw new Error("请先完整填写供应商、联系方式、报价、起订量、地区和备货周期。");
          }
          const saved = await evaluateAndSubmit();
          return { status: saved ? "saved" : "local_demo", product: product?.name ?? "", score: saved?.score ?? null, classification: saved?.classification ?? (result.hardPass ? "negotiating" : "eliminated") };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch {
      return;
    }
    return () => lifecycle.abort();
  }, [evaluateAndSubmit, form.company, form.moq, form.price, isReady, product?.name, result.hardPass]);

  /* ——— 提交结果页 ——— */
  if (submitted && serverResult) {
    const displayResult = serverResult;
    const passed = displayResult.hardPass;
    const isTop = passed && displayResult.score >= (product?.handoff_score ?? 82);
    return (
      <div className="animate-rise mx-auto max-w-3xl py-8 sm:py-16">
        <Card className="overflow-hidden">
          <div className="h-2 bg-[var(--accent)]" />
          <CardContent className="p-7 sm:p-10">
            <div className={cn("grid size-14 place-items-center rounded-[var(--radius-card)]", passed ? "bg-[var(--success-faint)] text-[var(--success)]" : "bg-[var(--danger-faint)] text-[var(--danger)]")}>
              {passed ? <CheckCircle2 className="size-7" /> : <XCircle className="size-7" />}
            </div>
            <Badge className={cn("mt-6", isTop ? "border-[var(--success)]/20 bg-[var(--success-faint)] text-[var(--success)]" : passed ? "border-[var(--warning)]/20 bg-[var(--warning-faint)] text-[var(--warning)]" : "border-[var(--danger)]/20 bg-[var(--danger-faint)] text-[var(--danger)]")}>
              {displayResult.level} · <span className="tnum">{displayResult.score}</span> 分
            </Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              {passed ? "资料已通过底线校验" : "当前方案需要继续调整"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              {isTop
                ? "你的报价、起订量、资质和配合方案综合表现良好。系统已停止自动承诺，并提醒店长进入深度沟通。"
                : passed
                  ? "资料已入库，AI 将围绕价格、起订量与交付条款继续洽谈。在评分达到人工阈值前，不会打扰店长。"
                  : "当前方案触碰了采购底线，但会话不会直接结束。AI 会说明需要调整的条件，并继续与你寻找可接受的组合。"}
            </p>
            {!!displayResult.hardFailReasons?.length && !passed && (
              <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--danger)]/20 bg-[var(--danger-faint)] p-4">
                <div className="text-sm font-bold text-[var(--danger)]">当前方案需调整（暂不能进入人工确认）</div>
                <div className="mt-2 space-y-1.5 text-sm leading-6 text-[var(--danger)]">
                  {displayResult.hardFailReasons.map((reason) => <div key={reason}>· {reason}</div>)}
                </div>
              </div>
            )}
            <div className={cn("mt-5 rounded-[var(--radius-control)] px-3 py-2 text-xs", apiStatus === "saved" ? "bg-[var(--success-faint)] text-[var(--success)]" : "bg-[var(--warning-faint)] text-[var(--warning)]")}>
              {apiStatus === "saved" ? "已提交成功，采购方会尽快查看" : "提交未送达：服务暂时不可用，以下为本地预估结果，请稍后重新提交"}
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[var(--radius-control)] bg-[var(--paper)] p-4">
                <div className="text-xs text-[var(--muted)]">报价</div>
                <div className="tnum mt-1 font-bold">¥{form.price} / 件</div>
              </div>
              <div className="rounded-[var(--radius-control)] bg-[var(--paper)] p-4">
                <div className="text-xs text-[var(--muted)]">起订量</div>
                <div className="tnum mt-1 font-bold">{form.moq} 件</div>
              </div>
              <div className="rounded-[var(--radius-control)] bg-[var(--paper)] p-4">
                <div className="text-xs text-[var(--muted)]">资质完整度</div>
                <div className="tnum mt-1 font-bold">{qualifications.length} / {QUALIFICATION_OPTIONS.length}</div>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {serverResult.negotiationId && (
                <Link href={`/supplier/chat?id=${serverResult.negotiationId}`} className="flex-1">
                  <Button variant="accent" size="lg" className="w-full">
                    <Sparkles className="size-4" />进入 AI 洽谈 <ArrowRight className="size-4" />
                  </Button>
                </Link>
              )}
              {isTop && (
                <div className="flex-1 rounded-[var(--radius-control)] border border-[var(--accent)]/20 bg-[var(--accent-faint)] p-4 text-sm text-[var(--muted)]">
                  已判定为优质候选；商家接管前，AI 会继续与你沟通。
                </div>
              )}
              {DEBUG_TOOLS_ENABLED && serverResult.negotiationId && (
                <Link href={`/negotiate?id=${serverResult.negotiationId}&view=supplier-test`} className="flex-1">
                  <Button variant="outline" size="lg" className="w-full">
                    <Sparkles className="size-4" />扮演该供应商开始洽谈 <ArrowRight className="size-4" />
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="lg" className="flex-1" onClick={() => { setSubmitted(false); setServerResult(null); }}>
                返回修改资料
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ——— 表单 ——— */
  return (
    <div className="animate-rise mx-auto max-w-6xl">
      <div className="mb-6 grid gap-5 lg:grid-cols-[1fr_320px] lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--accent-strong)]">
            <span className="h-px w-5 bg-[var(--accent)]" />
            供应商自助入口
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">提交供货方案</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            如实填写报价、起订量、资质与配合方案。系统将自动匹配当前采购需求，合适的方案可直接进入 AI 洽谈。
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--success)]/20 bg-[var(--success-faint)] p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--success)]">
            <ShieldCheck className="size-4" />
            底线规则由程序校验
          </div>
          <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">AI 只负责理解与表达，不会绕过采购方设置的硬性条件。</p>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* 01 选择商品 */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <SectionTitle index="01" title="选择供货商品" note="来自采购方在工作台启用的商品库" />
              {productsLoading ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-[var(--radius-control)] bg-[var(--paper)]" />)}
                </div>
              ) : products.length ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {products.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={item.id === productId}
                      onClick={() => setProductId(item.id)}
                      className={cn(
                        "rounded-[var(--radius-control)] border p-4 text-left transition",
                        item.id === productId
                          ? "border-[var(--accent)] bg-[var(--accent-faint)]/50 ring-2 ring-[var(--accent-faint)]"
                          : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--ink)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <PackageOpen className={cn("size-5", item.id === productId ? "text-[var(--accent)]" : "text-[var(--muted)]")} />
                        {item.id === productId && <Check className="size-4 text-[var(--accent)]" />}
                      </div>
                      <div className="mt-4 text-sm font-bold">{item.name}</div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{item.category}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[var(--radius-control)] border border-dashed border-[var(--line)] p-5 text-sm text-[var(--muted)]">
                  采购方尚未启用商品，请稍后再来。
                </div>
              )}
            </CardContent>
          </Card>

          {/* 02 基本信息 */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <SectionTitle index="02" title="供应商基本信息" note="请手动填写，用于资质校验与后续联系" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="企业名称" required missing={missingKey("company")} error="请填写企业名称" className="sm:col-span-2">
                  <Input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="请输入供应商或企业名称"
                    aria-invalid={missingKey("company")}
                  />
                </Field>
                <Field label="联系人" required missing={missingKey("contact")} error="请填写联系人">
                  <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="请输入联系人" aria-invalid={missingKey("contact")} />
                </Field>
                <Field label="联系电话" note="已绑定登录手机号">
                  <Input value={form.phone} readOnly placeholder="已绑定登录手机号" />
                </Field>
                <Field label="所在地区" required missing={missingKey("region")} error="请填写所在地区">
                  <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="例如：福建泉州" aria-invalid={missingKey("region")} />
                </Field>
                <Field label="备货周期" required missing={missingKey("leadTime")} error="请填写备货周期">
                  <WithSuffix suffix="天">
                    <Input type="number" min="1" value={form.leadTime} onChange={(e) => setForm({ ...form, leadTime: e.target.value })} className="pr-12" placeholder="请输入天数" aria-invalid={missingKey("leadTime")} />
                  </WithSuffix>
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* 03 报价与合作 */}
          <Card>
            <CardContent className="p-5 sm:p-6">
              <SectionTitle index="03" title="报价、起订量与配合方案" note="请手动填写你可以真正履约的条件" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="含税单价" required missing={missingKey("price")} error="请填写含税单价">
                  <WithSuffix prefix="¥" suffix="元/件">
                    <Input type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="pl-7 pr-16" placeholder="请输入报价" aria-invalid={missingKey("price")} />
                  </WithSuffix>
                </Field>
                <Field label="最低起订量" required missing={missingKey("moq")} error="请填写最低起订量">
                  <WithSuffix suffix="件">
                    <Input type="number" min="1" value={form.moq} onChange={(e) => setForm({ ...form, moq: e.target.value })} className="pr-12" placeholder="请输入数量" aria-invalid={missingKey("moq")} />
                  </WithSuffix>
                </Field>
                <Field label="账期" required missing={missingKey("payment")} error="请填写账期">
                  <WithSuffix suffix="天">
                    <Input type="number" min="0" value={form.payment} onChange={(e) => setForm({ ...form, payment: e.target.value })} className="pr-12" placeholder="请输入天数" aria-invalid={missingKey("payment")} />
                  </WithSuffix>
                </Field>
                <Field label="合作与售后方案" className="sm:col-span-2">
                  <Textarea value={form.cooperation} onChange={(e) => setForm({ ...form, cooperation: e.target.value })} placeholder="可选填：是否支持小批测款、退换政策、二单排产等" />
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：完成度 → 资质 → 底线对照 → 提交 */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">填写完成度</div>
                <span className="tnum text-xs font-semibold text-[var(--muted)]">{doneCount} / {requiredFields.length}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--paper-deep)]">
                <div
                  className={cn("h-full rounded-full transition-all", isReady ? "bg-[var(--success)]" : "bg-[var(--accent)]")}
                  style={{ width: `${(doneCount / requiredFields.length) * 100}%` }}
                />
              </div>
              {missingFields.length ? (
                <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
                  还差 {missingFields.length} 项：{missingFields.map((item) => item.label).join("、")}
                  {qualsNeedFiles ? "、资质文件" : ""}
                </p>
              ) : (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--success)]">
                  <Check className="size-3.5" />必填项已完整，可以提交
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <FileBadge2 className="size-4 text-[var(--accent)]" />
                资质与能力
              </div>
              <div className="mt-4 space-y-2">
                {QUALIFICATION_OPTIONS.map((q) => (
                  <button
                    type="button"
                    key={q}
                    aria-pressed={qualifications.includes(q)}
                    onClick={() => toggleQualification(q)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[var(--radius-control)] border p-3 text-sm font-medium transition",
                      qualifications.includes(q)
                        ? "border-[var(--success)]/20 bg-[var(--success-faint)] text-[var(--success)]"
                        : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--ink)]",
                    )}
                  >
                    <span>{q}</span>
                    <span className={cn("grid size-5 place-items-center rounded border", qualifications.includes(q) ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--line)]")}>
                      {qualifications.includes(q) && <Check className="size-3" />}
                    </span>
                  </button>
                ))}
              </div>

              {/* 勾选资质后立刻展开上传区，不用等提交时才被告知要传文件 */}
              {qualifications.length > 0 && (
                <div className="mt-3">
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => void handleFiles(e.target.files)} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-[var(--accent)]/40 bg-[var(--accent-faint)]/40 p-3 text-xs font-semibold text-[var(--accent-strong)] transition hover:border-[var(--accent)] disabled:opacity-60"
                  >
                    <UploadCloud className="size-4" />
                    {uploading ? "正在上传…" : "上传资质文件（图片或 PDF）"}
                  </button>
                  <p className="mt-1.5 text-[11px] leading-4 text-[var(--muted)]">已勾选资质，至少上传一份文件供采购方核验。</p>
                  {uploadError && <div className="mt-2 text-[11px] font-semibold text-[var(--warning)]">{uploadError}</div>}
                  {qualsNeedFiles && <div className="mt-2 text-[11px] font-semibold text-[var(--warning)]">还需要上传至少一份资质文件</div>}
                </div>
              )}

              {!!qualFiles.length && (
                <div className="mt-3 space-y-2">
                  {qualFiles.map((file) => (
                    <div key={file.id} className="rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface)] p-3">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium" title={file.original_name}>{file.original_name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                            {file.ocr_status === "passed" && <span className="rounded bg-[var(--success-faint)] px-1.5 py-0.5 font-bold text-[var(--success)]">识别一致</span>}
                            {file.ocr_status === "mismatch" && <span className="rounded bg-[var(--danger-faint)] px-1.5 py-0.5 font-bold text-[var(--danger)]">识别不一致</span>}
                            {(file.ocr_status === "not_applicable" || file.ocr_status === "unavailable" || file.ocr_status === "not_checked") && <span className="rounded bg-[var(--warning-faint)] px-1.5 py-0.5 font-bold text-[var(--warning)]">转人工核验</span>}
                            <span className="tnum text-[var(--muted)]">{Math.max(1, Math.round(file.size_bytes / 1024))} KB</span>
                          </div>
                          {file.ocr_detail && <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{file.ocr_detail}</p>}
                        </div>
                        <button
                          type="button"
                          aria-label={`移除 ${file.original_name}`}
                          onClick={() => setQualFiles((current) => current.filter((f) => f.id !== file.id))}
                          className="grid size-6 shrink-0 place-items-center rounded-[var(--radius-chip)] border border-[var(--line)] transition hover:border-[var(--ink)]"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ShieldCheck className={cn("size-4", result.hardPass ? "text-[var(--success)]" : "text-[var(--muted)]")} />
                  底线对照
                </div>
                {product && (
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", result.hardPass ? "bg-[var(--success-faint)] text-[var(--success)]" : failedHard.length ? "bg-[var(--warning-faint)] text-[var(--warning)]" : "bg-[var(--paper)] text-[var(--muted)]")}>
                    {!product ? "—" : result.hardPass ? "硬性底线全部满足" : `还差 ${failedHard.length} 项`}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                只校验采购方设定的硬性底线，不做评分预估；最终分类以提交后系统判定为准。
              </p>

              {product ? (
                <>
                  <div className="mt-4 space-y-2.5">
                    {hardChecks.map((c) => (
                      <div key={c.label} className="flex items-start justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold">{c.label}</div>
                          <div className="tnum text-[11px] text-[var(--muted)]">{c.spec}</div>
                          {!c.ok && c.hint && (
                            <div className="mt-0.5 text-[11px] font-semibold text-[var(--warning)]">{c.hint}</div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className={cn("tnum", !c.ok && "text-[var(--warning)]")}>{c.current}</span>
                          {c.ok ? <Check className="size-3.5 text-[var(--success)]" /> : <X className="size-3.5 text-[var(--muted)]" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAllChecks((v) => !v)}
                    aria-expanded={showAllChecks}
                    className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-strong)]"
                  >
                    <ChevronDown className={cn("size-3.5 transition-transform", showAllChecks && "rotate-180")} />
                    {showAllChecks ? "收起参考目标" : "查看参考目标（不构成一票否决）"}
                  </button>
                  {showAllChecks && (
                    <div className="mt-3 space-y-2.5 border-t border-[var(--line)] pt-3">
                      {softChecks.map((c) => (
                        <div key={c.label} className="flex items-start justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--muted)]">{c.label}</div>
                            <div className="tnum text-[11px] text-[var(--muted)]">{c.spec}</div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="tnum text-[var(--muted)]">{c.current}</span>
                            {c.ok ? <Check className="size-3.5 text-[var(--success)]" /> : <X className="size-3.5 text-[var(--muted)]" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4 text-xs text-[var(--muted)]">请先选择供货商品。</div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" variant="accent" size="lg" className="w-full" disabled={submitting || !isReady}>
            <Building2 className="size-4" />
            {submitting ? "正在校验…" : isReady ? "校验并提交方案" : `还需填写 ${missingFields.length + (qualsNeedFiles ? 1 : 0)} 项`}
          </Button>
          <p className="text-center text-[11px] leading-4 text-[var(--muted)]">
            提交即表示你确认信息真实。系统会将报价和谈判记录用于本次供应商评估。
          </p>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({ index, title, note }: { index: string; title: string; note: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="tnum grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--ink)] text-sm font-bold text-white">{index}</span>
      <div>
        <h2 className="font-bold">{title}</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">{note}</p>
      </div>
    </div>
  );
}

function Field({
  label, required, missing, error, note, className, children,
}: {
  label: string; required?: boolean; missing?: boolean; error?: string; note?: string;
  className?: string; children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        {label}
        {required && !missing && <Check className="size-3.5 text-[var(--success)]" />}
      </span>
      <div className="mt-2">{children}</div>
      {missing && error && <span className="mt-1 block text-[11px] font-semibold text-[var(--warning)]">{error}</span>}
      {note && <span className="mt-1 block text-[11px] text-[var(--muted)]">{note}</span>}
    </label>
  );
}

function WithSuffix({ prefix, suffix, children }: { prefix?: string; suffix: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">{prefix}</span>}
      {children}
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">{suffix}</span>
    </div>
  );
}
