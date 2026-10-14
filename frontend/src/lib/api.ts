export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// 说明：这里刻意不再引用任何 NEXT_PUBLIC_ADMIN_TOKEN。
// 只要代码里出现该变量，Next 就会把它内联进客户端产物——即使运行时用不到，
// 任何人打开 devtools 也能读到令牌原文。因此前端完全不携带管理员令牌，
// 一律走商家登录拿到的 token；本地调试请用演示账号登录。

const SUPPLIER_TOKEN_KEY = "liantan_supplier_token";
const SUPPLIER_PHONE_KEY = "liantan_supplier_phone";
const MERCHANT_TOKEN_KEY = "liantan_merchant_token";

type AuthMode = "admin" | "supplier" | "none";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function getSupplierToken(): string | null { return safeGet(SUPPLIER_TOKEN_KEY); }
export function getSupplierPhone(): string | null { return safeGet(SUPPLIER_PHONE_KEY); }
export function setSupplierAuth(token: string, phone: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SUPPLIER_TOKEN_KEY, token); window.localStorage.setItem(SUPPLIER_PHONE_KEY, phone); } catch { /* ignore */ }
}
export function clearSupplierAuth() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(SUPPLIER_TOKEN_KEY); window.localStorage.removeItem(SUPPLIER_PHONE_KEY); } catch { /* ignore */ }
}
export function getMerchantToken(): string | null { return safeGet(MERCHANT_TOKEN_KEY); }
export function setMerchantAuth(token: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(MERCHANT_TOKEN_KEY, token); } catch { /* ignore */ }
}
export function clearMerchantAuth() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(MERCHANT_TOKEN_KEY); } catch { /* ignore */ }
}

export type SupplierOffer = {
  product_id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  region: string;
  quoted_price: number;
  moq: number;
  lead_days: number;
  payment_days: number;
  qualifications: string[];
  qualification_file_ids: string[];
  cooperation_note: string;
  cooperation_rating: number;
};

export type Evaluation = {
  negotiation_id: number | null;
  hard_pass: boolean;
  hard_fail_reasons: string[];
  score: number;
  classification: "eliminated" | "negotiating" | "qualified";
  action: "polite_close" | "continue_ai_negotiation" | "manual_handoff";
  score_breakdown: Record<string, number>;
};

export type ManagedProduct = {
  id: number; name: string; category: string; description: string; active: boolean;
  target_price: number; hard_max_price: number; max_moq: number; max_lead_days: number;
  max_payment_days: number; handoff_score: number; required_qualifications: string[]; preferred_regions: string[];
  scoring_model: "custom_rule" | "ml"; score_weights: Record<string, number>;
  ml_model: string; ml_qualify_threshold: number; ml_eliminate_threshold: number;
};

export type DashboardItem = {
  id: number; supplier: string; product: string; score: number; price: number; moq: number;
  status: string; classification: string; is_today: boolean; created_at: string; last_activity_at: string;
};
export type DashboardSummary = {
  today_received: number; ai_active: number; qualified: number; minutes_saved: number;
  items: DashboardItem[]; range_days: number; range_received: number;
};
export type QualificationFile = { id: string; original_name: string; content_type: string; size_bytes: number; verified: boolean; ocr_status: string; ocr_company: string; ocr_detail: string; uploaded_at: string };
export type Negotiation = {
  id: number; score: number; classification: string; status: string; quoted_price: number; moq: number; lead_days: number; payment_days: number;
  hard_fail_reasons: string[]; supplier: { id: number; company_name: string; contact_name: string; region: string; qualifications: string[]; qualification_files: QualificationFile[] };
  product: { id: number; name: string; category: string; description: string };
  messages: { id: number; sender: "supplier" | "ai" | "human" | "system"; content: string; created_at: string }[];
};
export type SupplierReply = {
  negotiation_id: number; status: string; assistant_message: string | null; handoff_required: boolean; classification: "eliminated" | "negotiating" | "qualified"; score: number;
};
export type SupplierCode = { phone: string; code: string; expires_in: number };
export type SupplierToken = { access_token: string; phone: string };
export type MerchantProfile = { store_name: string; logo_emoji: string; logo_image: string; contact: string; category: string };
export type MerchantToken = MerchantProfile & { access_token: string };
export type MerchantCode = { phone: string; code: string; expires_in: number };
export type RegisterPayload = {
  account: string;
  password: string;
  store_name: string;
  phone: string;
  email: string;
  agree_terms: boolean;
};
export type EvaluationDataset = { key: string; label: string; filename: string; exists: boolean; count: number; size_bytes: number };
export type RuleEvaluationCase = { case_id: string; group: string; supplier: string; product: string; expected: string; actual: string; matched: boolean; score: number; reasons: string[] };
export type RuleEvaluationResult = {
  total: number; matched: number; accuracy: number; distribution: Record<string, number>;
  matrix: Record<string, Record<string, number>>;
  groups: { group: string; total: number; matched: number; accuracy: number }[];
  mismatches: RuleEvaluationCase[]; notes: string[];
};
export type DialogueEvaluationResult = {
  total: number; passed: number; pass_rate: number; llm_configured: boolean; fallback_count: number; note: string;
  results: { case_id: string; type: string; message: string; intent: string; expected_strategy: string; reply: string; strategy_pass: boolean; safety_pass: boolean; passed: boolean; generation_mode: "model" | "fallback" }[];
};
export type MLEvaluationResult = {
  model: string; accuracy: number; candidate_accuracy: Record<string, number>; cv_accuracy_mean: number;
  confusion_matrix: Record<string, Record<string, number>>; per_class_recall: Record<string, number>;
  feature_importance: Record<string, number>; decision_tree_rules: string | null; rule_engine_baseline_accuracy: number; note: string;
};

async function request<T>(path: string, init?: RequestInit, auth: AuthMode = "none"): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> | undefined) };
  if (init?.body instanceof FormData) delete headers["Content-Type"]; // 让浏览器自带 multipart boundary
  else if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (auth === "admin") {
    // 采购方登录后的商家 token；未登录则不带鉴权头，由后端返回 401。
    const token = getMerchantToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  else if (auth === "supplier") {
    const token = getSupplierToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "请求失败" }));
    throw new Error(body.detail || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// —— 认证 ——
export function requestSupplierCode(phone: string) {
  return request<SupplierCode>("/api/auth/supplier/request-code", { method: "POST", body: JSON.stringify({ phone }) });
}
export function supplierLogin(phone: string, code: string) {
  return request<SupplierToken>("/api/auth/supplier/login", { method: "POST", body: JSON.stringify({ phone, code }) });
}
export function supplierLogout() {
  return request<{ ok: boolean }>("/api/auth/supplier/logout", { method: "POST" }, "supplier");
}

// —— 采购方（商家）账号 ——
export function merchantLogin(account: string, password: string) {
  return request<MerchantToken>("/api/auth/merchant/login", { method: "POST", body: JSON.stringify({ account, password }) });
}
export function requestMerchantCode(phone: string) {
  return request<MerchantCode>("/api/auth/merchant/request-code", { method: "POST", body: JSON.stringify({ phone }) });
}
export function merchantCodeLogin(phone: string, code: string) {
  return request<MerchantToken>("/api/auth/merchant/login-code", { method: "POST", body: JSON.stringify({ phone, code }) });
}
export function merchantRegister(payload: RegisterPayload) {
  return request<MerchantToken>("/api/auth/merchant/register", { method: "POST", body: JSON.stringify(payload) });
}
export function merchantLogout() {
  return request<{ ok: boolean }>("/api/auth/merchant/logout", { method: "POST" }, "admin");
}
export function changeMerchantPassword(current_password: string, new_password: string) {
  // 改密会吊销所有旧令牌，响应里带回新令牌，前端必须换掉本地这份。
  return request<{ ok: boolean; access_token?: string }>("/api/auth/merchant/password", { method: "PUT", body: JSON.stringify({ current_password, new_password }) }, "admin");
}
export function getMerchantProfile() {
  return request<MerchantProfile>("/api/merchant/profile", undefined, "admin");
}
export function updateMerchantProfile(payload: MerchantProfile) {
  return request<MerchantProfile>("/api/merchant/profile", { method: "PUT", body: JSON.stringify(payload) }, "admin");
}

// —— 供应商侧 ——
export function evaluateSupplierOffer(payload: SupplierOffer) {
  return request<Evaluation>("/api/suppliers/evaluate", { method: "POST", body: JSON.stringify(payload) }, "supplier");
}
export function getProductCatalog() { return request<ManagedProduct[]>("/api/products/catalog", undefined, "supplier"); }
export function getNegotiation(id: number, auth: AuthMode = "supplier") { return request<Negotiation>(`/api/negotiations/${id}`, undefined, auth); }
export function sendSupplierMessage(id: number, content: string, auth: AuthMode = "supplier") { return request<SupplierReply>(`/api/negotiations/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }, auth); }
export function getSupplierNegotiations() { return request<Negotiation[]>("/api/supplier/negotiations", undefined, "supplier"); }
export function uploadQualificationFile(file: File, companyName: string) {
  const body = new FormData();
  body.append("file", file);
  body.append("company_name", companyName);
  return request<QualificationFile>("/api/uploads/qualification-files", { method: "POST", body }, "supplier");
}
export async function openQualificationFile(fileId: string) {
  const token = getMerchantToken();
  const response = await fetch(`${API_BASE}/api/uploads/${fileId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("文件读取失败");
  const url = URL.createObjectURL(await response.blob());
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export function toggleQualificationVerified(fileId: string) { return request<QualificationFile>(`/api/qualification-files/${fileId}/verify`, { method: "POST" }, "admin"); }

// —— 商家侧 ——
export function handoffNegotiation(negotiationId: number) {
  return request<Negotiation>(`/api/negotiations/${negotiationId}/handoff`, { method: "POST" }, "admin");
}
export function updateProcurementRule(productId: number, payload: Record<string, unknown>) {
  return request(`/api/rules/${productId}`, { method: "PUT", body: JSON.stringify(payload) }, "admin");
}
export function getManagedProducts() { return request<ManagedProduct[]>("/api/products/manage", undefined, "admin"); }
export function createProduct(payload: Omit<ManagedProduct, "id" | "active">) { return request<ManagedProduct>("/api/products", { method: "POST", body: JSON.stringify(payload) }, "admin"); }
export function updateProduct(id: number, payload: Omit<ManagedProduct, "id">) { return request<ManagedProduct>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }, "admin"); }
export function disableProduct(id: number) { return request<{ ok: boolean; detail: string }>(`/api/products/${id}`, { method: "DELETE" }, "admin"); }
// days=0 表示全部历史；其余为「最近 N 天内新提交」的统计口径。
export function getDashboardSummary(days = 0) {
  return request<DashboardSummary>(`/api/dashboard/summary?days=${days}`, undefined, "admin");
}
export function getNegotiations() { return request<Negotiation[]>("/api/negotiations", undefined, "admin"); }
export function sendHumanMessage(id: number, content: string) { return request<Negotiation>(`/api/negotiations/${id}/human-messages`, { method: "POST", body: JSON.stringify({ content }) }, "admin"); }
export function resumeAiNegotiation(id: number) { return request<Negotiation>(`/api/negotiations/${id}/resume-ai`, { method: "POST" }, "admin"); }
export function getEvaluationDatasets() { return request<{ datasets: EvaluationDataset[]; llm_configured: boolean }>("/api/evaluations/datasets", undefined, "admin"); }
export function runRuleEvaluation() { return request<RuleEvaluationResult>("/api/evaluations/rules", { method: "POST" }, "admin"); }
export function runDialogueEvaluation(sampleSize: number, dialogueType?: string) { return request<DialogueEvaluationResult>("/api/evaluations/dialogues", { method: "POST", body: JSON.stringify({ sample_size: sampleSize, dialogue_type: dialogueType || null }) }, "admin"); }
export function runMLEvaluation() { return request<MLEvaluationResult>("/api/ml/evaluate", { method: "POST" }, "admin"); }
