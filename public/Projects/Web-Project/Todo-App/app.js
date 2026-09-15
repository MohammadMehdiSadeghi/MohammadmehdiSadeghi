// ===================== تنظیمات پایه =====================
const WEEKDAY_FA = ['یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه']; // index = JS getDay()
const JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

// ===================== آیکون‌های مینیمال (SVG تک‌رنگ) =====================
const ICONS = {
  check: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
  edit: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
  clock: '<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  next: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  trash: '<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  hourglass: '<svg class="icon" viewBox="0 0 24 24"><path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/></svg>',
};

// ===================== تبدیل تاریخ میلادی به شمسی =====================
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let jy;
  if (gy <= 1600) { jy = 0; gy -= 621; } else { jy = 979; gy -= 1600; }
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + parseInt((gy2 + 3) / 4) - parseInt((gy2 + 99) / 100) + parseInt((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * parseInt(days / 12053);
  days %= 12053;
  jy += 4 * parseInt(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fullDateLabel(date) {
  const weekday = WEEKDAY_FA[date.getDay()];
  const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const gMiladi = date.toLocaleDateString('en-CA'); // yyyy-mm-dd
  return `${weekday} — ${jd} ${JALALI_MONTHS[jm - 1]} ${jy} / ${gMiladi} `;
}

function shortDateLabel(date) {
  const weekday = WEEKDAY_FA[date.getDay()];
  const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return `${weekday} ${jd} ${JALALI_MONTHS[jm - 1]}`;
}

// ===================== کمک برای محاسبه زمان (دقیقه از نیمه‌شب) =====================
function timeStrToMinutes(str) {
  if (!str) return null;
  const parts = str.split(':').map(Number);
  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}
function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}
function formatDuration(totalMinutes) {
  totalMinutes = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h} ساعت و ${m} دقیقه`;
  if (h > 0) return `${h} ساعت`;
  return `${m} دقیقه`;
}

// ===================== تم (روشن/تیره) =====================
function initTheme() {
  const saved = localStorage.getItem('todo_theme');
  const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('todo_theme', next);
}
initTheme();
document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

// ===================== وضعیت برنامه =====================
// نسخه‌ی تک‌کاربره: هیچ ورود/ثبت‌نامی وجود نداره و همه‌چیز مستقیم در دسترسه
let state = {
  owner: 'me',
  tab: 'today',
};
let progressTimer = null;
let autoCompleteTimer = null;

// ===================== ارتباط با «سرور» (در این نسخه، داده‌ی محلی تب) =====================
async function apiFetch(path, { method = 'GET', body = null } = {}) {
  try {
    return await demoApiFetch(path, { method, body });
  } catch (e) {
    throw new Error('خطای ناشناخته');
  }
}

// ===================== نمایش پیام کوتاه (ساده یا با قابلیت لغو) =====================
const toastEl = document.getElementById('toast');
const toastTextEl = document.getElementById('toastText');
const toastUndoEl = document.getElementById('toastUndo');
const toastBarEl = document.getElementById('toastBar');

let toastTimer = null;

function showToast(msg) {
  toastUndoEl.classList.add('hidden');

  toastBarEl.classList.remove('animate');
  toastBarEl.style.transform = 'scaleX(0)';
  toastTextEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 2200);
}

// toast با شمارش معکوس و امکان لغو (شبیه حذف پیام در تلگرام)
// duration به میلی‌ثانیه, onExpire وقتی زمان تموم بشه صدا زده می‌شه, onUndo وقتی کاربر لغو رو بزنه
let activeUndo = null; // { onExpire, timeoutId }

function showUndoToast(msg, duration, onExpire, onUndo) {
  // اگه یه undo دیگه در حال اجراست، همونو فورا قطعی کن و بعد این یکی رو نشون بده
  if (activeUndo) {
    clearTimeout(activeUndo.timeoutId);
    const prevExpire = activeUndo.onExpire;
    activeUndo = null;
    prevExpire();
  }

  toastTextEl.textContent = msg;
  toastUndoEl.classList.remove('hidden');

  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);

  toastBarEl.classList.remove('animate');
  toastBarEl.style.transform = 'scaleX(0)';
  // فورس ری‌فلو تا انیمیشن از اول شروع بشه
  void toastBarEl.offsetWidth;
  toastBarEl.style.transition = `transform ${duration}ms linear`;
  toastBarEl.style.transform = 'scaleX(1)';

  const timeoutId = setTimeout(() => {
    activeUndo = null;
    toastEl.classList.add('hidden');
    onExpire();
  }, duration);

  activeUndo = { onExpire, timeoutId };

  toastUndoEl.onclick = () => {
    clearTimeout(timeoutId);
    activeUndo = null;
    toastEl.classList.add('hidden');
    onUndo();
  };
}

// ===================== تغییر نام نمایشی (ثابت) =====================
document.getElementById('meName').textContent = 'ادمین';

function enterApp() {
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('meName').textContent = 'ادمین';
  document.getElementById('todayLabel').textContent = fullDateLabel(new Date());
  loadCurrentTab();

  // چک دوره‌ای در پس‌زمینه: هر کاری که ساعت پایانش گذشته و هنوز تیک نخورده،
  // خودکار تیک می‌خوره و می‌ره تو تاریخچه - بدون نیاز به تیک دستی
  autoCompleteExpiredTasks();
  clearInterval(autoCompleteTimer);
  autoCompleteTimer = setInterval(autoCompleteExpiredTasks, 60000); // هر ۱ دقیقه
}

// کارهایی که ساعت پایانشون گذشته و هنوز تیک نخورده رو خودکار تیک می‌زنه
async function autoCompleteExpiredTasks() {
  try {
    const today = new Date();
    const dateStr = toYMD(today);
    const weekday = today.getDay();
    const now = nowMinutes();

    // این چک همیشه رو کارهای خودِ کاربر انجام می‌شه (نه همکار), چون فقط
    // صاحب کار می‌تونه تیکش بخوره
    const [tasksRes, logsRes] = await Promise.all([
      apiFetch('tasks/list.php?owner=me'),
      apiFetch(`tasks/logs.php?owner=me&from=${dateStr}&to=${dateStr}&only_checked=0`),
    ]);

    const checkedIds = new Set(logsRes.logs.filter(l => l.checked).map(l => l.task_id));
    const expired = tasksRes.tasks.filter(t => {
      if (!t.days.includes(weekday) || checkedIds.has(t.id)) return false;
      const endMin = timeStrToMinutes(t.end_time);
      return endMin !== null && now > endMin;
    });

    if (expired.length === 0) return;

    for (const t of expired) {
      try {
        await apiFetch('tasks/toggle.php', { method: 'POST', body: { id: t.id, date: dateStr, checked: true } });
      } catch (e) { /* اگه یکیش خطا داد، بقیه رو ادامه بده */ }
    }

    if (expired.length === 1) {
      showToast(`«${expired[0].title}» چون ساعتش تموم شده بود، خودکار به تاریخچه رفت`);
    } else {
      showToast(`${expired.length} کار چون ساعتشون تموم شده بود، خودکار به تاریخچه رفتن`);
    }

    loadCurrentTab();
  } catch (e) {
    // مشکل شبکه/سرور بود، دفعه‌ی بعدی دوباره امتحان می‌شه
  }
}

// ===================== تعویض تب‌ها =====================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    state.tab = btn.dataset.tab;
    document.getElementById('tab-' + state.tab).classList.add('active');
    loadCurrentTab();
  });
});

function loadCurrentTab() {
  clearInterval(progressTimer);
  if (state.tab === 'today') loadToday();
  else if (state.tab === 'progress') {
    loadProgress();
    progressTimer = setInterval(loadProgress, 30000); // هر ۳۰ ثانیه به‌روزرسانی خودکار
  }
  else if (state.tab === 'week') loadWeek();
  else if (state.tab === 'history') loadHistory();
}

// ===================== ساخت کارت یک تسک =====================
function renderTaskCard(task, checked, dateStr, editable) {
  const card = document.createElement('div');
  card.className = 'task-card' + (checked ? ' done' : '');

  const check = document.createElement('div');
  check.className = 'task-check' + (checked ? ' checked' : '') + (editable ? '' : ' readonly');
  if (checked) check.innerHTML = ICONS.check;
  if (editable && !checked) {
    check.addEventListener('click', () => handleCompleteClick(task, dateStr, card, check));
  }

  const body = document.createElement('div');
  body.className = 'task-body';

  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title;
  body.appendChild(title);

  if (task.description) {
    const desc = document.createElement('div');
    desc.className = 'task-desc';
    desc.textContent = task.description;
    body.appendChild(desc);
  }

  if (task.time || task.end_time) {
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const b = document.createElement('span');
    b.className = 'badge';
    let label = '';
    if (task.time && task.end_time) label = `${task.time}–${task.end_time}`;
    else if (task.time) label = task.time;
    else label = task.end_time;
    b.innerHTML = ICONS.clock + ' ' + label;
    meta.appendChild(b);
    body.appendChild(meta);
  }

  card.appendChild(check);
  card.appendChild(body);

  if (editable) {
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.innerHTML = ICONS.edit;
    editBtn.addEventListener('click', () => openTaskModal(task));
    actions.appendChild(editBtn);
    card.appendChild(actions);
  }

  return card;
}

// وقتی روی دایره‌ی تیک کلیک می‌شه: فورا قطعی نمی‌کنیم، چند ثانیه فرصت لغو می‌دیم
// (شبیه حذف پیام تو تلگرام) - بعد از اتمام زمان، سرور به‌روزرسانی می‌شه و کار
// از لیست اصلی میره کنار (چون دیگه جزو کارهای انجام‌نشده حساب نمی‌شه)
const UNDO_DURATION = 4000; // ۴ ثانیه

function handleCompleteClick(task, dateStr, cardEl, checkEl) {
  cardEl.classList.add('pending');
  checkEl.classList.add('checked');
  checkEl.innerHTML = ICONS.check;

  const msg = `«${task.title}» انجام شد. خسته نباشی.`;

  showUndoToast(msg, UNDO_DURATION, async () => {
    // زمان تموم شد و لغو نشد -> قطعی کن و از سرور تیک بزن
    try {
      await apiFetch('tasks/toggle.php', { method: 'POST', body: { id: task.id, date: dateStr, checked: true } });
    } catch (e) { /* در صورت خطا، رفرش بعدی وضعیت واقعی رو نشون می‌ده */ }
    loadCurrentTab();
  }, () => {
    // کاربر لغو رو زد -> هیچ درخواستی به سرور نرفته, فقط ظاهر رو برگردون
    cardEl.classList.remove('pending');
    checkEl.classList.remove('checked');
    checkEl.innerHTML = '';
  });
}

// ===================== تب امروز =====================
async function loadToday() {
  const container = document.getElementById('todayList');
  container.innerHTML = '<div class="empty-hint">در حال بارگذاری...</div>';
  try {
    const today = new Date();
    const dateStr = toYMD(today);
    const weekday = today.getDay();
    const editable = state.owner === 'me';

    const [tasksRes, logsRes] = await Promise.all([
      apiFetch(`tasks/list.php?owner=${state.owner}`),
      apiFetch(`tasks/logs.php?owner=${state.owner}&from=${dateStr}&to=${dateStr}&only_checked=0`),
    ]);

    const checkedIds = new Set(logsRes.logs.filter(l => l.checked).map(l => l.task_id));
    const todays = tasksRes.tasks
      .filter(t => t.days.includes(weekday) && !checkedIds.has(t.id))
      .sort((a, b) => (timeStrToMinutes(a.time) ?? 9999) - (timeStrToMinutes(b.time) ?? 9999));

    container.innerHTML = '';
    if (todays.length === 0) {
      container.innerHTML = '<div class="empty-hint">کاری برای امروز نمونده، همه رو تموم کردی</div>';
      return;
    }
    todays.forEach(t => {
      container.appendChild(renderTaskCard(t, false, dateStr, editable));
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-hint">خطا در بارگذاری</div>';
  }
}

// ===================== تب در حال انجام (محاسبه خودکار، بدون ورودی دستی) =====================
async function loadProgress() {
  const container = document.getElementById('progressContent');
  if (!container.dataset.loadedOnce) {
    container.innerHTML = '<div class="empty-hint">در حال بارگذاری...</div>';
  }
  try {
    const today = new Date();
    const dateStr = toYMD(today);
    const weekday = today.getDay();

    const [tasksRes, logsRes] = await Promise.all([
      apiFetch(`tasks/list.php?owner=${state.owner}`),
      apiFetch(`tasks/logs.php?owner=${state.owner}&from=${dateStr}&to=${dateStr}&only_checked=0`),
    ]);
    container.dataset.loadedOnce = '1';

    const checkedIds = new Set(logsRes.logs.filter(l => l.checked).map(l => l.task_id));
    const now = nowMinutes();

    const todays = tasksRes.tasks
      .filter(t => t.days.includes(weekday) && !checkedIds.has(t.id) && t.time)
      .map(t => ({ ...t, startMin: timeStrToMinutes(t.time), endMin: timeStrToMinutes(t.end_time) }))
      .sort((a, b) => a.startMin - b.startMin);

    const active = todays.filter(t => t.endMin !== null && t.startMin <= now && now <= t.endMin);
    const upcoming = todays.filter(t => t.startMin > now);

    container.innerHTML = '';

    if (active.length === 0 && upcoming.length === 0) {
      container.innerHTML = '<div class="empty-hint">الان کاری در حال انجام یا برنامه‌ریزی‌شده‌ای برای ادامه امروز نیست</div>';
      return;
    }

    active.forEach(t => {
      const remaining = t.endMin - now;
      const card = document.createElement('div');
      card.className = 'progress-card active';
      let html = `
        <div class="progress-label">${ICONS.clock} در حال انجام</div>
        <div class="progress-title">${escapeHtml(t.title)}</div>
      `;
      if (t.description) html += `<div class="progress-desc">${escapeHtml(t.description)}</div>`;
      html += `<div class="progress-countdown">${ICONS.clock}<span>${formatDuration(remaining)} تا پایان</span></div>`;
      card.innerHTML = html;
      container.appendChild(card);
    });

    if (upcoming.length > 0) {
      const next = upcoming[0];
      const untilStart = next.startMin - now;
      const card = document.createElement('div');
      card.className = 'progress-card';
      let html = `
        <div class="progress-label">${ICONS.next} کار بعدی</div>
        <div class="progress-title">${escapeHtml(next.title)}</div>
        <div class="progress-desc">ساعت شروع: ${next.time}</div>
      `;
      if (active.length === 0) {
        html += `<div class="progress-countdown">${formatDuration(untilStart)} تا شروع</div>`;
      }
      card.innerHTML = html;
      container.appendChild(card);
    }
  } catch (e) {
    container.innerHTML = '<div class="empty-hint">خطا در بارگذاری</div>';
  }
}

// ===================== تب هفته پیش رو =====================
async function loadWeek() {
  const container = document.getElementById('weekList');
  container.innerHTML = '<div class="empty-hint">در حال بارگذاری...</div>';
  try {
    const editable = state.owner === 'me';
    const today = new Date();
    const from = toYMD(today);
    const toDate = new Date(today);
    toDate.setDate(toDate.getDate() + 6);
    const to = toYMD(toDate);

    const [tasksRes, logsRes] = await Promise.all([
      apiFetch(`tasks/list.php?owner=${state.owner}`),
      apiFetch(`tasks/logs.php?owner=${state.owner}&from=${from}&to=${to}&only_checked=0`),
    ]);

    const logsByDate = {};
    logsRes.logs.forEach(l => {
      if (!logsByDate[l.date]) logsByDate[l.date] = new Set();
      if (l.checked) logsByDate[l.date].add(l.task_id);
    });

    container.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = toYMD(d);
      const weekday = d.getDay();
      const dayTasks = tasksRes.tasks
        .filter(t => t.days.includes(weekday) && !((logsByDate[dateStr] || new Set()).has(t.id)))
        .sort((a, b) => (timeStrToMinutes(a.time) ?? 9999) - (timeStrToMinutes(b.time) ?? 9999));

      const section = document.createElement('div');
      section.className = 'day-section';
      const h3 = document.createElement('h3');
      h3.textContent = (i === 0 ? 'امروز — ' : '') + shortDateLabel(d);
      section.appendChild(h3);

      if (dayTasks.length === 0) {
        const hint = document.createElement('div');
        hint.className = 'empty-hint';
        hint.textContent = 'کاری برای این روز نیست';
        section.appendChild(hint);
      } else {
        const list = document.createElement('div');
        list.className = 'task-list';
        dayTasks.forEach(t => list.appendChild(renderTaskCard(t, false, dateStr, editable)));
        section.appendChild(list);
      }
      container.appendChild(section);
    }
  } catch (e) {
    container.innerHTML = '<div class="empty-hint">خطا در بارگذاری</div>';
  }
}

// ===================== تب تاریخچه (با انتخاب بازه‌ی تاریخ شمسی) =====================

// تبدیل تاریخ شمسی به میلادی (معکوسِ gregorianToJalali)
function jalaliToGregorian(jy, jm, jd) {
  let gy;
  if (jy > 979) { gy = 1600; jy -= 979; } else { gy = 621; }
  let days = (365 * jy) + parseInt(jy / 33) * 8 + parseInt(((jy % 33) + 3) / 4) + 78 + jd +
    ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * parseInt(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days--;
    gy += 100 * parseInt(days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * parseInt(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += parseInt((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const isLeapGreg = (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
  const monthDays = [0, 31, isLeapGreg ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  for (; gm <= 12 && gd > monthDays[gm]; gm++) {
    gd -= monthDays[gm];
  }
  return [gy, gm, gd];
}

function jalaliToDateStr(jy, jm, jd) {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

const fromYearSel = document.getElementById('historyFromYear');
const fromMonthSel = document.getElementById('historyFromMonth');
const fromDaySel = document.getElementById('historyFromDay');
const toYearSel = document.getElementById('historyToYear');
const toMonthSel = document.getElementById('historyToMonth');
const toDaySel = document.getElementById('historyToDay');

function fillJalaliSelects(yearSel, monthSel, daySel, centerYear) {
  yearSel.innerHTML = '';
  for (let y = centerYear + 1; y >= centerYear - 5; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  }
  monthSel.innerHTML = '';
  JALALI_MONTHS.forEach((name, idx) => {
    const opt = document.createElement('option');
    opt.value = idx + 1;
    opt.textContent = name;
    monthSel.appendChild(opt);
  });
  daySel.innerHTML = '';
  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    daySel.appendChild(opt);
  }
}

function setJalaliSelects(yearSel, monthSel, daySel, gDate) {
  const [jy, jm, jd] = gregorianToJalali(gDate.getFullYear(), gDate.getMonth() + 1, gDate.getDate());
  yearSel.value = jy;
  monthSel.value = jm;
  daySel.value = jd;
}

function readJalaliSelects(yearSel, monthSel, daySel) {
  return jalaliToDateStr(parseInt(yearSel.value), parseInt(monthSel.value), parseInt(daySel.value));
}

// مقداردهی اولیه: از ۳۰ روز پیش تا امروز
{
  const today = new Date();
  const [todayJy] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  fillJalaliSelects(fromYearSel, fromMonthSel, fromDaySel, todayJy);
  fillJalaliSelects(toYearSel, toMonthSel, toDaySel, todayJy);
  setJalaliSelects(fromYearSel, fromMonthSel, fromDaySel, monthAgo);
  setJalaliSelects(toYearSel, toMonthSel, toDaySel, today);
}

document.getElementById('historyReload').addEventListener('click', loadHistory);

async function loadHistory() {
  const container = document.getElementById('historyList');
  container.innerHTML = '<div class="empty-hint">در حال بارگذاری...</div>';
  try {
    const from = readJalaliSelects(fromYearSel, fromMonthSel, fromDaySel);
    const to = readJalaliSelects(toYearSel, toMonthSel, toDaySel);
    const editable = state.owner === 'me';

    // برای اینکه بشه رو کارهای تموم‌شده هم ویرایش/حذف زد، اطلاعات کامل خود
    // کارها رو هم می‌گیریم (نه فقط عنوانشون) تا مودال ویرایش پر بشه
    const [logsRes, tasksRes] = await Promise.all([
      apiFetch(`tasks/logs.php?owner=${state.owner}&from=${from}&to=${to}&only_checked=1`),
      apiFetch(`tasks/list.php?owner=${state.owner}`),
    ]);
    const taskMap = new Map(tasksRes.tasks.map(t => [t.id, t]));

    container.innerHTML = '';
    if (logsRes.logs.length === 0) {
      container.innerHTML = '<div class="empty-hint">در این بازه تاریخی، کاری تیک نخورده</div>';
      return;
    }
    logsRes.logs.forEach(l => {
      const [y, m, d] = l.date.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const fullTask = taskMap.get(l.task_id) || null;

      const card = document.createElement('div');
      card.className = 'task-card done';
      const check = document.createElement('div');
      check.className = 'task-check checked readonly';
      check.innerHTML = ICONS.check;
      const body = document.createElement('div');
      body.className = 'task-body';
      body.innerHTML = `<div class="task-title">${escapeHtml(l.title)}</div>
        <div class="task-desc">${shortDateLabel(dateObj)}</div>`;
      card.appendChild(check);
      card.appendChild(body);

      // ویرایش/حذف فقط وقتی امکان‌پذیره که خودمون صاحب کار باشیم و کار هنوز
      // حذف نشده باشه (یعنی تو لیست کارهای فعال پیدا بشه)
      if (editable && fullTask) {
        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.title = 'ویرایش کار';
        editBtn.innerHTML = ICONS.edit;
        editBtn.addEventListener('click', () => openTaskModal(fullTask));
        actions.appendChild(editBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn danger-hover';
        delBtn.title = 'حذف کار';
        delBtn.innerHTML = ICONS.trash;
        delBtn.addEventListener('click', () => deleteTaskFromHistory(fullTask.id));
        actions.appendChild(delBtn);

        card.appendChild(actions);
      }

      container.appendChild(card);
    });
  } catch (e) {
    container.innerHTML = '<div class="empty-hint">خطا در بارگذاری</div>';
  }
}

async function deleteTaskFromHistory(taskId) {
  if (!confirm('این کار به‌طور کامل حذف بشه؟ (از برنامه‌ی روزهای بعد هم حذف می‌شه)')) return;
  try {
    await apiFetch('tasks/delete.php', { method: 'POST', body: { id: taskId } });
    showToast('حذف شد');
    loadCurrentTab();
  } catch (err) {
    showToast('خطا در حذف');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===================== مودال افزودن/ویرایش تسک =====================
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
let editingTaskId = null;

document.getElementById('addTaskFab').addEventListener('click', () => openTaskModal(null));
document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);

document.querySelectorAll('.day-chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('selected'));
});
document.getElementById('allDaysBtn').addEventListener('click', () => {
  document.querySelectorAll('.day-chip').forEach(chip => chip.classList.add('selected'));
});

function openTaskModal(task) {
  document.getElementById('taskError').textContent = '';
  taskForm.reset();
  document.querySelectorAll('.day-chip').forEach(chip => chip.classList.remove('selected'));

  if (task) {
    editingTaskId = task.id;
    document.getElementById('modalTitle').textContent = 'ویرایش کار';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskStartTime').value = task.time || '';
    document.getElementById('taskEndTime').value = task.end_time || '';
    task.days.forEach(d => {
      const chip = document.querySelector(`.day-chip[data-day="${d}"]`);
      if (chip) chip.classList.add('selected');
    });
    document.getElementById('deleteTaskBtn').classList.remove('hidden');
  } else {
    editingTaskId = null;
    document.getElementById('modalTitle').textContent = 'کار جدید';
    document.getElementById('deleteTaskBtn').classList.add('hidden');
  }
  taskModal.classList.remove('hidden');
}

function closeTaskModal() {
  taskModal.classList.add('hidden');
  editingTaskId = null;
}

// وارد کردن راحت‌تر ساعت: هر چی تایپ بشه به فرمت HH:MM ۲۴ ساعته تبدیل می‌شه
function attachTimeAutoFormat(input) {
  input.addEventListener('input', () => {
    let digits = input.value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      input.value = digits.slice(0, 2) + ':' + digits.slice(2);
    } else {
      input.value = digits;
    }
  });
}
attachTimeAutoFormat(document.getElementById('taskStartTime'));
attachTimeAutoFormat(document.getElementById('taskEndTime'));

const TIME_24H_PATTERN = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('taskError');
  errEl.textContent = '';

  const days = Array.from(document.querySelectorAll('.day-chip.selected')).map(c => parseInt(c.dataset.day));
  if (days.length === 0) {
    errEl.textContent = 'حداقل یک روز را انتخاب کن';
    return;
  }
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) {
    errEl.textContent = 'عنوان الزامی است';
    return;
  }

  const startTimeVal = document.getElementById('taskStartTime').value.trim();
  const endTimeVal = document.getElementById('taskEndTime').value.trim();
  if (startTimeVal && !TIME_24H_PATTERN.test(startTimeVal)) {
    errEl.textContent = 'ساعت شروع باید به‌صورت ۲۴ ساعته باشه (مثلا 14:00)';
    return;
  }
  if (endTimeVal && !TIME_24H_PATTERN.test(endTimeVal)) {
    errEl.textContent = 'ساعت پایان باید به‌صورت ۲۴ ساعته باشه (مثلا 15:30)';
    return;
  }

  const payload = {
    title,
    description: document.getElementById('taskDescription').value.trim(),
    time: document.getElementById('taskStartTime').value,
    end_time: document.getElementById('taskEndTime').value,
    days,
  };

  try {
    if (editingTaskId) {
      payload.id = editingTaskId;
      await apiFetch('tasks/update.php', { method: 'POST', body: payload });
    } else {
      await apiFetch('tasks/create.php', { method: 'POST', body: payload });
    }
    closeTaskModal();
    showToast('ذخیره شد');
    loadCurrentTab();
  } catch (err) {
    errEl.textContent = 'خطا در ذخیره‌سازی';
  }
});

document.getElementById('deleteTaskBtn').addEventListener('click', async () => {
  if (!editingTaskId) return;
  if (!confirm('این کار حذف شود؟')) return;
  try {
    await apiFetch('tasks/delete.php', { method: 'POST', body: { id: editingTaskId } });
    closeTaskModal();
    showToast('حذف شد');
    loadCurrentTab();
  } catch (err) {
    showToast('خطا در حذف');
  }
});

// ===================== شروع برنامه =====================
// نسخه‌ی تک‌کاربره: بدون ورود، مستقیم وارد اپ می‌شیم
function init() {
  enterApp();
}

init();
