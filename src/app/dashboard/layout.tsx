import { redirect } from "next/navigation";
import { ViewerProvider } from "@/components/auth/viewer-context";
import { getAuthMode } from "@/lib/supabase/config";
import { requireAppSession } from "@/server/auth/session";
import { getViewer, viewerFromSession } from "@/server/auth/viewer";

export const dynamic = "force-dynamic";

/**
 * Server-side gate for every dashboard page (the proxy is only a first line).
 * Supabase mode: verified session with an active workspace.
 * Demo mode: explicit local demo only. Unconfigured: closed.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const mode = getAuthMode();
  if (mode === "unconfigured") redirect("/login?error=auth_unconfigured");
  const viewer = mode === "supabase" ? viewerFromSession(await requireAppSession("/dashboard")) : await getViewer();
  return <ViewerProvider viewer={viewer}>{children}</ViewerProvider>;
}
