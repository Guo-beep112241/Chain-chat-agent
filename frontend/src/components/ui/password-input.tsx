"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  leadingIcon?: React.ReactNode;
};

export function PasswordInput({ leadingIcon, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]">
          {leadingIcon}
        </span>
      )}
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-10", leadingIcon ? "pl-9" : undefined, className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "隐藏密码" : "显示密码"}
        className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-[var(--muted)] transition hover:text-[var(--ink)]"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
