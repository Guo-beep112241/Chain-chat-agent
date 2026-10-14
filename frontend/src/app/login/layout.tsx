import type { Metadata } from "next";

// /login 是客户端组件，无法直接导出 metadata，用一层 layout 提供独立标题。
export const metadata: Metadata = {
  title: "登录",
  description: "采购方使用账号密码或手机验证码登录链谈 Agent 采购工作台。",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
