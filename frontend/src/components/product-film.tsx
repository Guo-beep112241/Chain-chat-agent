"use client";

import * as React from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 首页 hero 的产品影片。
 *
 * 为什么是 <video> 而不是几张静态截图：
 *   截图只能给出一个终态（86 分、优质候选），而本产品的卖点恰恰是「过程可解释」——
 *   89 分是怎么来的、哪一步触线、谁把分拉上来的。影片按真实链路演一遍：
 *   自动接待 → 底线逐项核验 → 首次 62 分未达阈值 → AI 议价 → 重新校验 86 分 → 转人工。
 *   源文件与渲染脚本见 src/components/negotiation-demo.tsx 与 scripts/build-demo-video.mjs。
 *
 * 三层降级，任何一层出问题都不会白屏：
 *   1. 常规：mp4 自动播放、静音、循环；
 *   2. 系统要求「减少动态效果」：由 CSS 换成同一时刻的静态帧（不需要 JS 参与）；
 *   3. 视频解码失败：onError 时同样退到静态帧。
 *
 * 自动播放的循环内容超过 5 秒就必须可暂停（WCAG 2.2.2），所以右下角常驻一个
 * 暂停/播放按钮，而不是只在 hover 时才出现。
 */
export function ProductFilm({ className }: { className?: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(true);
  const [failed, setFailed] = React.useState(false);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  return (
    <figure
      className={cn(
        "relative m-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] shadow-card",
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-[var(--paper-deep)]">
        {!failed && (
          <video
            ref={videoRef}
            className="film-video absolute inset-0 size-full object-cover"
            poster="/demo/negotiation-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setFailed(true)}
          >
            <source src="/demo/negotiation.mp4" type="video/mp4" />
          </video>
        )}

        {/* 静态替代帧。显示与否主要交给 CSS 的 prefers-reduced-motion 媒体查询，
            不放 JS 里判断——否则「禁用了 JS」的用户就永远拿不到替代画面。
            视频解码失败时用内联样式强制显示：`!block` 这种写法经 tailwind-merge
            合并后会被转义成 `.film-still\!block`，永远匹配不上，等于兜底失效。 */}
        <Image
          src="/demo/negotiation-poster.jpg"
          alt="链谈 Agent 谈判台演示：供应商提交条款、底线逐项核验、七维评分 86 分达标后转人工"
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          className="film-still object-cover"
          style={failed ? { display: "block" } : undefined}
        />

        {/* 只在视频真的存在时才给控件：reduced-motion 下视频已被 CSS 隐藏、
            onError 后视频节点已被卸载，此时按钮会变成控制不存在对象的死控件。 */}
        {!failed && (
          <button
            type="button"
            onClick={toggle}
            // aria-pressed 描述的是「这个开关有没有开着」。原来的 `!playing` 是反的：
            // 显示暂停图标（说明正在播）时却报 pressed=false。
            aria-pressed={playing}
            aria-label={playing ? "暂停产品演示" : "播放产品演示"}
            className="film-toggle absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-[var(--ink)]/72 text-white backdrop-blur-[2px] transition-colors hover:bg-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
        )}
      </div>

      <figcaption className="border-t border-[var(--line)] px-5 py-3 text-xs leading-5 text-[var(--muted)]">
        <span className="font-semibold text-[var(--ink)]">真实链路演示：</span>
        自动接待 → 底线逐项核验 → 首次 62 分未达阈值 → AI 继续议价 → 重新校验 86 分 → 达标转人工。
      </figcaption>
    </figure>
  );
}
