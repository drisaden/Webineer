import { Card } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

export function StatCard({ label, value, change, tone = "default" }: { label: string; value: string; change: string; tone?: "default" | "success" | "info" }) {
  return (
    <Card className="glass-panel p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-secondaryText">{label}</p>
          <p className="mt-3 text-3xl tracking-tight text-primaryText">{value}</p>
        </div>
        <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${tone === "success" ? "bg-[#EAFBF5] text-[#0F7B52]" : tone === "info" ? "bg-[#E9F2FF] text-[#2F6FCF]" : "bg-[#EEF2F7] text-[#42526A]"}`}>
          <ArrowUpRight className="h-3.5 w-3.5" />
          {change}
        </div>
      </div>
    </Card>
  );
}
