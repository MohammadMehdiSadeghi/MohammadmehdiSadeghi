import { BUNDLED } from "./_data.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const skills = BUNDLED["skills.json"];
  res.json({ skills: Array.isArray(skills) ? skills : [] });
}
