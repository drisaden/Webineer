import type { User, Workspace } from "@/types";

export const workspace: Workspace = {
  id: "ws_001",
  name: "Northstar Studio",
  slug: "northstar-studio",
  plan: "Growth",
  timezone: "America/New_York",
  currency: "USD",
};

export const mockUser: User = {
  id: "user_001",
  name: "Avery Morgan",
  email: "avery@northstarstudio.co",
  role: "Owner",
  title: "Product Marketing Lead",
  workspaceId: workspace.id,
};
