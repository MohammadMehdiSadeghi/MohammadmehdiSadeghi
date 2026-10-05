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

## ماندگاری داده در پنل ادمین (Supabase / Postgres)

قبلاً روی Vercel هر لامبدا یک `/tmp` مخصوص خودش داشت که با هر cold start پاک می‌شد؛
نتیجه این بود که **توکن ربات تلگرام، اطلاعات سایت، چیدمان پروژه‌ها، اسکیل‌ها و پیام‌ها
اصلاً سیو نمی‌شدند** و با هر دیپلوی صفر می‌شدند.

حالا ذخیره‌سازی ماندگار روی **Supabase/Postgres** است. یک جدول کلید/مقدار
(`admin_settings`) همهٔ سندهای JSON پنل را نگه می‌دارد و سه جدول رابطه‌ای
(`projects`, `skills`, `contact_messages`) مجموعه‌های قابل‌کوئری را.

### راه‌اندازی (یک‌بار)

1. در Supabase → **SQL Editor** فایل زیر را کامل Paste کن و Run بزن:
   `sql/006_supabase_panel_store.sql`
   (idempotent است — چند بار اجرا کردنش ضرری ندارد. جدول‌ها + RLS + دادهٔ اولیه.)

2. در Supabase → **Connect** آدرس **Connection pooling / Transaction pooler**
   (پورت `6543`) را بردار و در Vercel → Settings → Environment Variables بگذار:

   | متغیر | مقدار |
   |---|---|
   | `SUPABASE_DB_URL` | `postgresql://postgres.xxxx:PASSWORD@aws-0-….pooler.supabase.com:6543/postgres` |

   (نام‌های `DATABASE_URL` و `POSTGRES_URL` هم پذیرفته می‌شوند.)
   اگر در URL پارامتر `?pgbouncer=true` باشد، خودکار روی `prepare: false` تنظیم می‌شود.

3. Redeploy. تمام. از این به بعد هر Save در پنل روی دیتابیس می‌نشیند و
   از cold start، redeploy و چند اینستنس هم‌زمان جان سالم به در می‌برد.

### چرا کلید/مقدار به‌جای فایل

هر سند پنل یک **سطر** است با کلید نامِ همان فایل (`telegram.json`، `site.json`،
`skills.json`، …). چون `key` کلید اصلی است و هر نوشتن upsert می‌شود، دو لامبدای
هم‌زمان که چیزهای مختلف را ذخیره می‌کنند نمی‌توانند نوشتهٔ همدیگر را پاک کنند —
مشکل قبلی دقیقاً همین بود (read-modify-write روی یک فایل مشترک).

### بدون دیتابیس

اگر `SUPABASE_DB_URL` تنظیم نشده باشد، همان مسیر فایل (`/tmp` روی Vercel،
`data/` روی سرور self-hosted) استفاده می‌شود و پنل کار می‌کند — فقط روی Vercel
ماندگار نیست. در پنل → Site info یک هشدار زرد نشان داده می‌شود.

### متغیرهای اختیاری

| متغیر | پیش‌فرض | کار |
|---|---|---|
| `SUPABASE_DB_POOL_MAX` | `3` | حداکثر کانکشن هر لامبدا |
| `SUPABASE_DB_PREPARE` | خودکار | `false` برای poolerهایی که prepared statement ندارند |
| `VERCEL_DATA_DIR` | `/tmp/portfolio-data` | محل کش فایل (fallback) |

در پنل → Site info برچسب `storage` حالا `supabase-postgres` را نشان می‌دهد
یعنی ماندگار.

### شمارش بازدید

هر باز کردن صفحه دقیقاً **یک** ویو ثبت می‌کند. قبلاً `StrictMode` افکت را دو بار اجرا می‌کرد و هر صفحه دو ویو می‌خورد (۴ صفحه = ۸ ویو). گارد در `VisitTracker` این را می‌بندد؛ رفرش واقعی و برگشت به یک صفحهٔ قبلی همچنان ویو جدید حساب می‌شود.

تست‌ها:

```bash
node tools/probe-visit-counting.mjs      # نیاز به dev server روی 5173
node tools/verify-durable-analytics.mjs  # بدون نیاز به سرور؛ cold start را شبیه‌سازی می‌کند
```
