# Node.js Backend — راهنمای اجرا

از **۷ سپتامبر ۲۰۲۶** بک‌اند این سایت **Node.js (Express)** است — Apache/PHP کلاً حذف شد.

### آپلود پروژه از پنل (جدید)
- تو پنل → Projects → `+ new-project` → سورس رو «upload dist.zip» بذار و فایل zip خروجی build رو آپلود کن → خودکار باز و در `public/Projects/<نوع>/<slug>/` دیپلوی میشه.
- لینک خارجی هم داری: سورس رو «external link» بذار و URL بده.
- اندپوینت: `POST /api/admin/upload-project` (multipart: title, type, githubUrl, archive).

### نکتهٔ لینک عمیق (deep-link)
اسکریپت‌ها با مسیر نسبی (`base: './'`) بیلد میشن؛ سرور حالا هر آدرس asset زیر مسیرهای SPA (مثل `/admin/projects/assets/...`) رو با ریدایرکت به مسیر درست حل میکنه — رفرش تو صفحات ادمین دیگه صفحهٔ خالی نمیده.

## اجرا

```bash
npm run build      # بیلد فرانت‌اند
npm start          # سرور روی http://localhost:3000
```

- `npm run dev` هنوز مثل قبل فقط Vite است (فرانت‌اند).
- سرور `dist/` + همهٔ APIها + پروژه‌های داخل `/Projects` را سرو می‌کند.
- پورت دلخواه: `PORT=4000 npm start`

## ساختار

| مسیر | کار |
|---|---|
| `server.js` | سرور اصلی: استاتیک + تمام APIهای سابق PHP |
| `data/` | دادهٔ زمان اجرا (visits/messages/clicks/config) — در git نیست |
| `public/api/*.json` | داده‌های خام پروژه‌ها و مهارت‌ها (فقط‌خواندنی) |
| `server-upload.js` | آپلود zip پروژه‌ها از پنل ادمین |

## APIها (سابق PHP → فعلی Node)

| قبلی | فعلی | توضیح |
|---|---|---|
| `/api/projects.php` | `/api/projects` | لیست پروژه‌ها (فیلتر category) |
| `/api/mini-projects.php` | `/api/mini-projects` | مینی‌پروژه‌ها |
| `/api/project.php` | `/api/project?slug=` | تک‌پروژه |
| `/api/skills.php` | `/api/skills` | مهارت‌ها |
| `/api/search.php` | `/api/search?q=` | جستجوی موزیک (فازی، تک‌نرمال‌سازی، ترنслیت) |
| `/api/song.php` | `/api/song?id=` | تک‌آهنگ |
| `/api/admin/auth.php` | `/api/admin/auth` | لاگین ادمین (HMAC token) |
| `/api/admin/auth-check.php` | `/api/admin/auth-check` | بررسی توکن |
| `/api/admin/stats.php` | `/api/admin/stats` | آمار کامل: ساعتی/روزانه/هفتگی/ماهانه/۳ماه/۶ماه/سالانه + بازهٔ دلخواه (from/to) + button analytics |
| `/api/admin/telegram` | تنظیمات نوتیفیکیشن تلگرام (GET/POST) + `/test` + `/detect-chat` |
| `/api/admin/messages.php` | `/api/admin/messages` | پیام‌ها (GET/PATCH/DELETE با توکن، POST عمومی) |
| `/api/admin/projects-admin.php` | `/api/admin/projects-admin` | CRUD پروژه‌ها |
| `/api/admin/skills-admin.php` | `/api/admin/skills-admin` | CRUD مهارت‌ها |
| `/api/admin/track.php` | `/api/admin/track` | رهگیری بازدید |
| `/api/admin/track-click.php` | `/api/admin/track-click` | رهگیری کلیک |
| Digikala `backend/api.php` | `/api/digikala?type=` | JSON محصولات |
| Ubisoft `backend/api.php` | `/api/ubisoft?type=` | JSON اسلایدر |

## ادمین

- کانفیگ/توکن‌ها از `data/config.json` خوانده می‌شود (مثل قبل: `password_sha256` + `secret`).
- دادهٔ قبلی `public/api/admin/data/*.json` به `data/` منتقل شد — آمار و پیام‌های قبلی سر جایشان هستند.

## امنیت (مثل قبل)

- رمز فقط هش SHA-256؛ توکن HMAC-SHA256 با انقضا ۷ روزه.
- rate limit: لاگین/تماس ۵ بار در ۱۵ دقیقه؛ track/click نرم (سکوت).
- هیچ کلید/رمزی در فایل‌ها hardcode نشده.

## ماندگاری آمار (روی Vercel)

روی Vercel هر لامبدا یک `/tmp` مخصوص خودش دارد که با هر cold start پاک می‌شود؛ همین باعث می‌شد آمار پنل «ریست» شود و با هر دیپلوی صفر شود.

حالا اگر یک استور سازگار با Redis REST تنظیم شود، همان منبع حقیقت می‌شود و آمار از cold start، ری‌دیپلوی و چند اینستنس هم‌زمان جان سالم به در می‌برد. (Vercel KV خودش Upstash است، پس هر کدام از این دو جفت متغیر کار می‌کند.)

| متغیر محیطی | مقدار |
|---|---|
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` | از Vercel KV / Upstash |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | همان، با نام‌گذاری Upstash |

- بدون این متغیرها رفتار قبلی است (فایل) — که برای `npm run dev` و سرور self-hosted درست است، چون روی دیسک واقعی می‌نویسند.
- `STORE_NAMESPACE` (اختیاری، پیش‌فرض `portfolio`) پیشوند کلیدها.
- `STORE_TIMEOUT_MS` (اختیاری، پیش‌فرض ۴۰۰۰) مهلت هر درخواست به استور.

در پنل → Analytics کنار «live» یک برچسب کوچک هست: **saved** یعنی ماندگار، **not saved** یعنی موقت و روی این هاست ریست می‌شود.

استور فایل همیشه به‌عنوان کش/fallback نوشته می‌شود، پس قطعی موقت شبکه درخواست را خراب نمی‌کند. دکمهٔ Reset هر دو نسخه (فایل + استور ماندگار) را پاک می‌کند تا داده برنگردد.

### سه ریشهٔ ذخیره‌سازی (قبل از این تغییر)

| بک‌اند | محل ذخیره |
|---|---|
| `npm run dev` (پلاگین mock) | `public/api/admin/data/*.json` — روی دیسک، ماندگار |
| `npm start` (`server.js`) | `data/*.json` — روی دیسک، ماندگار |
| Vercel (`api/`) | `/tmp/portfolio-data` — **موقت** ← با استور ماندگار حل شد |

## شمارش بازدید

هر باز کردن صفحه دقیقاً **یک** ویو ثبت می‌کند. قبلاً `StrictMode` افکت را دو بار اجرا می‌کرد و هر صفحه دو ویو می‌خورد (۴ صفحه = ۸ ویو). گارد در `VisitTracker` این را می‌بندد؛ رفرش واقعی و برگشت به یک صفحهٔ قبلی همچنان ویو جدید حساب می‌شود.

تست‌ها:

```bash
node tools/probe-visit-counting.mjs      # نیاز به dev server روی 5173
node tools/verify-durable-analytics.mjs  # بدون نیاز به سرور؛ cold start را شبیه‌سازی می‌کند
```
