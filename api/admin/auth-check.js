import { requireAuth } from "../_lib.js";

export default async function handler(req, res) {
  const payload = requireAuth(req, res);
  if (payload === null) return;
  res.json({ valid: true, username: payload.u ?? null });
}
