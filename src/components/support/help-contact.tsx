"use client";

import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { EmailForm } from "./contact-forms";
import { useSupportStatus } from "./use-support-status";

/** "Still need help?" block for the public help center. Visitors can email us. Customers get chat and calls in their dashboard. */
export function HelpContact() {
  const { status } = useSupportStatus(60_000);
  return (
    <section id="contact" className="scroll-mt-24 rounded-[2rem] border border-border bg-white p-6 shadow-soft md:p-8" aria-labelledby="contact-title" data-testid="help-contact">
      <h2 id="contact-title" className="text-2xl text-primaryText">Still need help?</h2>
      <p className="mt-1 text-sm text-secondaryText">Reach the team the way that suits you.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-[#F7F9FC] p-4">
          <p className="flex items-center gap-2 font-semibold"><MessageCircle className="h-4 w-4" aria-hidden /> Live chat</p>
          <p className="mt-1 text-sm text-secondaryText">{status?.online ? "Agents are online now." : "Chat with an agent from your dashboard."}</p>
          <Link href="/login?next=/dashboard/help" className="tap mt-2 text-sm font-medium text-[#17294B] underline">Sign in to chat</Link>
        </div>
        <div className="rounded-2xl border border-border bg-[#F7F9FC] p-4">
          <p className="flex items-center gap-2 font-semibold"><Phone className="h-4 w-4" aria-hidden /> Call us</p>
          <p className="mt-1 text-sm text-secondaryText">{status?.phone ? `${status.hours}.` : "Request a callback from your dashboard."}</p>
          {status?.phone ? <a href={`tel:${status.phone.replace(/[^\d+]/g, "")}`} className="tap mt-2 text-sm font-medium text-[#17294B] underline">{status.phone}</a> : <Link href="/login?next=/dashboard/help" className="tap mt-2 text-sm font-medium text-[#17294B] underline">Sign in to request a call</Link>}
        </div>
        <div className="rounded-2xl border border-border bg-[#F7F9FC] p-4">
          <p className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4" aria-hidden /> Email</p>
          <p className="mt-1 text-sm text-secondaryText">Use the form below{status?.email ? ` or write to ${status.email}` : ""}.</p>
        </div>
      </div>
      <div className="mt-6 border-t border-border pt-6">
        <h3 className="mb-3 text-base font-semibold">Send us a message</h3>
        <EmailForm guest />
      </div>
    </section>
  );
}
