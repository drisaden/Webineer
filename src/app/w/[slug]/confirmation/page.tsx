import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WebinarConfirmationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4 py-8">
      <div className="max-w-xl rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EAFBF5] text-[#0F7B52]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-primaryText">You’re on the list.</h1>
        <p className="mt-3 text-secondaryText">
          Your seat for the webinar has been reserved. A confirmation email is on the way with reminders and event access details.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">Back to homepage</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
