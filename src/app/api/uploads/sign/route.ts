import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/demo-session";
import { KB, limitOr429, readJsonBody } from "@/lib/server/http";
import { isSameOriginRequest } from "@/lib/server/request-origin";
import { getAuthMode } from "@/lib/supabase/config";
import { createSignedUpload } from "@/server/uploads/cloudinary";

export const dynamic = "force-dynamic";

const schema = z.object({ kind: z.enum(["image", "video"]) }).strict();

/**
 * Hand a signed-in workspace member a short-lived signature for one direct upload to Cloudinary.
 * The file itself never passes through this server.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (getAuthMode() !== "supabase") return Response.json({ error: "Uploads aren't available in demo mode. Paste a link instead." }, { status: 503 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
  if (user.role === "analyst") return Response.json({ error: "Your role can't upload files." }, { status: 403 });
  const limited = await limitOr429(request, "uploads:sign", 60, 10 * 60_000, user.id);
  if (limited) return limited;
  const body = await readJsonBody(request, 1 * KB);
  if (!body.ok) return body.response;
  const parsed = schema.safeParse(body.data);
  if (!parsed.success) return Response.json({ error: "Unsupported upload type." }, { status: 400 });
  const signed = createSignedUpload({ organizationId: user.workspaceId, kind: parsed.data.kind });
  if (!signed) return Response.json({ error: "Uploads aren't set up on this site yet. Paste a link instead." }, { status: 503 });
  return Response.json(signed, { headers: { "Cache-Control": "no-store" } });
}
