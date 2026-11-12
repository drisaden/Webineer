import { cn } from "@/lib/utils";

export function Badge({ label, tone = "default", className }: { label: string; tone?: "default" | "success" | "warning" | "info"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/50 px-2.5 py-1 text-[11px] font-medium shadow-[0_8px_16px_rgba(15,23,42,0.04)] backdrop-blur-xl",
        tone === "success" && "bg-[#EAFBF5] text-[#0F7B52]",
        tone === "warning" && "bg-[#FFF3DE] text-[#B87514]",
        tone === "info" && "bg-[#E9F2FF] text-[#2F6FCF]",
        !tone || tone === "default" ? "bg-[#EEF2F7] text-[#42526A]" : "",
        className,
      )}
    >
      {label}
    </span>
  );
}
