const MESSAGES: Record<string, { tone: "info" | "error" | "success"; text: string }> = {
  link_invalid: { tone: "error", text: "That link is invalid or has expired. Request a new one." },
  auth_unconfigured: { tone: "error", text: "Sign-in isn't configured on this server yet (Supabase Auth environment variables are missing)." },
  signed_out: { tone: "success", text: "You've been signed out." },
};

export function AuthNotice({ code, mode }: { code?: string; mode: "supabase" | "demo" | "unconfigured" }) {
  const message = code ? MESSAGES[code] : undefined;
  return (
    <>
      {mode === "demo" && (
        <div className="mb-5 rounded-2xl border border-[#F5E1BC] bg-[#FFF8EA] p-4 text-sm text-[#8A5A0E]">
          Local demo mode: Supabase Auth isn&apos;t configured, so signing in opens the demo workspace without checking credentials.
        </div>
      )}
      {mode === "unconfigured" && !message && (
        <div className="mb-5 rounded-2xl border border-[#F5D7D7] bg-[#FFF6F6] p-4 text-sm text-[#B33A3A]">{MESSAGES.auth_unconfigured.text}</div>
      )}
      {message && (
        <div role={message.tone === "error" ? "alert" : "status"} className={`mb-5 rounded-2xl border p-4 text-sm ${message.tone === "error" ? "border-[#F5D7D7] bg-[#FFF6F6] text-[#B33A3A]" : "border-[#D9F7EC] bg-[#EAFBF5] text-[#0F7B52]"}`}>
          {message.text}
        </div>
      )}
    </>
  );
}
