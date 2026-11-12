"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-lg rounded-[2rem] border border-border bg-white p-8 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-secondaryText">Account recovery</p>
      <h1 className="mt-3 text-3xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-secondaryText">Enter the email address linked to your Webineer account.</p>

      {!sent ? (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Email address</label>
            <input className="input-field" type="email" placeholder="you@company.com" defaultValue="avery@northstarstudio.co" />
          </div>
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
      ) : (
        <div className="mt-8 rounded-2xl border border-[#D9F7EC] bg-[#EAFBF5] p-5 text-[#0F7B52]">
          A reset link has been prepared for your email address. This is a demo-only flow for local development.
        </div>
      )}
    </div>
  );
}
