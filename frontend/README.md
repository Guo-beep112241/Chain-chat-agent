# 链谈 Agent · 前端

Next.js 15（App Router）+ TypeScript + Tailwind v4 + shadcn/ui 风格基础组件。

## 本地开发

```bash
npm install
cp .env.example .env.local   # 按需修改 NEXT_PUBLIC_API_URL
npm run dev                  # http://localhost:3000
```

后端需要同时在 `../backend` 启动（默认 http://localhost:8000），
否则页面会在控制台报 401/连接失败并显示「服务暂时不可用」。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 后端地址。构建时内联，改动后必须重新 build |
| `NEXT_PUBLIC_SHOW_DEBUG_ENTRY` | 设为 `true` 才显示洽谈页的「模拟供应商」自测视角，默认关闭 |

前端不携带任何管理员令牌，一律使用登录后拿到的商家 token。

## 目录结构

```text
src/app/                路由
  (merchant)/           商家端（工作台 / 实时谈判 / 测评 / 账号安全），共用 AppShell
  supplier/             供应商端（登录 / 提交方案 / 洽谈），共用 SupplierShell
  login, register, terms
src/components/         业务组件（车壳、消息、商品库抽屉）
src/components/ui/      基础组件（button / card / input / dialog / toast …）
src/lib/                api 客户端、SSE 订阅、常量与设计令牌
```

## 检查命令

```bash
npx tsc --noEmit    # 类型检查
npm run lint        # ESLint
npm run build       # 生产构建
```
