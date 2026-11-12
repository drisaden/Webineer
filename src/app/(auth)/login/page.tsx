"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="rounded-[2rem] border border-border bg-white p-8 shadow-soft">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Demo access</p>
          <h1 className="mt-3 text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-secondaryText">Demo mode is enabled for local development only. Click Sign in to enter the dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-primaryText">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-secondaryText" />
              <input className="input-field pl-10" type="email" placeholder="you@company.com" defaultValue="avery@northstarstudio.co" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-primaryText">Password</label>
              <Link href="/forgot-password" className="text-sm text-[#17294B]">Forgot password?</Link>
            </div>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-secondaryText" />
              <input className="input-field pl-10 pr-10" type={showPassword ? "text" : "password"} defaultValue="demo-password" />
              <button type="button" className="absolute right-3 top-3.5 text-secondaryText" onClick={() => setShowPassword((value) => !value)} aria-label="Toggle password visibility">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in to Dashboard"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-secondaryText">
          Don&apos;t have an account? <Link href="/register" className="font-medium text-[#17294B]">Create one</Link>
        </p>
      </div>

      <div className="rounded-[2rem] border border-border bg-[#101B35] p-8 text-white shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#B9F0E7]">What you can do</p>
        <h2 className="mt-3 text-3xl font-semibold">Launch webinar ops in a few clicks</h2>
        <ul className="mt-6 space-y-4 text-sm text-white/75">
          <li>• Create branded webinar experiences around external video sources</li>
          <li>• Review registration and attendance trends across campaigns</li>
          <li>• Build landing pages and automate reminder sequences</li>
          <li>• Manage upcoming, automated and replay webinar programs</li>
        </ul>
      </div>
    </div>
  );
}
