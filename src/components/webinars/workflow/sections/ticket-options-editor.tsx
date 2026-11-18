"use client";

import { Plus, Trash2 } from "lucide-react";
import type { DiscountCode, TicketTier } from "@/lib/pricing/ticket";
import { normaliseCode } from "@/lib/pricing/ticket";
import type { IntegrationsSettings } from "@/types/webinar-workflow";

type Payment = IntegrationsSettings["payment"];
const field = "h-11 w-full rounded-xl border border-[#E3E8F2] px-3 text-sm";
const newId = () => `t${Math.random().toString(36).slice(2, 8)}`;

export function TicketOptionsEditor({ payment, onChange }: { payment: Payment; onChange: (p: Payment) => void }) {
  const tiers = payment.tiers ?? [];
  const codes = payment.discountCodes ?? [];
  const setTiers = (next: TicketTier[]) => onChange({ ...payment, tiers: next });
  const setCodes = (next: DiscountCode[]) => onChange({ ...payment, discountCodes: next });
  const patchTier = (i: number, p: Partial<TicketTier>) => setTiers(tiers.map((t, j) => (j === i ? { ...t, ...p } : t)));
  const patchCode = (i: number, p: Partial<DiscountCode>) => setCodes(codes.map((c, j) => (j === i ? { ...c, ...p } : c)));

  return (
    <div className="space-y-6" data-testid="ticket-options-editor">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-primaryText">Ticket options</p>
          <p className="text-xs text-secondaryText">Optional. Add options like Standard and VIP, or a free one. Visitors pick one, and its price replaces the price above.</p>
        </div>
        {tiers.map((t, i) => (
          <div key={t.id} className="grid gap-2 rounded-xl border border-[#E3E8F2] p-3 md:grid-cols-[1.2fr_120px_1.5fr_auto]">
            <input aria-label={`Ticket ${i + 1} name`} placeholder="Name (e.g. VIP)" className={field} value={t.name} maxLength={80} onChange={(e) => patchTier(i, { name: e.target.value })} />
            <input aria-label={`Ticket ${i + 1} price`} placeholder="Price" type="number" min={0} step={100} className={field} value={t.price} onChange={(e) => patchTier(i, { price: Math.max(0, Number(e.target.value) || 0) })} />
            <input aria-label={`Ticket ${i + 1} description`} placeholder="What's included (optional)" className={field} value={t.description} maxLength={300} onChange={(e) => patchTier(i, { description: e.target.value })} />
            <button type="button" aria-label={`Remove ticket ${i + 1}`} onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E3E8F2] text-secondaryText hover:text-[#B33A3A]"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {tiers.length < 5 && (
          <button type="button" data-add-ticket onClick={() => setTiers([...tiers, { id: newId(), name: "", price: 0, description: "" }])} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-dashed border-[#C9D3E6] px-4 text-sm font-medium text-primaryText"><Plus className="h-4 w-4" />Add ticket option</button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-primaryText">Discount codes</p>
          <p className="text-xs text-secondaryText">Optional. Codes are checked on the server and are never shown to visitors. Use a percentage or a fixed amount.</p>
        </div>
        {codes.map((c, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-[#E3E8F2] p-3 md:grid-cols-[1.2fr_110px_110px_110px_150px_auto_auto]">
            <input aria-label={`Code ${i + 1}`} placeholder="CODE" className={`${field} uppercase`} value={c.code} maxLength={24} onChange={(e) => patchCode(i, { code: normaliseCode(e.target.value) })} />
            <input aria-label={`Code ${i + 1} percent off`} placeholder="% off" type="number" min={0} max={100} className={field} value={c.percentOff ?? ""} onChange={(e) => patchCode(i, { percentOff: Number(e.target.value) || undefined, amountOff: undefined })} />
            <input aria-label={`Code ${i + 1} amount off`} placeholder="Amount off" type="number" min={0} className={field} value={c.amountOff ?? ""} onChange={(e) => patchCode(i, { amountOff: Number(e.target.value) || undefined, percentOff: undefined })} />
            <input aria-label={`Code ${i + 1} use limit`} placeholder="Max uses" type="number" min={1} className={field} value={c.maxUses ?? ""} onChange={(e) => patchCode(i, { maxUses: e.target.value ? Math.max(1, Math.floor(Number(e.target.value))) : null })} />
            <input aria-label={`Code ${i + 1} expiry`} type="date" className={field} value={c.expiresAt ? c.expiresAt.slice(0, 10) : ""} onChange={(e) => patchCode(i, { expiresAt: e.target.value || null })} />
            <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={c.active} onChange={(e) => patchCode(i, { active: e.target.checked })} />Active</label>
            <button type="button" aria-label={`Remove code ${i + 1}`} onClick={() => setCodes(codes.filter((_, j) => j !== i))} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E3E8F2] text-secondaryText hover:text-[#B33A3A]"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {codes.length < 20 && (
          <button type="button" data-add-code onClick={() => setCodes([...codes, { code: "", percentOff: 10, maxUses: null, expiresAt: null, active: true }])} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-dashed border-[#C9D3E6] px-4 text-sm font-medium text-primaryText"><Plus className="h-4 w-4" />Add discount code</button>
        )}
      </div>
    </div>
  );
}
