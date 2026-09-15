// ===================== لایه‌ی داده‌ی محلی (نسخه‌ی نمونه‌کار) =====================
// این نسخه هیچ بک‌اند واقعی نداره. همه‌چیز توی sessionStorage خودِ تب ذخیره می‌شه،
// یعنی با بستن تب (یا مرورگر) همه‌ی داده‌ها پاک می‌شن و دفعه‌ی بعد از اول شروع می‌شه.
// فقط برای نمایش (دمو) هست، نه استفاده‌ی واقعی.

const DEMO_STORE_KEY = 'todo_demo_store';

function demoNowISO() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// وقتی برای اولین بار توی این تب باز می‌شه، هیچ تسکی از قبل نیست؛
// کاربر خودش باید کارها رو اضافه کنه
function demoSeedTasks() {
  return [];
}

function demoDefaultStore() {
  return {
    nextTaskId: 1,
    tasks: demoSeedTasks(),
    logs: [], // { task_id, date, checked, checked_at }
  };
}

function demoLoadStore() {
  try {
    const raw = sessionStorage.getItem(DEMO_STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* داده خراب بود، از نو می‌سازیم */ }
  const fresh = demoDefaultStore();
  demoSaveStore(fresh);
  return fresh;
}

function demoSaveStore(store) {
  sessionStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
}

let demoStore = demoLoadStore();

function demoDelay(result) {
  // یه تاخیر کوچیک شبیه‌سازی می‌کنیم تا حس درخواست به سرور رو حفظ کنه
  return new Promise((resolve) => setTimeout(() => resolve(result), 120));
}

// جایگزین محلی apiFetch: همون امضا و همون شکل خروجی/خطا رو داره
// اما هیچ درخواست شبکه‌ای نمی‌زنه؛ فقط با demoStore کار می‌کنه
async function demoApiFetch(path, { method = 'GET', body = null } = {}) {
  const [route, queryStr] = path.split('?');
  const params = new URLSearchParams(queryStr || '');

  if (route === 'tasks/list.php') {
    const owner = params.get('owner') || 'me';
    if (owner === 'partner') return demoDelay({ tasks: [] });
    return demoDelay({ tasks: demoStore.tasks.map((t) => ({ ...t })) });
  }

  if (route === 'tasks/logs.php') {
    const owner = params.get('owner') || 'me';
    if (owner === 'partner') return demoDelay({ logs: [] });
    const from = params.get('from');
    const to = params.get('to');
    const onlyChecked = params.get('only_checked') !== '0';
    let logs = demoStore.logs.filter((l) => (!from || l.date >= from) && (!to || l.date <= to));
    if (onlyChecked) logs = logs.filter((l) => l.checked);
    logs = logs.map((l) => {
      const t = demoStore.tasks.find((tt) => tt.id === l.task_id);
      return { ...l, title: t ? t.title : '(حذف‌شده)' };
    });
    return demoDelay({ logs });
  }

  if (route === 'tasks/toggle.php') {
    const { id, date, checked } = body;
    let log = demoStore.logs.find((l) => l.task_id === id && l.date === date);
    if (!log) {
      log = { task_id: id, date, checked: !!checked, checked_at: demoNowISO() };
      demoStore.logs.push(log);
    } else {
      log.checked = !!checked;
      log.checked_at = demoNowISO();
    }
    demoSaveStore(demoStore);
    return demoDelay({ ok: true });
  }

  if (route === 'tasks/create.php') {
    const task = {
      id: demoStore.nextTaskId++,
      title: body.title,
      description: body.description || '',
      time: body.time || '',
      end_time: body.end_time || '',
      days: body.days || [],
    };
    demoStore.tasks.push(task);
    demoSaveStore(demoStore);
    return demoDelay({ task });
  }

  if (route === 'tasks/update.php') {
    const t = demoStore.tasks.find((tt) => tt.id === body.id);
    if (!t) return Promise.reject(new Error('not_found'));
    t.title = body.title;
    t.description = body.description || '';
    t.time = body.time || '';
    t.end_time = body.end_time || '';
    t.days = body.days || [];
    demoSaveStore(demoStore);
    return demoDelay({ task: t });
  }

  if (route === 'tasks/delete.php') {
    demoStore.tasks = demoStore.tasks.filter((t) => t.id !== body.id);
    demoStore.logs = demoStore.logs.filter((l) => l.task_id !== body.id);
    demoSaveStore(demoStore);
    return demoDelay({ ok: true });
  }

  return demoDelay({});
}
