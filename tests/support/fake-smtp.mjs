// Minimal SMTP sink for tests (no TLS). SMTP on FAKE_SMTP_PORT (default 2525),
// control API on FAKE_SMTP_HTTP (default 2526):
//   GET /messages[?to=]   GET /reset   GET /fail?code=450&n=2   GET /auth-fail?n=1
import net from "node:net";
import http from "node:http";

const SMTP_PORT = Number(process.env.FAKE_SMTP_PORT ?? 2525);
const HTTP_PORT = Number(process.env.FAKE_SMTP_HTTP ?? 2526);
const USER = process.env.FAKE_SMTP_USER ?? "mailer@example.test";
const PASS = process.env.FAKE_SMTP_PASS ?? "smtp-test-password";
let messages = [];
let failCode = 0, failCount = 0, authFail = 0;

function decodeQuotedPrintable(s) {
  return s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function parse(raw) {
  const [head, ...rest] = raw.split(/\r?\n\r?\n/);
  const headers = {};
  let last = null;
  for (const line of head.split(/\r?\n/)) {
    if (/^\s/.test(line) && last) { headers[last] += " " + line.trim(); continue; }
    const i = line.indexOf(":");
    if (i > 0) { last = line.slice(0, i).toLowerCase(); headers[last] = line.slice(i + 1).trim(); }
  }
  const body = rest.join("\n\n");
  return { headers, subject: headers.subject ?? "", raw, decoded: decodeQuotedPrintable(raw) };
}

net.createServer((socket) => {
  let mail = null, data = false, buffer = "", authStage = null, authUser = null, authed = false;
  const reply = (s) => socket.write(s + "\r\n");
  reply("220 fake-smtp ready");
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    while (true) {
      if (data) {
        const end = buffer.indexOf("\r\n.\r\n");
        if (end < 0) return;
        const raw = buffer.slice(0, end).replace(/\r\n\.\./g, "\r\n.");
        buffer = buffer.slice(end + 5);
        data = false;
        messages.push({ from: mail.from, to: mail.to, ...parse(raw), at: new Date().toISOString() });
        mail = null;
        reply("250 OK queued");
        continue;
      }
      const nl = buffer.indexOf("\r\n");
      if (nl < 0) return;
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 2);
      if (authStage === "user") { authUser = Buffer.from(line, "base64").toString(); authStage = "pass"; reply("334 UGFzc3dvcmQ6"); continue; }
      if (authStage === "pass") {
        authStage = null;
        const pass = Buffer.from(line, "base64").toString();
        if (authFail > 0) { authFail--; reply("535 5.7.8 Authentication failed"); continue; }
        authed = authUser === USER && pass === PASS; reply(authed ? "235 Authentication successful" : "535 5.7.8 Authentication failed"); continue;
      }
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === "EHLO" || cmd === "HELO") { socket.write("250-fake-smtp\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n"); }
      else if (line.toUpperCase().startsWith("AUTH PLAIN")) {
        const parts = Buffer.from(line.split(" ")[2] ?? "", "base64").toString().split("\0");
        if (authFail > 0) { authFail--; reply("535 5.7.8 Authentication failed"); continue; }
        authed = parts[1] === USER && parts[2] === PASS; reply(authed ? "235 Authentication successful" : "535 5.7.8 Authentication failed");
      } else if (line.toUpperCase().startsWith("AUTH LOGIN")) { authStage = "user"; reply("334 VXNlcm5hbWU6"); }
      else if (cmd === "MAIL") { if (!authed) { reply("530 5.7.0 Authentication required"); continue; } mail = { from: line.slice(10).replace(/[<>]/g, "").split(" ")[0], to: [] }; reply("250 OK"); }
      else if (cmd === "RCPT") {
        if (failCount > 0) { failCount--; reply(`${failCode} ${failCode >= 500 ? "5.1.1 Mailbox unavailable" : "4.3.0 Try again later"}`); continue; }
        mail.to.push(line.slice(8).replace(/[<>]/g, "").split(" ")[0]); reply("250 OK");
      }
      else if (cmd === "DATA") { data = true; reply("354 End data with <CR><LF>.<CR><LF>"); }
      else if (cmd === "RSET") { mail = null; reply("250 OK"); }
      else if (cmd === "NOOP") reply("250 OK");
      else if (cmd === "QUIT") { reply("221 Bye"); socket.end(); }
      else reply("502 Command not implemented");
    }
  });
  socket.on("error", () => {});
}).listen(SMTP_PORT, "127.0.0.1");

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const json = (b) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(b)); };
  if (url.pathname === "/reset") { messages = []; failCount = 0; authFail = 0; return json({ ok: true }); }
  if (url.pathname === "/fail") { failCode = Number(url.searchParams.get("code") ?? 450); failCount = Number(url.searchParams.get("n") ?? 1); return json({ ok: true }); }
  if (url.pathname === "/auth-fail") { authFail = Number(url.searchParams.get("n") ?? 1); return json({ ok: true }); }
  if (url.pathname === "/messages") {
    const to = url.searchParams.get("to");
    return json(to ? messages.filter((m) => m.to.includes(to)) : messages);
  }
  res.writeHead(404); res.end();
}).listen(HTTP_PORT, "127.0.0.1", () => console.log(`fake smtp ${SMTP_PORT}, control ${HTTP_PORT}`));
