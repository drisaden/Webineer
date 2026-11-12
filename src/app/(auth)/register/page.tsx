"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 600);
  };

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-border bg-white p-8 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Create account</p>
      <h1 className="mt-3 text-3xl font-semibold">Start building your webinar engine</h1>
      <p className="mt-2 text-secondaryText">This demo registration flow is for frontend development and local product exploration only.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">First name</label>
            <input className="input-field" type="text" placeholder="Avery" defaultValue="Avery" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Last name</label>
            <input className="input-field" type="text" placeholder="Morgan" defaultValue="Morgan" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Work email</label>
          <input className="input-field" type="email" placeholder="name@company.com" defaultValue="avery@northstarstudio.co" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Workspace name</label>
          <input className="input-field" type="text" placeholder="Northstar Studio" defaultValue="Northstar Studio" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Password</label>
          <input className="input-field" type="password" placeholder="Create a password" defaultValue="demo-password" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Confirm password</label>
          <input className="input-field" type="password" placeholder="Repeat your password" defaultValue="demo-password" />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating account..." : "Create account & Go to Dashboard"}</Button>
      </form>

      <p className="mt-5 text-center text-sm text-secondaryText">
        Already have an account? <Link href="/login" className="font-medium text-[#17294B]">Log in</Link>
      </p>
    </div>
  );
}
