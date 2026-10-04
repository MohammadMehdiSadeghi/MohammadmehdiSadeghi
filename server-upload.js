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

        // Locate index.html inside archive (even if nested in a root folder) to determine base prefix
        const cleanEntries = entries.filter((e) => {
          const norm = e.entryName.replace(/\\/g, "/");
          return !norm.split("/").includes("__MACOSX") && !path.basename(norm).startsWith("._");
        });

        const indexCandidates = cleanEntries.filter((e) =>
          path.basename(e.entryName).toLowerCase() === "index.html"
        );

        let prefix = "";
        if (indexCandidates.length > 0) {
          // Choose the shallowest index.html
          indexCandidates.sort((a, b) => a.entryName.split(/[\\/]/).length - b.entryName.split(/[\\/]/).length);
          const chosenIndex = indexCandidates[0].entryName.replace(/\\/g, "/");
          const idxParts = chosenIndex.split("/");
          idxParts.pop(); // remove 'index.html'
          prefix = idxParts.length > 0 ? idxParts.join("/") + "/" : "";
        } else {
          // Fallback to common root folder detection if index.html is somehow named differently
          const firstParts = cleanEntries.map((e) => e.entryName.replace(/\\/g, "/").split("/"));
          if (firstParts.length > 0 && firstParts.every((p) => p.length > 1)) {
            const shared = firstParts[0][0];
            if (firstParts.every((p) => p[0] === shared)) prefix = shared + "/";
          }
        }

        // 1) extract into a TEMP dir first — old deployment stays live on any failure
        let hasIndex = false,
          written = 0,
          totalBytes = 0;
        const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100MB Zip-Bomb guard
        const FORBIDDEN_EXTS = new Set([
          ".exe", ".bat", ".cmd", ".sh", ".bash", ".php", ".phtml", ".phar",
          ".cgi", ".pl", ".py", ".pyc", ".dll", ".so", ".jsp", ".jspx", ".asp", ".aspx"
        ]);

        if (cleanEntries.length > 2500) {
          throw new Error("archive contains too many files (max 2500)");
        }

        for (const entry of cleanEntries) {
          let rel = entry.entryName.replace(/\\/g, "/");
          if (prefix) {
            if (!rel.startsWith(prefix)) continue; // ignore files outside the main project folder
            rel = rel.slice(prefix.length);
          }
          if (
            !rel ||
            rel.split("/").includes("__MACOSX") ||
            path.basename(rel).startsWith(".")
          )
            continue;

          const ext = path.extname(rel).toLowerCase();
          if (FORBIDDEN_EXTS.has(ext)) {
            throw new Error(`forbidden file extension in archive: ${ext}`);
          }

          const target = safeJoin(extractDir, rel);
          if (!target) continue; // zip-slip guard
          if (path.basename(rel).toLowerCase() === "index.html") hasIndex = true;

          const data = entry.getData();
          totalBytes += data.length;
          if (totalBytes > MAX_UNCOMPRESSED_BYTES) {
            throw new Error("uncompressed archive size exceeded limit (max 100MB)");
          }

          await fsp.mkdir(path.dirname(target), { recursive: true });
          await fsp.writeFile(target, data);
          written++;
        }
        if (!written) throw new Error("no usable files in archive");
        if (!hasIndex) throw new Error("archive must contain an index.html file");

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
