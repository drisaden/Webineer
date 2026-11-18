import { appUrl } from "./receipts";
import { queueAndDeliver } from "./outbox";
import { renderWelcome } from "./templates";

/** Welcome email for a newly confirmed account. Once per user, however many times the confirm link is opened. */
export async function sendWelcomeEmail(user: { userId: string; email: string; name?: string | null; workspaceName?: string | null }): Promise<void> {
  const base = appUrl();
  const email = renderWelcome({ name: user.name, workspaceName: user.workspaceName, dashboardUrl: `${base}/dashboard`, helpUrl: `${base}/help` });
  await queueAndDeliver({ template: "welcome", to: user.email, toName: user.name ?? undefined, ...email, dedupeKey: `welcome:${user.userId}` });
}
