import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="animate-rise mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col justify-center py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)]"><ArrowLeft className="size-3.5" />返回</Link>

      <Card className="overflow-hidden">
        <div className="h-2 bg-[var(--accent)]" />
        <CardContent className="p-7 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight">平台须知</h1>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--muted)]">
            <p>
              欢迎使用「链谈 Agent」采购谈判工作台。注册并使用本平台即表示你已阅读、理解并同意本须知。
            </p>
            <p>
              本平台为演示用途：手机验证码为演示码（不发送真实短信），邮箱仅做格式与唯一性校验（不发送验证邮件）。
              平台基于你填写的采购规则自动评分、筛选供应商并生成谈判话术，最终采购决策与合同签订由商家自行负责。
            </p>
            <p>
              你提交的商家名称、联系方式、商品规则与谈判记录仅用于本次演示，请勿上传真实敏感信息。平台不会向第三方出售或共享你的数据。
            </p>
            <p>
              本须知为占位文案，正式上线前请替换为完整、合规的《用户协议》与《隐私政策》。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
