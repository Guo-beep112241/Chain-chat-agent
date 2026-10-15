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
      <head>
        {/* 动效开关。为什么必须是首屏同步内联脚本：
            滚动入场元素的隐藏态写在 `.motion .reveal{opacity:0}` 里，
            如果等 React 水合后再加类，内容会先完整显示一次再突然消失——
            那比不做动画更糟。放在这里可以在首次绘制前决定，不闪。
            它同时也是无障碍兜底：系统开了「减少动态效果」时根本不加这个类，
            于是所有入场隐藏态都不会落地，页面直接呈现最终状态。 */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&'IntersectionObserver' in window){document.documentElement.classList.add('motion')}}catch(e){}",
          }}
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
