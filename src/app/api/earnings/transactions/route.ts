import { limitOr429 } from "@/lib/server/http";
import { errorResponse, json, requireMember } from "@/server/earnings/http";
import { listTransactions, transactionsCsv } from "@/server/earnings/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const who = await requireMember(request, "payment.view", false);
  if ("response" in who) return who.response;
  const limited = await limitOr429(request, "earnings:export", 20, 60 * 60_000, who.app.profile.id);
  if (limited) return limited;
  try {
    const csv = transactionsCsv(await listTransactions(who.app.organization.id, 5000));
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="earnings.csv"', "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
