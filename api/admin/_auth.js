import crypto from "node:crypto";
import {
  getConfig,
  timingSafeEq,
  clientIP,
  rateCheck,
  rateFail,
  rateSuccess,
  issueToken,
  TOKEN_TTL,
} from "../_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const cfg = getConfig();
  if (!cfg.username || !cfg.password_sha256 || !cfg.secret) {
    return res.status(503).json({ error: "admin auth is not configured" });
  }

  const body = req.body || {};
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  const allowed = await rateCheck(req, "login", false);
  if (!allowed) {
    return res.status(429).json({ error: "too many attempts, try again later" });
  }

  const validUser = timingSafeEq(cfg.username || "", username);
  const validPass = timingSafeEq(
    cfg.password_sha256 || "",
    crypto.createHash("sha256").update(password).digest("hex")
  );
  if (!validUser || !validPass) {
    const k = `${clientIP(req)}::login`;
    await rateFail(k);
    await new Promise((r) => setTimeout(r, 250)); // brute-force slowdown
    return res.status(401).json({ error: "invalid username or password" });
  }
  const k = `${clientIP(req)}::login`;
  await rateSuccess(k);
  res.json({
    token: issueToken(username),
    username,
    expires_in: TOKEN_TTL,
  });
}
