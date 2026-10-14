import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center sm:p-10">
          <div className="mx-auto grid size-14 place-items-center rounded-[var(--radius-card)] bg-[var(--accent-faint)] text-[var(--accent)]">
            <Compass className="size-7" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">页面不存在</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            你访问的页面可能已被移动或删除。可以回到首页，或直接前往登录。
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="flex-1">
              <Button variant="accent" size="lg" className="w-full">返回首页</Button>
            </Link>
            <Link href="/login" className="flex-1">
              <Button variant="outline" size="lg" className="w-full">前往登录</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
