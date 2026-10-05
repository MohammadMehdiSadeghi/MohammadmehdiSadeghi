/* ════════════════════════════════════════════════════════════════════
   Postgres (Supabase) store — the durable backend for the admin panel.

   WHY THIS EXISTS
     Serverless instances each got their own /tmp, so every panel save
     (telegram token, site info, projects order, skills, messages) was
     gone on the next cold start or redeploy. The panel looked like it
     "just doesn't save".

   HOW IT WORKS
     One generic key/value table (admin_settings) holds every JSON-shaped
     document, and three normal tables hold the collections that are
     queried relationally (projects, skills, contact_messages).

     Collisions are resolved per-key: `admin_settings.key` is the PRIMARY
     KEY and every write is an upsert, so two lambdas saving different
     things can never clobber each other's rows.

   CONFIG
     SUPABASE_DB_URL  (preferred)  or  DATABASE_URL
     Use the Supabase "Connection pooling" / Transaction pooler URI —
     the direct 5432 connection runs out of slots on serverless.
     Example:
       postgresql://postgres.xxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
     If the URI carries `?pgbouncer=true`, the adapter is switched to
     `prepare: false` automatically.

   FALLBACK
     No connection string => every function is a no-op and callers keep
     using the file store. Nothing breaks; it just isn't durable.
   ════════════════════════════════════════════════════════════════════ */

let sql = null; // postgres.js client
let ready = null; // memoised init promise
let available = false;

export function dbUrl() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

export function dbConfigured() {
  return !!dbUrl();
}

/* True once the client is actually usable — callers use this to decide
   whether to show the "not stored permanently" warning. */
export function dbReady() {
  return available;
}

async function init() {
  if (!dbConfigured()) return null;
  if (sql) return sql;
  try {
    const { default: postgres } = await import("postgres");
    const url = dbUrl();
    sql = postgres(url, {
      max: Number(process.env.SUPABASE_DB_POOL_MAX || 3),
      idle_timeout: 20,
      connect_timeout: 10,
      /* pgbouncer / transaction pooler cannot do prepared statements */
      prepare: !/pgbouncer=true/i.test(url) && process.env.SUPABASE_DB_PREPARE !== "false",
      onnotice: () => {},
    });
    /* fail fast if the schema/db is unreachable */
    await sql`SELECT 1`;
    available = true;
    return sql;
  } catch (err) {
    console.error("[pg] connection failed:", err?.message || err);
    sql = null;
    available = false;
    return null;
  }
}

export async function pg() {
  if (!ready) ready = init();
  /* a previously failed init should be retried on a later cold path */
  const client = await ready;
  if (!client && dbConfigured()) return null;
  return client;
}

/* ── generic JSON documents (admin_settings) ────────────────────────── */

export async function kvGet(key, fallback = null) {
  const c = await pg();
  if (!c) return fallback;
  try {
    const rows = await c`
      SELECT value FROM admin_settings WHERE key = ${key} LIMIT 1
    `;
    if (!rows.length) return fallback;
    const v = rows[0].value;
    return v == null ? fallback : v;
  } catch (err) {
    console.error(`[pg] kvGet(${key}) failed:`, err?.message || err);
    return fallback;
  }
}

export async function kvSet(key, value) {
  const c = await pg();
  if (!c) return false;
  try {
    await c`
      INSERT INTO admin_settings (key, value, updated_at)
      VALUES (${key}, ${c.json(value)}, NOW())
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value, updated_at = NOW()
    `;
    return true;
  } catch (err) {
    console.error(`[pg] kvSet(${key}) failed:`, err?.message || err);
    return false;
  }
}

/* ── projects ───────────────────────────────────────────────────────── */

const PROJECT_COLS = (r) => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  description: r.description || "",
  category: Array.isArray(r.category) ? r.category : [],
  image: r.image_url || "",
  url: r.url || "",
  githubUrl: r.github_url || null,
  projectType: r.project_type,
});

export async function pgListProjects(type) {
  const c = await pg();
  if (!c) return null;
  try {
    const rows = await c`
      SELECT id, slug, title, description, category, image_url, url,
             github_url, project_type
      FROM projects
      WHERE project_type = ${type}
      ORDER BY display_order ASC, id ASC
    `;
    return rows.map(PROJECT_COLS);
  } catch (err) {
    console.error("[pg] listProjects failed:", err?.message || err);
    return null;
  }
}

export async function pgReplaceProjects(type, list) {
  const c = await pg();
  if (!c) return false;
  const rows = Array.isArray(list) ? list : [];
  try {
    await c.begin(async (tx) => {
      await tx`DELETE FROM projects WHERE project_type = ${type}`;
      let order = 0;
      for (const p of rows) {
        order += 1;
        await tx`
          INSERT INTO projects
            (slug, title, description, category, image_url, url,
             project_type, github_url, display_order, is_published)
          VALUES (
            ${p.slug || null},
            ${String(p.title || "Untitled")},
            ${String(p.description || "")},
            ${tx.json(Array.isArray(p.category) ? p.category : [])},
            ${String(p.image || "")},
            ${String(p.url || "")},
            ${type},
            ${p.githubUrl || null},
            ${Number(p.displayOrder ?? order)},
            TRUE
          )
        `;
      }
    });
    return true;
  } catch (err) {
    console.error("[pg] replaceProjects failed:", err?.message || err);
    return false;
  }
}

/* ── skills ─────────────────────────────────────────────────────────── */

export async function pgListSkills() {
  const c = await pg();
  if (!c) return null;
  try {
    const rows = await c`
      SELECT id, name, icon_url, display_order
      FROM skills
      ORDER BY display_order ASC, id ASC
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      img: r.icon_url || "",
      order: r.display_order,
    }));
  } catch (err) {
    console.error("[pg] listSkills failed:", err?.message || err);
    return null;
  }
}

export async function pgReplaceSkills(list) {
  const c = await pg();
  if (!c) return false;
  const rows = Array.isArray(list) ? list : [];
  try {
    await c.begin(async (tx) => {
      await tx`DELETE FROM skills`;
      let order = 0;
      for (const s of rows) {
        order += 1;
        await tx`
          INSERT INTO skills (name, icon_url, display_order)
          VALUES (
            ${String(s.name || "Unknown")},
            ${String(s.img || "")},
            ${Number(s.displayOrder ?? order)}
          )
        `;
      }
    });
    return true;
  } catch (err) {
    console.error("[pg] replaceSkills failed:", err?.message || err);
    return false;
  }
}

/* ── contact messages ───────────────────────────────────────────────── */

export async function pgListMessages() {
  const c = await pg();
  if (!c) return null;
  try {
    const rows = await c`
      SELECT id, name, phone_number, message, status, created_at
      FROM contact_messages
      ORDER BY created_at DESC, id DESC
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phoneNumber: r.phone_number || "",
      message: r.message,
      status: r.status,
      date: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  } catch (err) {
    console.error("[pg] listMessages failed:", err?.message || err);
    return null;
  }
}

export async function pgInsertMessage({ name, phoneNumber, message }) {
  const c = await pg();
  if (!c) return null;
  try {
    const rows = await c`
      INSERT INTO contact_messages (name, phone_number, message, status)
      VALUES (${name}, ${phoneNumber || ""}, ${message}, 'unseen')
      RETURNING id, name, phone_number, message, status, created_at
    `;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      phoneNumber: r.phone_number || "",
      message: r.message,
      status: r.status,
      date: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    };
  } catch (err) {
    console.error("[pg] insertMessage failed:", err?.message || err);
    return null;
  }
}

export async function pgSetMessageStatus(id, status) {
  const c = await pg();
  if (!c) return false;
  try {
    const rows = await c`
      UPDATE contact_messages SET status = ${status}
      WHERE id = ${Number(id)}
      RETURNING id
    `;
    return rows.length > 0;
  } catch (err) {
    console.error("[pg] setMessageStatus failed:", err?.message || err);
    return false;
  }
}

export async function pgDeleteMessage(id) {
  const c = await pg();
  if (!c) return false;
  try {
    const rows = await c`
      DELETE FROM contact_messages WHERE id = ${Number(id)} RETURNING id
    `;
    return rows.length > 0;
  } catch (err) {
    console.error("[pg] deleteMessage failed:", err?.message || err);
    return false;
  }
}
