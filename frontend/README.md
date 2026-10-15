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
  demo-stage/           首页影片的「摄影棚」，只给录制脚本用（noindex，不面向用户）
src/components/         业务组件（车壳、消息、商品库抽屉、认证页外壳、滚动入场容器）
src/components/ui/      基础组件（button / card / input / dialog / toast …）
src/lib/                api 客户端、SSE 订阅、常量与设计令牌
src/components/negotiation-demo.tsx  影片源：每一帧都是时间的纯函数
scripts/build-demo-video.mjs         逐帧截图 + ffmpeg 编码，产出 public/demo/
```

## 动效规范

- 时长/缓动令牌集中在 `src/app/globals.css` 的 `:root`（`--dur-*` / `--ease-*`）。
  位移 ≤ 12px、缩放 ≤ 1.02、时长 ≤ 620ms，只用 ease 系曲线——不用弹跳、粒子、多色渐变。
- 滚动入场用 `<Reveal>`；首屏/分栏入场用 `anim-rise`、`anim-slide-right` 加 `anim-d1..d8` 排队。
- 所有入场隐藏态都写在 `html.motion` 之下，`layout.tsx` 的内联脚本只在
  「支持 IntersectionObserver 且系统未要求减少动态」时才挂这个类。JS 挂掉时页面
  直接呈现最终状态，不会白屏。
- 系统开启「减少动态效果」时：入场动画不落地、无限装饰动画停用、首页影片换成静态帧。

## 首页产品影片

`src/components/negotiation-demo.tsx` 是影片唯一的一份源（1280×960 定尺舞台），
片中没有任何 CSS 动画——位移、透明度、进度条、数字全部由 `time` 算出，因此同一个
时间点永远渲染出同一帧，可以逐帧录制：

```bash
npm run film:preview   # 只抓 10 个关键帧到 .demo-preview/，改片子时用这个快速校对
npm run film           # 全片渲染，产出 public/demo/negotiation.mp4 与封面 jpg
```

脚本会自己起一个 `next dev`（构建产物目录 `.next-film`，不会和本地 `npm run dev`
互相覆盖），用无头 Chrome 打开 `/demo-stage`，逐帧调 `window.__demoSeek(t)` 后截图，
PNG 直接管道喂给 ffmpeg 编码。需要 ffmpeg：优先用 PATH 里的，其次用仓库根的
`.tools/ffmpeg`，也可以用 `FFMPEG=/path/to/ffmpeg` 指定。

> 注意 `NEXT_DIST_DIR` 是 **build 与 start 两侧都读**的：手动构建时若用了
> `NEXT_DIST_DIR=.next-film npm run build`，启动也必须带上同一个变量，否则
> `next start` 会在 `.next` 里找不到 `BUILD_ID`。脚本自己管理这一对，不用管。

改完影片记得重新 `npm run film` 并把 `public/demo/` 下的产物一起提交——
页面用的是视频文件，不是实时渲染的组件。

## 检查命令

```bash
npx tsc --noEmit    # 类型检查
npm run lint        # ESLint
npm run build       # 生产构建
```
