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
}

const ViewerContext = createContext<Viewer | null>(null);

export function ViewerProvider({ viewer, children }: { viewer: Viewer | null; children: ReactNode }) {
  return <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>;
}

export function useViewer() {
  return useContext(ViewerContext);
}
