"use client";

import { useEffect, useState } from "react";
import { NegotiationDemo } from "@/components/negotiation-demo";

declare global {
  interface Window {
    /** 录制脚本用它把舞台定格到任意时刻；返回的 Promise 在两帧 rAF 后兑现，即「已画到屏幕上」。 */
    __demoSeek?: (time: number) => Promise<void>;
  }
}

export default function DemoStagePage() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    // 录制模式把「同一个 t ⇒ 同一帧」变成硬保证：任何 CSS 动画/过渡都会让同一时刻
    // 因截图时机不同而画出不同的像素，最终表现为视频里的抖动。
    document.documentElement.classList.add("capture");

    window.__demoSeek = (next: number) =>
      new Promise<void>((resolve) => {
        setTime(next);
        // 第一帧 rAF 让 React 提交这次 setState，第二帧才是浏览器真正把它画出来
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
  }, []);

  return (
    <div className="h-[960px] w-[1280px] overflow-hidden">
      <NegotiationDemo time={time} />
    </div>
  );
}
