"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Display-only data about the signed-in user. Authorization never reads this. */
export interface Viewer {
  name: string;
  email: string;
  organizationId: string;
  organizationName: string;
  organizations: { id: string; name: string }[];
  mode: "supabase" | "demo";
  isPlatformAdmin: boolean;
  /** Whether file uploads (Cloudinary) are configured; the upload API re-checks. */
  uploadsEnabled?: boolean;
  /** First-run state. Display only: the server re-checks before changing anything. */
  onboarding?: {
    /** The workspace owner hasn't picked a plan yet: show the plan chooser before the dashboard. */
    needsPlanChoice: boolean;
    /** The user hasn't seen the product tour yet. */
    showTour: boolean;
  };
}

const ViewerContext = createContext<Viewer | null>(null);

export function ViewerProvider({ viewer, children }: { viewer: Viewer | null; children: ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  return useContext(ViewerContext);
}
