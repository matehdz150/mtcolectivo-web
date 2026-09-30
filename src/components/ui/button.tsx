import type { ButtonHTMLAttributes } from "react";

import { Icon, type IconName } from "./icon";

const VARIANTS = {
  primary: "bg-ink text-surface hover:bg-ink-secondary",
  secondary: "bg-surface text-ink shadow-row hover:bg-canvas",
  soft: "bg-control text-ink hover:bg-control-strong",
  accent: "bg-mint text-on-mint shadow-mint hover:brightness-95",
} as const;

const SIZES = {
  sm: { box: "h-9 px-3.5 text-[13px] rounded-md", icon: 14 },
  md: { box: "h-11 px-[18px] text-sm rounded-md", icon: 16 },
  lg: { box: "h-14 px-6 text-base rounded-[14px]", icon: 18 },
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
};

export function Button({ variant = "primary", size = "md", icon, iconRight, block, className = "", children, type = "button", ...rest }: ButtonProps) {
  const s = SIZES[size];
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.005em] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${VARIANTS[variant]} ${s.box} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={s.icon} strokeWidth={2} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={s.icon} strokeWidth={2} /> : null}
    </button>
  );
}
