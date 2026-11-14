import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-border bg-white p-8 text-center shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-secondaryText">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-primaryText">Page not found</h1>
        <p className="mt-3 text-sm text-secondaryText">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
        <Link href="/" className="mt-6 inline-block rounded-2xl bg-[#16D6B2] px-4 py-2 text-sm font-medium text-[#101B35]">
          Go home
        </Link>
      </div>
    </main>
  );
}
