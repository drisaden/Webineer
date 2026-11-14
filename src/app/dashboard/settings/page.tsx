import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";
import { getSettingsData } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const data = await getSettingsData();
  if (!data) redirect("/login?next=/dashboard/settings");
  return <SettingsView data={data} />;
}
