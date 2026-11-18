import { audit } from "@/server/audit";
import { errorResponse, json, readBody, requireMember } from "@/server/earnings/http";
import { savePayoutAccount, type PayoutAccountInput } from "@/server/earnings/service";
import { passwordIsCorrect } from "@/server/earnings/http";

export const dynamic = "force-dynamic";

/** Only the workspace owner can change where money is sent, and they must confirm their password. */
export async function PUT(request: Request) {
  const who = await requireMember(request, "org.billing.manage", true);
  if ("response" in who) return who.response;
  const body = await readBody(request, who.app.profile.id, "earnings:account", 10, 60 * 60_000);
  if ("response" in body) return body.response;
  const d = body.data;
  try {
    if (!(await passwordIsCorrect(who.app.profile.email, d.password))) return json({ error: "That password isn't right." }, 403);
    const input: PayoutAccountInput = {
      bankName: String(d.bankName ?? ""), bankCode: typeof d.bankCode === "string" ? d.bankCode : null, accountNumber: String(d.accountNumber ?? "").replace(/\s/g, ""),
      accountName: String(d.accountName ?? ""), schedule: d.schedule as PayoutAccountInput["schedule"], minimumPayout: Number(d.minimumPayout ?? 0),
    };
    await savePayoutAccount(who.app.organization.id, input);
    await audit({ organizationId: who.app.organization.id, actorUserId: who.app.profile.id, actorEmail: who.app.profile.email, action: "payout.account_saved", targetType: "payout_account", metadata: { bank: input.bankName, last4: input.accountNumber.slice(-4) } });
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
