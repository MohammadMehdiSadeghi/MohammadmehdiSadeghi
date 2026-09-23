import { listData } from "./_data.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }
  /* `listData` prefers the admin overlay and falls back to the bundled file,
     so skills added or edited in the panel actually reach the public site.
     Reading BUNDLED here made every skill edit invisible in production. */
  const skills = await listData("skills.json");
  res.json({ skills: Array.isArray(skills) ? skills : [] });
}
