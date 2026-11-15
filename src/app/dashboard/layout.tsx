import { redirect } from "next/navigation";
import { ViewerProvider } from "@/components/auth/viewer-context";
import { getAuthMode } from "@/lib/supabase/config";
import { requireAppSession } from "@/server/auth/session";
import { getViewer, viewerFromSession } from "@/server/auth/viewer";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";
import { onlinePaymentsReady, planOptions } from "@/server/onboarding";
import { paymentsTestMode } from "@/server/payments/service";
import { Suspense } from "react";

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
  const live = mode === "supabase";
  return (
    <ViewerProvider viewer={viewer}>
      {children}
      {/* First-run plan chooser and product tour (the tour can be replayed with ?tour=1). */}
      <Suspense fallback={null}>
        <OnboardingGate plans={planOptions()} paymentsReady={live && onlinePaymentsReady()} testMode={live ? paymentsTestMode() : true} />
      </Suspense>
    </ViewerProvider>
  );
}
