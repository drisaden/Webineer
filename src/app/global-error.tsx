"use client";

/** Last-resort boundary (errors in the root layout). Plain markup: the layout itself failed. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F7F9FC", color: "#17294B" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: "1px solid #E4E9F1", borderRadius: 24, padding: 32 }}>
            <h1 style={{ fontSize: 22, margin: 0 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#64748B" }}>Please try again in a moment.</p>
            {error.digest && <p style={{ fontSize: 12, color: "#64748B" }}>Reference: {error.digest}</p>}
            <button type="button" onClick={reset} style={{ marginTop: 12, background: "#16D6B2", border: 0, borderRadius: 12, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
