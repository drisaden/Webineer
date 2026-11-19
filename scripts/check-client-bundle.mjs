// Fails the build if a secret ended up in the JavaScript that every visitor downloads.
//
// Next.js (like Vite) puts anything named NEXT_PUBLIC_* into the browser bundle on purpose, and a server-only
// module imported by mistake from a client component can drag its secrets along too. This looks at the
// finished build output (.next/static, i.e. what the browser gets) and checks:
//   1. no NEXT_PUBLIC_* variable is named like a secret,
//   2. no secret-looking environment variable's VALUE appears in the output,
//   3. no well-known secret format (live API keys, service-role tokens, database URLs, private keys) appears.
// It prints only the variable name and file, never the secret itself.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.env.BUNDLE_DIR || ".next/static";
if (!existsSync(root)) {
  console.log(`[check-bundle] ${root} not found, nothing to scan.`);
  process.exit(0);
}

const SECRET_NAME = /(SECRET|PRIVATE|PASSWORD|PASS\b|TOKEN|SERVICE_ROLE|API_KEY|SECRET_HASH|DATABASE_URL|DIRECT_URL|SIGNING)/i;
const PUBLIC_OK = /^NEXT_PUBLIC_SUPABASE_(ANON|PUBLISHABLE)_KEY$/; // these two are designed to be public
const problems = [];

// 1. Names: a NEXT_PUBLIC_ variable that looks like a secret is already a mistake, even before it has a value.
for (const name of Object.keys(process.env)) {
  if (name.startsWith("NEXT_PUBLIC_") && SECRET_NAME.test(name) && !PUBLIC_OK.test(name)) {
    problems.push(`${name} is exposed to the browser by its NEXT_PUBLIC_ prefix but is named like a secret. Rename it without the prefix and read it only on the server.`);
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(js|css|html|json|txt)$/.test(entry)) yield path;
  }
}

const files = [...walk(root)].map((path) => ({ path, text: readFileSync(path, "utf8") }));

// 2. Values of secret-looking server variables (skip short or obviously public values).
for (const [name, value] of Object.entries(process.env)) {
  if (name.startsWith("NEXT_PUBLIC_") || !value || value.length < 16 || !SECRET_NAME.test(name)) continue;
  const hit = files.find((f) => f.text.includes(value));
  if (hit) problems.push(`The value of ${name} appears in ${hit.path}. Rotate that key, then stop it reaching client code.`);
}

// 3. Well-known formats.
const patterns = [
  ["a live Stripe/OpenAI-style secret key (sk_live_/sk-…)", /\bsk_live_[A-Za-z0-9]{16,}|\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ["a Flutterwave secret key", /FLWSECK(?:_TEST)?-[A-Za-z0-9]{16,}/],
  ["a database connection string", /postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`@]+@/],
  ["a private key block", /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/],
  ["a Resend key", /\bre_[A-Za-z0-9]{20,}/],
];
for (const f of files) {
  for (const [label, re] of patterns) if (re.test(f.text)) problems.push(`${f.path} contains ${label}.`);
  // Supabase JWTs: the anon/publishable key is meant to be public; a service_role token is not.
  for (const jwt of f.text.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? []) {
    try {
      const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
      if (payload.role === "service_role") problems.push(`${f.path} contains a Supabase service_role key.`);
    } catch {
      /* not a JWT */
    }
  }
}

if (problems.length) {
  console.error(`\n[check-bundle] SECRETS MAY BE PUBLIC (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`[check-bundle] OK: scanned ${files.length} browser files, no secrets found.`);
