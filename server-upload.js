/* Project dist upload: zip -> public/Projects/<Type>/<Slug>/ (atomic deploy) */
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import multer from "multer";
import AdmZip from "adm-zip";

const MAX_BYTES = 60 * 1024 * 1024;

export function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
const b = 5;

function safeJoin(root, target) {
  const resolved = path.resolve(root, target);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) return null; // zip-slip
  return resolved;
}

export function registerUploadRoutes(
  app,
  { PUBLIC_DIR, requireAuthAsync, wrap },
) {
  const TMP = path.join(PUBLIC_DIR, ".upload-tmp");
  fs.mkdirSync(TMP, { recursive: true });

  // sweep orphaned archives (crashes before unlink, abandoned uploads): >1h old
  (function sweepOldUploads() {
    const cutoff = Date.now() - 60 * 60 * 1000;
    fs.readdir(TMP, (err, names) => {
      if (err) return;
      for (const n of names) {
        const full = path.join(TMP, n);
        fs.stat(full, (e, s) => {
          if (e) return;
          if (s.isFile() && s.mtimeMs < cutoff)
            fs.rm(full, { force: true }, () => {});
          if (s.isDirectory() && s.mtimeMs < cutoff)
            fs.rm(full, { recursive: true, force: true }, () => {});
        });
      }
    });
  })();

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, TMP),
      filename: (_req, file, cb) =>
        cb(
          null,
          `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname).toLowerCase()}`,
        ),
    }),
    limits: { fileSize: MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext !== ".zip")
        return cb(new Error("only .zip archives are accepted"));
      cb(null, true);
    },
  });

  // POST /api/admin/upload-project  (multipart: archive, title, slug?, type, githubUrl?)
  app.post(
    "/api/admin/upload-project",
    upload.single("archive"),
    wrap(async (req, res) => {
      const payload = await requireAuthAsync(req, res);
      if (payload === null) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return;
      }
      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ error: "no archive uploaded (field name: archive)" });

      const type =
        String(req.body.type || "web").toLowerCase() === "mini"
          ? "Mini-Project"
          : "Web-Project";
      let slug = slugify(req.body.slug || req.body.title || "");
      if (!slug) {
        fs.unlink(file.path, () => {});
        return res.status(400).json({ error: "slug or title is required" });
      }

      const destRoot = path.join(PUBLIC_DIR, "Projects", type, slug);
      const extractDir = path.join(
        TMP,
        `extract-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      );

      try {
        const zip = new AdmZip(file.path);
        const entries = zip.getEntries().filter((e) => !e.isDirectory);
        if (!entries.length) throw new Error("archive is empty");

        // find the common top folder (dist/ inside zip) so we don't nest twice
        let prefix = "";
        const firstParts = entries.map((e) => e.entryName.split(/[\\/]/));
        if (firstParts.every((p) => p.length > 1)) {
          const shared = firstParts[0][0];
          if (firstParts.every((p) => p[0] === shared)) prefix = shared + "/";
        }

        // 1) extract into a TEMP dir first — old deployment stays live on any failure
        let hasIndex = false,
          written = 0;
        for (const entry of entries) {
          let rel = entry.entryName;
          if (prefix && rel.startsWith(prefix)) rel = rel.slice(prefix.length);
          rel = rel.replace(/\\/g, "/");
          if (
            !rel ||
            rel.split("/").includes("__MACOSX") ||
            path.basename(rel).startsWith(".")
          )
            continue;
          const target = safeJoin(extractDir, rel);
          if (!target) continue; // zip-slip guard
          if (/(^|\/)index\.html$/i.test(rel)) hasIndex = true;
          await fsp.mkdir(path.dirname(target), { recursive: true });
          await fsp.writeFile(target, entry.getData());
          written++;
        }
        if (!written) throw new Error("no usable files in archive");
        if (!hasIndex) throw new Error("archive has no index.html at its root");

        // 2) atomic swap: remove old, rename temp into place
        await fsp.rm(destRoot, { recursive: true, force: true });
        await fsp.mkdir(path.dirname(destRoot), { recursive: true });
        await fsp.rename(extractDir, destRoot);

        const url = `/Projects/${type}/${slug}/index.html`;
        res.json({ ok: true, slug, type, files: written, url });
      } catch (err) {
        // only clean the TEMP dir — a previously deployed version is never destroyed
        await fsp
          .rm(extractDir, { recursive: true, force: true })
          .catch(() => {});
        res.status(400).json({ error: err.message || "upload failed" });
      } finally {
        fs.unlink(file.path, () => {});
      }
    }),
  );

  // multer errors (bad type / too large) → JSON instead of the default HTML 500
  app.use("/api/admin/upload-project", (err, _req, res, _next) => {
    const msg =
      err?.code === "LIMIT_FILE_SIZE"
        ? `archive too large (max ${MAX_BYTES / (1024 * 1024)}MB)`
        : err?.message || "upload failed";
    res.status(400).json({ error: msg });
  });
}
