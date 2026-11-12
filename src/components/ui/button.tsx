import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0AEBCB]/40 disabled:cursor-not-allowed disabled:opacity-60 transform hover:-translate-y-0.5",
    variant === "primary" && "bg-gradient-to-r from-[#041B5E] via-[#0A1E6A] to-[#0D2F8D] text-white shadow-[0_16px_32px_rgba(4,27,94,0.22)] hover:shadow-[0_20px_40px_rgba(4,27,94,0.28)]",
    variant === "secondary" && "border border-white/60 bg-white/70 text-primaryText shadow-[0_10px_25px_rgba(15,23,42,0.08)] backdrop-blur-md hover:bg-white/85",
    variant === "ghost" && "bg-transparent text-primaryText hover:bg-[#EEF5FF]",
    size === "sm" && "h-9 px-3 text-sm",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-5 text-base",
    className,
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cn(classes, child.props.className),
      ...props,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
