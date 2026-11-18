import { redirect } from "next/navigation";

/** Payment gateway details are managed by Techra now. Hosts manage their earnings and payouts under Payments. */
export default function PaymentSettingsPage() {
  redirect("/dashboard/payments");
}
