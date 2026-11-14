import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AccountUnavailablePage() {
  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4">
      <div className="w-full max-w-lg rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-semibold text-primaryText">Your account isn’t available</h1>
        <p className="mt-3 text-secondaryText">
          This account is suspended or isn’t a member of an active workspace. If you think this is a mistake, contact your workspace owner or Webineer support.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button type="submit" className="rounded-2xl bg-[#041B5E] px-5 py-2.5 text-sm font-medium text-white">
            Sign out
          </button>
        </form>
        <Link href="/" className="mt-4 inline-block text-sm text-secondaryText underline">
          Back to homepage
        </Link>
      </div>
    </main>
  );
}
