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
