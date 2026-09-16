/* ════════════════════════════════════════════════════════════════════
   POST /api/admin/password — change the admin password from the panel.

   Body: { currentPassword, newPassword }
   The new password is stored as a SHA-256 hash and token_version is
   bumped, so every token issued before the change stops working.

   NOTE on persistence: the deployment filesystem is read-only outside
   /tmp, so the change is held in the ephemeral store and lasts for the
   life of the warm instance. To make it permanent, set
   VERCEL_ADMIN_PASSWORD_SHA256 in the Vercel project env vars to the
   hash returned in the response.
   ════════════════════════════════════════════════════════════════════ */

import {
  loadConfig,
  saveAdminPassword,
  sha256,
  timingSafeEq,
  requireAuth,
  rateCheck,
  clientIP,
  rateFail,
  rateSuccess,
  issueToken,
  TOKEN_TTL,
} from "../_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const cfg = await loadConfig();

  /* Allow both: an authenticated session, or the current password. */
  const payload = requireAuth(req, res);
  if (payload === null) return;

  const body = req.body || {};
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "new password must be at least 6 characters" });
  }

  const key = `${clientIP(req)}::password`;
  const allowed = await rateCheck(req, "password", false);
  if (!allowed) {
    return res.status(429).json({ error: "too many attempts, try again later" });
  }

  if (!timingSafeEq(cfg.password_sha256 || "", sha256(currentPassword))) {
    await rateFail(key);
    await new Promise((r) => setTimeout(r, 250));
    return res.status(401).json({ error: "current password is incorrect" });
  }

  await rateSuccess(key);
  const hashed = sha256(newPassword);
  const next = await saveAdminPassword(cfg.username, hashed);

  res.json({
    ok: true,
    username: next.username,
    /* give the operator the exact env var value to persist it */
    env: {
      name: "VERCEL_ADMIN_PASSWORD_SHA256",
      value: hashed,
    },
    token: issueToken(next.username),
    expires_in: TOKEN_TTL,
    ephemeral: true,
  });
}
