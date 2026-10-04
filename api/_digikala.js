import { DK_MAP, fixImagePaths } from "./_data.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const type = String(req.query.type || "");
  const data = DK_MAP[type];
  if (!data) {
    return res
      .status(400)
      .json({ error: "Invalid data type", valid_types: Object.keys(DK_MAP) });
  }
  const out = JSON.parse(JSON.stringify(data));
  fixImagePaths(out);
  res.json(out);
}
