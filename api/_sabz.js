/* ════════════════════════════════════════════════════════════════════
   Sabz-Learn sub-app backend — /Users and /Comments.

   The Sabz-Learn bundle fetches:
     GET  ../server/users      → list users  (login looks up by phone)
     POST ../server/users      → { name, phoneNumber, password } register
     GET  ../server/comments   → list comments
     POST ../server/comments   → add a comment
   Originally those were a small PHP/Node server that never shipped, so
   the deployed site answered with index.html and the app broke (comments
   never rendered, register/login did nothing).

   STORAGE: deliberately EPHEMERAL (the user asked for a throwaway DB:
   "user makes an account, tests it, then everything is wiped"). Data is
   kept in /tmp per serverless instance and is seeded with demo comments
   so the comments slider is never empty.

   It wipes itself two ways, so a test account never becomes permanent:
     1) TTL — accounts older than USER_TTL_MS are dropped on the next read
        (a test login stops working after that, by design).
     2) The admin panel's reset button → POST /api/admin/reset.
   Comments seeded below are re-created after a wipe; user accounts are not.
   ════════════════════════════════════════════════════════════════════ */

import {
  readStore,
  writeStore,
  deleteStore,
  withLock,
  rateCheck,
} from "./_lib.js";

const USERS = "sabz-users.json";
const COMMENTS = "sabz-comments.json";

/* throwaway accounts live 12h, then the store drops them on next read */
const USER_TTL_MS = Number(process.env.SABZ_USER_TTL_MS) || 12 * 60 * 60 * 1000;

/* demo comments — mirrors the shape the bundle renders:
   { content, user: { name, enrolled_courses_count } } */
const SEED_COMMENTS = [
  {
    id: 1,
    content:
      "دوره‌ها فوق‌العاده کاربردی بود. پروژه محور بودنش باعث شد خیلی سریع‌تر یاد بگیرم و بتونم توی کار واقعی استفاده کنم.",
    user: { name: "علی رضایی", enrolled_courses_count: 4 },
    date: "2026-08-20T10:12:00.000Z",
  },
  {
    id: 2,
    content:
      "پشتیبانی خیلی سریع جواب داد و مشکلاتم حل شد. کیفیت آموزش‌ها از خیلی از دوره‌های پولی بهتر بود.",
    user: { name: "سارا محمدی", enrolled_courses_count: 7 },
    date: "2026-08-24T18:40:00.000Z",
  },
  {
    id: 3,
    content:
      "من تازه شروع کردم و با همین دوره‌های مقدماتی تونستم اولین پروژه‌ام رو بسازم. پیشنهاد می‌کنم.",
    user: { name: "محمد کریمی", enrolled_courses_count: 2 },
    date: "2026-09-01T09:05:00.000Z",
  },
  {
    id: 4,
    content:
      "ساختار درس‌ها خیلی منظمه و هر بخش تمرین داره. برای کسی که می‌خواد جدی یاد بگیره عالیه.",
    user: { name: "فاطمه حسینی", enrolled_courses_count: 5 },
    date: "2026-09-06T14:22:00.000Z",
  },
];

const s = (v, max) => String(v ?? "").trim().slice(0, max);

async function readUsers() {
  const store = await readStore(USERS, { users: [], nextId: 1 });
  if (!Array.isArray(store.users)) store.users = [];
  if (!store.nextId) store.nextId = store.users.length + 1;

  /* expire throwaway accounts so a test login doesn't survive */
  const cutoff = Date.now() - USER_TTL_MS;
  const fresh = store.users.filter((u) => {
    const t = Date.parse(u.createdAt || 0);
    return !Number.isFinite(t) || t >= cutoff;
  });
  if (fresh.length !== store.users.length) {
    store.users = fresh;
    await writeStore(USERS, store);
  }
  return store;
}

/* ── used by the admin reset button ── */
export async function resetSabzData() {
  const removed = [];
  for (const [name, file] of [[USERS, "users"], [COMMENTS, "comments"]]) {
    /* deleteStore clears the durable copy too when one is configured —
       a plain unlink would leave the wipe half-done. */
    if (await deleteStore(name)) removed.push(file);
  }
  return removed;
}

async function readComments() {
  const store = await readStore(COMMENTS, null);
  if (!store || !Array.isArray(store.comments)) {
    const seeded = { comments: SEED_COMMENTS, nextId: SEED_COMMENTS.length + 1 };
    await writeStore(COMMENTS, seeded);
    return seeded;
  }
  return store;
}

export default async function handler(req, res, resource) {
  if (resource === "comments") return commentsHandler(req, res);
  return usersHandler(req, res);
}

/* GET → list · POST → register */
async function usersHandler(req, res) {
  if (req.method === "GET") {
    const store = await readUsers();
    /* ⚠️ SECURITY: this PUBLIC route (Sabz-Learn's own login screen calls it,
       unauthenticated) returns each account's PLAINTEXT password.

       It is deliberate-looking but load-bearing, so do NOT just delete the
       field. The prebuilt client bundle does the whole login in the browser:

         const users = await fetch(".../server/users").json();
         const user  = users.find(u => u.phoneNumber === typedPhone);
         if (user && user.password === typedPassword) {
           setToken(crypto.randomUUID());   // token invented client-side
           navigate("/");
         }

       Stripping `password` here breaks that login, and `all/dist` ships with
       no `src/` in this repo, so the client cannot be rebuilt from here.

       Proper fix (needs a client rebuild): add a POST verify endpoint that
       checks the password server-side and returns a real token, then return
       `rest` only — exactly the shape this map already computes. */
    return res.json(
      store.users.map(({ password, ...rest }) => ({ ...rest, password }))
    );
  }

  if (req.method === "POST") {
    const allowed = await rateCheck(req, "sabz-register", false);
    if (!allowed) {
      return res
        .status(429)
        .json({ error: "too many attempts, try again later" });
    }

    const body = req.body || {};
    const name = s(body.name, 60);
    const phoneNumber = s(body.phoneNumber, 20);
    const password = String(body.password ?? "");

    if (!name || !phoneNumber || !password) {
      return res
        .status(400)
        .json({ error: "name, phoneNumber and password are required" });
    }
    if (!/^09[0-9]{9}$/.test(phoneNumber)) {
      return res.status(400).json({ error: "invalid phone number" });
    }

    const created = await withLock("sabz-users", async () => {
      const store = await readUsers();
      if (store.users.some((u) => u.phoneNumber === phoneNumber)) {
        return { exists: true };
      }
      const user = {
        id: store.nextId++,
        name,
        phoneNumber,
        password, // ephemeral demo store — matches the client's local compare
        token: null,
        enrolled_courses_count: 0,
        createdAt: new Date().toISOString(),
      };
      store.users.push(user);
      await writeStore(USERS, store);
      return { user };
    });

    if (created.exists) {
      return res
        .status(409)
        .json({ error: "this phone number is already registered" });
    }
    const { password: _pw, ...safe } = created.user;
    return res.json({ ok: true, user: safe });
  }

  return res.status(405).json({ error: "method not allowed" });
}

/* GET → list · POST → add */
async function commentsHandler(req, res) {
  if (req.method === "GET") {
    const store = await readComments();
    return res.json(store.comments);
  }

  if (req.method === "POST") {
    const allowed = await rateCheck(req, "sabz-comment", false);
    if (!allowed) {
      return res
        .status(429)
        .json({ error: "too many attempts, try again later" });
    }
    const body = req.body || {};
    const content = s(body.content ?? body.comment, 1000);
    if (!content) return res.status(400).json({ error: "content is required" });

    const comment = await withLock("sabz-comments", async () => {
      const store = await readComments();
      const entry = {
        id: store.nextId++,
        content,
        user: {
          name: s(body.name ?? body?.user?.name, 60) || "دانشجو",
          enrolled_courses_count: Number(body?.user?.enrolled_courses_count) || 0,
        },
        date: new Date().toISOString(),
      };
      store.comments.unshift(entry);
      await writeStore(COMMENTS, store);
      return entry;
    });
    return res.json({ ok: true, comment });
  }

  return res.status(405).json({ error: "method not allowed" });
}
