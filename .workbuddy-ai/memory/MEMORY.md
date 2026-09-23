# Project Memory — MohammadmehdiSadeghi (React + Vite + Tailwind v4 portfolio)

## Public layout convention (respect this)
Public pages use a fixed two-column shell: `w-14` (56px) SnakeBar rail + a sidebar nav.
The rail+sidebar total is deliberately equal to the header's brand-column width so the
header's vertical divider continues down through the page.

| Breakpoint | Header brand | Rail + sidebar |
|---|---|---|
| `lg` (1024px) | `lg:w-[456px]` | 56 + `lg:w-[400px]` = 456 |
| `xl` (1280px) | `xl:w-[513px]` | 56 + `xl:w-[457px]` = 513 |

The `lg` sidebar is 400px (not 344px) because the contact email
(`mohammad12345sadeghi@gmail.com`) needs 285px and `lg:px-10` eats 80px of it.

Files that must be changed together: `src/Components/Header/index.jsx`,
`src/Page/About/SubjectBox`, `src/Page/Project/FilterBox`, `src/Page/Blog/index`,
`src/Page/Blog/Post`, `src/Page/Contact/ContactBox`.

The split (side-by-side) layout for all public pages starts at `lg`, NOT `md`.
Below `lg` every page uses its stacked/accordion mobile layout.

## Border rules (learned the hard way)
- A zero-height box that still has `border-top`/`border-bottom` paints a 1px line.
  Never leave borders on a collapsed element (see `.mobile-nav-panel` in `index.css`).
- Each boundary in the About sidebar must be drawn by exactly ONE element, otherwise you
  get a 2px "double border". Divider ownership: `personal-info` h2 (bottom),
  active tab (bottom), `skills` tab (bottom, always at `lg`), mobile content wrapper
  (bottom), `contacts` h2 (bottom only — no top border).

## Tooling notes
- No browser-automation MCP is available in this environment. To inspect the real UI,
  `puppeteer-core` is installed at `C:\Users\Mohammad\.workbuddy-ai\binaries\node\workspace`
  and drives the system Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
  Scripts used: `shot.mjs`, `crop.mjs`, `audit.mjs`, `inspect.mjs`, `final.mjs`, `deep.mjs`,
  `typing.mjs`, `typingnav.mjs`, `typingvis.mjs`.
- Dev server: `npm run dev` on port 5173 (has a mock API plugin).
- `body { overflow-x: hidden }` — decorative blurred glow blobs intentionally bleed past
  the viewport; the audit flags them but they are not bugs.

## Mobile menu (`.mobile-nav-panel`)
Full-screen overlay: `fixed inset-0`, covers the header too (the brand row is re-drawn inside it).
Open/close animates `opacity` + `translateY` + `visibility` — NOT `max-height`, since there is no
small height to collapse to. Closed = `visibility: hidden` + `pointer-events: none`, so nothing
paints/hit-tests; that is what satisfies the "a collapsed panel must never carry borders" rule.
The hamburger label is `z-50` vs the panel's `z-40`, so it stays on top as the ✕.
Rows stagger via `--i` → `transition-delay: calc(var(--i,0) * .05s)`, applied only in `:checked`
so opening cascades but closing is instant. Body scroll is locked with
`body:has(.nav-toggle:checked) { overflow: hidden }` (CSS-only; degrades gracefully).

## Collapsed-by-default accordions (mobile)
Both accordions start CLOSED on every page — `personalInfoOpen` (`About/index.jsx`),
`projectsOpen` (`Project/FilterBox/index.jsx`); `contactsOpen`/`miniOpen` were already false.
Reason (user's own): with one open on entry the second section is pushed below the fold and never
seen. The mobile content IS gated by these flags — tapping a header is what reveals the bio pane
and the project grid — so do not "fix" the empty-looking mobile page by un-gating it.

## Blog content
Source of truth is **`public/api/blog.json`** — both `vite-plugin-mock-api.js` (dev) and
`api/_blog.js` (prod) read it. Post shape: `id, slug, title, excerpt, content, cover, coverAlt,
tags, date, published`. `cover: ""` is fine; the list card generates an editorial cover from the
first tag.

`content` is markdown-ish and parsed by `parseBlocks` (`src/lib/blog.js`): blocks are split on
`/\n{2,}/` FIRST, so every block must be its own blank-line-separated chunk.
- chunk of only `- item` → `ul`; only `1. item` → `ol`
- `## text` → `h` (headings also build the post's Table of Contents sidebar)
- `> text` → quote callout; anything else → paragraph
- **No inline markdown.** The renderer prints `{b.text}` raw, so backticks/asterisks show up
  literally. Write code identifiers as plain words.

The list endpoint strips `content` and sends a precomputed `words` count instead, so the card's
reading time matches the article. `countWords` therefore exists in **three** places that must stay
in sync: `src/lib/blog.js`, `api/_blog.js`, `vite-plugin-mock-api.js` (`countBlogWords`).

Editing `vite-plugin-mock-api.js` makes Vite restart — it can kill the dev server, so restart
`npm run dev` after such edits.

## Measuring overflow correctly (gotcha)
`scrollWidth` is clamped to `clientWidth`, so "does it fit?" via
`scrollWidth <= clientWidth` always reports FITS. To get real slack, walk the line boxes:
```js
const range = document.createRange();
range.selectNodeContents(el);
const rects = [...range.getClientRects()];   // line boxes, not the border box
// group by Math.round(rect.top), take max(right), compare to the content-box right edge
```
Also: `el.getClientRects()` on a block returns its border box (1 rect) — you must use a Range.

**A rect-based audit must filter on rendered-ness, not just rect size.** Elements inside a closed
overlay that are `position: fixed` keep non-zero rects while `visibility: hidden`, which produced
55 phantom NAV-OVERLAP flags. `visibility` is inherited, so testing `cs.visibility !== "hidden"`
on each element excludes the whole subtree.

**Boot loader and tests:** setting `sessionStorage["booted"]` *after* `goto` is too late — `App`
reads it during first render, so the loader still mounts for its 600ms minimum and swallows the
first synthetic click. Use `page.evaluateOnNewDocument(...)` before `goto`.

## Typing animation (Home hero)
`typeit-react` was REMOVED (dependency deleted) because of a React StrictMode bug:
its init effect does `instanceRef.current?.updateOptions(opts) || generateNewInstance()`, and
`updateOptions()` returns the instance (always truthy), so the rebuild branch only runs while
the ref is null. StrictMode's mount → cleanup(`destroy()`, ref still set) → remount reuses the
destroyed instance → nothing types and `afterComplete` never fires → the whole 3-line sequence
stalls (the "name never appears until I refresh" bug). The TypeIt core is also unusable
directly: its `#fire()` loop is `requestAnimationFrame`-driven with no `destroyed` guard, so
the StrictMode cycle leaves a second live loop → doubled characters.

Replacement: `src/Components/Typewriter/index.jsx` — self-contained `setTimeout` chain, one
writer per mount, cancels its timer and clears `textContent` on cleanup. API:
`text`, `as`, `speed`, `lifeLike`, `cursor`, `onDone`. The caret is a `<span class="ti-cursor">`
whose `|` glyph comes from CSS `::before` in `index.css`, so it never pollutes `textContent`.
`[data-typed="done"] .ti-cursor` hides it once a line finishes. Verified 12/12 cold loads and
8/8 remounts after client-side navigation at 320–1920px.

## Code listing with line numbers (Contact code pane)
`.code-preview` in `src/Page/Contact/CodeView/index.jsx` renders one flex row per line
(fixed-width gutter span + `min-w-0` code cell) instead of a flat `<p>` with `<br>`s. A flat
`<p>` forces `white-space: nowrap` to keep its shape (so the longest line spills and scrolls
sideways), and when it does wrap the continuation restarts at the `<p>`'s left padding — i.e.
under the line number instead of under the code. The flex-row version wraps inside the code
cell and stays aligned, so no width can overflow. Reuse this pattern for any code listing.

## Storage: where runtime data lives (and why it reset)
Three backends, three roots — never assume they share data:
`npm run dev` (vite mock plugin) → `public/api/admin/data/*.json` (local-only; the `data/` rule in
`.gitignore` matches it at any depth, so it is NOT committed). `npm start` (`server.js`) →
`data/*.json`. Vercel (`api/`) → `/tmp/portfolio-data`, which is **ephemeral per instance** — that
is what made the analytics panel "reset".

`api/_lib.js` now owns a durable store layer: with `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or the
Upstash-named pair) set, Redis-REST is the source of truth and the local file is kept as a
cache/fallback; with nothing set it behaves exactly as before. Because every one of the 40
`readStore`/`writeStore` call sites already `await`, changing the backend needed **zero call-site
edits** — keep that property if you touch these helpers. `deleteStore()` must be used by anything
that wipes data (`api/admin/_reset.js`, `resetSabzData()`); a bare `fsp.unlink` leaves the durable
copy behind and the wipe silently fails.

`/api/admin/stats` returns `storage` ("redis" | "file") and `durable`, and the panel renders a
**saved / not saved** badge from it. Use that badge instead of guessing whether persistence is on.

## Counting page views — one view per page open
`src/Components/VisitTracker/index.jsx` guards with `lastCountedRef` (keyed on pathname) because
React StrictMode runs mount effects twice (setup → cleanup → setup) and each run POSTed to
`/api/admin/track`. Without the guard 4 pages recorded 8 views. The ref survives StrictMode's
effect teardown, so the second setup no-ops; a real reload (fresh ref) and a revisit after
navigating away (different pathname) still count. Use `keepalive: true` for the beacon, NOT an
`AbortController` — aborting does not un-send a request that Chrome already dispatched.

Invariant to preserve: `visits.days[d].total === sum(paths)` for tracked days. The demo seed used
to violate it (hardcoded `base` instead of summing its own paths), which reads as a counting bug.

## Day keys must be LOCAL dates
`dstr()` (local Y-M-D) in both `api/_lib.js` and the vite mock. Iran is UTC+3:30, so keying with
`toISOString()` filed visits made between 00:00 and 03:30 local under the previous day in dev and
the current day in prod. Any new date bucketing must use the local `dstr()`.

## Three backends must stay in parity — check all three
The same API surface is implemented THREE times: `api/` (Vercel serverless), `server.js`
(self-hosted Express), and `vite-plugin-mock-api.js` (dev). A guard or behaviour present in two of
them is a strong signal the third is missing it. Real bugs found this way:
`api/admin/_fs.js` lacked the `if (!rel) refuse` guard that both others had, so
`POST fs-delete {path:""}` recursively wiped the whole data dir (`safeJoin("")` resolves to the
root and PASSES the containment check — the root is inside the root).
When you fix one backend, grep the other two for the same code.

## Admin overlay vs bundled data (public routes)
`_data.js` exposes `listData(name)` (overlay first, then `BUNDLED`) and `saveData(name, data)`.
`_projects-admin`/`_skills-admin`/`_blog-admin` write via `saveData`; the panel reads via
`listData`. Any PUBLIC route must also use `listData` or admin edits are invisible in production.
`STATIC_JSON` in `api/index.js` and `_skills.js` used to read `BUNDLED` directly — fixed; keep it
that way (note `STATIC_JSON` entries are now awaited).

## Client-side auth in the Sabz-Learn sub-app (do not "fix" naively)
`GET /api/sabz/users` is public and returns each account's PLAINTEXT password. That is
load-bearing: the prebuilt bundle (`public/Projects/Web-Project/Sabz-Learn/all/dist`) fetches the
user list and compares `user.password == typedPassword` in the browser, then mints a token with
`crypto.randomUUID()` — the server never verifies anything. There is no `src/` in the repo, so the
client cannot be rebuilt here. Stripping the field breaks login; `tools/verify-security.mjs`
asserts it is still present for exactly that reason. Proper fix = server-side verify endpoint +
client rebuild.

## Locks: every read-modify-write needs withLock
`_lib.js` exports `withLock(key, fn)`; `withLock` serialises per store name. `_track.js` and
`_messages.js` POST use it. Mutations that read a whole JSON list, edit it and write it back MUST
be wrapped or concurrent writers silently drop updates (`_projects-admin.js` and
`_skills-admin.js` are now wrapped; `_messages.js` PATCH/DELETE and `_blog-admin.js` still are not).

## Do not write two response headers on one response
`res.writeHead(200, ...)` followed by `res.writeHead(404, ...)` throws `ERR_HTTP_HEADERS_SENT`
("Cannot write headers after they are sent to the client"). In the Vite dev mock this made Vite
answer with its own HTML error page, so the app did `JSON.parse("<!DOCTYPE")` and the user saw a
raw `Unexpected token '<'` instead of "post not found". Set the status inside each branch, and on
the client check `res.ok` BEFORE `res.json()`.

## Site-wide contact / social values live in `site.json` (never hardcode them)

Email, phone, brand name, GitHub / LinkedIn / Telegram / Instagram URLs and handles come from
**`public/api/site.json`**, edited in the admin panel at **`/admin/site`**. Do not reintroduce a
literal into a component — if you need one of these values, read it via `useSiteInfo()`.

- `handle` fields are stored **without** the leading `@`; the renderer adds it. Storing `"@x"`
  and rendering `"@" + value` produces `@@x`.
- `SITE_DEFAULTS` in `src/Hooks/useSiteInfo.jsx` duplicates the seed values on purpose: they are
  the first paint before the fetch resolves and the fallback when it fails. Keep them in sync with
  `public/api/site.json` when the seed changes.
- Consumers gate each row on truthiness (`{site.instagram && …}`), so **clearing a field removes
  that row from the site** rather than rendering a dead `mailto:` or an empty label.
- The public route is `/api/site.json` and must go through `listData` (overlay first), for the same
  reason `projects.json` / `skills.json` do — see "Admin overlay vs bundled data" above.
- Admin writes validate anything that becomes an `href` (email shape, phone digits, `https?://` +
  `new URL()`). A `javascript:` URL in the GitHub slot is an XSS vector, not a cosmetic issue.
- `index.html`'s JSON-LD `sameAs` is a build-time file the editor cannot reach — it still points at
  a different GitHub account (`irannama56-oss`) than the site's link.
