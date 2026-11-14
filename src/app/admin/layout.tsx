import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { getAuthMode } from "@/lib/supabase/config";
import { AuthorizationError, requirePlatformPermission } from "@/server/auth/authorize";
import { getSessionUser } from "@/server/auth/session";
import { getPrisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

/** Platform administration requires a platform role; organization owners are not admins. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const mode = getAuthMode();
  if (mode === "unconfigured") notFound();
  if (mode === "supabase") {
    const session = await getSessionUser();
    if (!session) redirect("/login?next=/admin");
    try {
      await requirePlatformPermission(getPrisma(), session, "admin.dashboard.view");
    } catch (error) {
      if (error instanceof AuthorizationError) notFound();
      throw error;
    }
  }
  return <AdminShell>{children}</AdminShell>;
}
