import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { BRAND_COLORS } from "@/lib/theme";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "链谈 Agent | 供应商智能接待、分层谈判与筛选",
    template: "%s | 链谈 Agent",
  },
  description:
    "为中小采购商家自动接待、筛选并分层供应商的谈判系统。大模型负责理解和表达，底线、评分和决策由程序完成。",
  applicationName: "链谈 Agent",
  keywords: ["供应商管理", "采购谈判", "AI 谈判", "供应商筛选", "采购工作台", "供应链"],
  authors: [{ name: "链谈 Agent" }],
  openGraph: {
    title: "链谈 Agent · 把时间留给真正值得谈的供应商",
    description: "自动接待、底线校验、分层转人工：把精力只花在值得谈的供应商上。",
    url: "/",
    siteName: "链谈 Agent",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "链谈 Agent 供应商智能谈判工作台" }],
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "链谈 Agent · 把时间留给真正值得谈的供应商",
    description: "自动接待、底线校验、分层转人工：把精力只花在值得谈的供应商上。",
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND_COLORS.accent,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
