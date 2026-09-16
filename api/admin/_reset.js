/* ════════════════════════════════════════════════════════════════════
   POST /api/admin/reset — wipe the throwaway demo data.
   Body: { target: "sabz" | "visits" | "all" }  (default "sabz")

   The user wants the test database to be disposable: they register on
   Sabz-Learn, try the login, then clear it so nothing lingers.
   ════════════════════════════════════════════════════════════════════ */

import { requireAuth, storePath } from "../_lib.js";
import { resetSabzData } from "../_sabz.js";
import fsp from "node:fs/promises";

const VISIT_FILES = ["visits.json", "online.json", "clicks.json"];

export default async function handler(req, res) {
  if (requireAuth(req, res) === null) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const target = String(req.body?.target || "sabz").toLowerCase();
  const cleared = [];

  if (target === "sabz" || target === "all") {
    const removed = await resetSabzData();
    if (removed.length) cleared.push(...removed.map((f) => `sabz.${f}`));
  }

  if (target === "visits" || target === "all") {
    for (const f of VISIT_FILES) {
      try {
        await fsp.unlink(storePath(f));
        cleared.push(f);
      } catch {
        /* already gone */
      }
    }
  }

  return res.json({
    ok: true,
    target,
    cleared,
    note: target === "sabz" || target === "all"
      ? "demo accounts and comments wiped — comments re-seed on next load"
      : "",
  });
}
