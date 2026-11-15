"use client";

import { useSearchParams } from "next/navigation";
import { useViewer } from "@/components/auth/viewer-context";
import { OnboardingTour } from "./onboarding-tour";
import { PlanChooser, type PlanChoice } from "./plan-chooser";

/**
 * First-run experience for the dashboard: the plan chooser comes first (new owners who haven't
 * picked a plan), then the product tour. `?tour=1` replays the tour on demand.
 */
export function OnboardingGate({ plans, paymentsReady, testMode }: { plans: PlanChoice[]; paymentsReady: boolean; testMode: boolean }) {
  const viewer = useViewer();
  const replay = useSearchParams().get("tour") === "1";
  const onboarding = viewer?.onboarding;
  if (onboarding?.needsPlanChoice) return <PlanChooser plans={plans} paymentsReady={paymentsReady} testMode={testMode} />;
  if (replay) return <OnboardingTour persist={false} />;
  if (onboarding?.showTour) return <OnboardingTour persist />;
  return null;
}
