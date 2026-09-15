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
