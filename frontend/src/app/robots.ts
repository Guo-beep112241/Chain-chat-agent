import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// 只收录公开可达的营销与登录页；工作台、洽谈页属于登录后区域，不进入索引。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register", "/terms", "/supplier/login"],
        disallow: ["/dashboard", "/negotiate", "/evaluation", "/settings", "/supplier", "/supplier/chat"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
