/* =====================================================
   نقشینو - منطق اپ (app.js)
   فهرست بخش‌ها:
     ۱. تنظیمات
     ۲. ابزارهای کمکی
     ۳. ذخیره‌سازی روی گوشی (localStorage)
     ۴. آیکون‌ها
     ۵. تصاویر
     ۶. تایمر
     ۷. صفحه‌ها
     ۸. مسیریابی
     ۹. شروع برنامه و به‌روزرسانی
   ===================================================== */
'use strict';

/* ---------- ۱. تنظیمات ---------- */

// مسیر فایل‌های داده (اگر اسم فایل‌ها را عوض کردی، اینجا را هم عوض کن)
const DATA_FILES = {
  exercises: './data/exercises.json',
  categories: './data/categories.json',
  info: './data/app-info.json'
};

// نام سطح‌ها
const LEVELS = { easy: 'آسان', medium: 'متوسط', hard: 'سخت' };

// کلیدهای ذخیره روی گوشی
const KEY_FAV = 'naqshino_favorites';
const KEY_DONE = 'naqshino_done';

// پسوندهایی که برای تصاویر امتحان می‌شود (اگر عکس webp نبود، jpg و png را هم امتحان می‌کند)
const IMAGE_EXTS = ['.webp', '.jpg', '.png'];

// محتوای برنامه بعد از بارگذاری اینجا قرار می‌گیرد
const DB = { exercises: [], categories: [], info: {} };

// منوی پایین
const NAV_ITEMS = [
  { key: 'home', href: '#/home', label: 'خانه', icon: 'home' },
  { key: 'exercises', href: '#/exercises', label: 'تمرین‌ها', icon: 'pencil' },
  { key: 'favorites', href: '#/favorites', label: 'موردعلاقه‌ها', icon: 'heart' },
  { key: 'progress', href: '#/progress', label: 'پیشرفت من', icon: 'trophy' }
];

/* ---------- ۲. ابزارهای کمکی ---------- */

// امن کردن متن قبل از گذاشتن داخل HTML
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// تبدیل عدد انگلیسی به فارسی
function toFa(n) {
  return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
}

// نمایش زمان به شکل ۱۰:۰۰
function fmtTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return toFa(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'));
}

// یکسان‌سازی حروف فارسی برای جستجو
function normalize(text) {
  return String(text || '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/‌/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getExercise(id) {
  return DB.exercises.find(function (x) { return x.id === id; });
}

function getCategoryTitle(id) {
  const c = DB.categories.find(function (x) { return x.id === id; });
  return c ? c.title : '';
}

/* ---------- ۳. ذخیره‌سازی روی گوشی ---------- */
// نکته: این اطلاعات فقط روی همین گوشی می‌ماند و به گوشی دیگر منتقل نمی‌شود.

function loadStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* اگر ذخیره ممکن نبود (مثلاً حالت خصوصی مرورگر)، برنامه بدون ذخیره کار می‌کند */
  }
}

let favorites = new Set(Array.isArray(loadStored(KEY_FAV, [])) ? loadStored(KEY_FAV, []) : []);
let doneMap = (function () {
  const v = loadStored(KEY_DONE, {});
  if (Array.isArray(v)) {
    const o = {};
    v.forEach(function (id) { o[id] = 1; });
    return o;
  }
  return v && typeof v === 'object' ? v : {};
})();

function isFav(id) { return favorites.has(id); }
function isDone(id) { return Object.prototype.hasOwnProperty.call(doneMap, id); }

function toggleFav(id) {
  if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
  saveStored(KEY_FAV, Array.from(favorites));
  return favorites.has(id);
}

function toggleDone(id) {
  if (isDone(id)) delete doneMap[id]; else doneMap[id] = new Date().toISOString().slice(0, 10);
  saveStored(KEY_DONE, doneMap);
  return isDone(id);
}

// تعداد تمرین‌های انجام‌شده (فقط تمرین‌هایی که هنوز در فایل داده هستند)
function doneExercises() {
  return DB.exercises.filter(function (x) { return isDone(x.id); });
}

/* ---------- ۴. آیکون‌ها ---------- */
// همه‌ی آیکون‌ها خطی و گرد با ضخامت یکسان‌اند. بخش رنگی هر آیکون کلاس "d" دارد.

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path class="d" d="M10 20v-5.5h4V20"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1z"/><path class="d" d="M14.5 6.5l3 3"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/><path class="d" d="M12 13v4"/><path d="M8.5 20h7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path class="d" d="M12 11v5"/><path class="d" d="M12 7.8v.2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path class="d" d="M16 16l4 4"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path class="d" d="M12 7v5l3 2"/>',
  back: '<path d="M9 5l7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  paw: '<circle cx="7" cy="10" r="1.8"/><circle cx="12" cy="7" r="1.8"/><circle cx="17" cy="10" r="1.8"/><path class="d" d="M8.5 17c0-2.5 1.7-4 3.5-4s3.5 1.5 3.5 4c0 1.6-1.5 2-3.5 2s-3.5-.4-3.5-2z"/>',
  cup: '<path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8z"/><path class="d" d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/>',
  shade: '<circle cx="12" cy="12" r="8"/><path class="d" d="M12 4a8 8 0 0 1 0 16z"/>',
  cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path class="d" d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>',
  face: '<circle cx="12" cy="9" r="3.5"/><path class="d" d="M5.5 20a6.5 6.5 0 0 1 13 0"/>'
};

function icon(name, extraClass) {
  return '<svg class="ic ' + (extraClass || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (ICONS[name] || '') + '</svg>';
}

/* ---------- ۵. تصاویر ---------- */

// ساخت تگ تصویر (با بارگذاری تنبل: تصویر فقط وقتی نزدیک دیده شدن است بارگذاری می‌شود)
function pic(src, alt) {
  if (!src) return emptyPic();
  return '<img class="pic" src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async" data-try="0">';
}

// جای خالی دوستانه وقتی عکس هنوز اضافه نشده یا اینترنت قطع است
function emptyPic() {
  return '<div class="pic-empty">' + icon('pencil') + '<span>تصویر به‌زودی اضافه می‌شود</span></div>';
}

// اگر تصویر باز نشد: اول پسوندهای دیگر را امتحان کن، بعد جای خالی نشان بده
document.addEventListener('error', function (e) {
  const el = e.target;
  if (!(el instanceof HTMLImageElement) || !el.classList.contains('pic')) return;

  const attempt = (parseInt(el.dataset.try, 10) || 0) + 1;
  if (attempt < IMAGE_EXTS.length) {
    el.dataset.try = String(attempt);
    const base = el.getAttribute('src').replace(/\.(webp|jpe?g|png)$/i, '');
    el.setAttribute('src', base + IMAGE_EXTS[attempt]);
  } else {
    const holder = document.createElement('div');
    holder.innerHTML = emptyPic();
    el.replaceWith(holder.firstChild);
  }
}, true);

/* ---------- ۶. تایمر ---------- */
// تایمر فقط وقتی اپ باز است کار می‌کند (اپ بدون سرور نمی‌تواند اعلان بفرستد).

const RING_LENGTH = 326.7;      // محیط دایره‌ی تایمر (نباید عوض شود)
let activeTimers = [];

function stopAllTimers() {
  activeTimers.forEach(function (t) { t.destroy(); });
  activeTimers = [];
}

// کد HTML تایمر. adjustable=true یعنی دکمه‌های ±۵ دقیقه هم باشد.
function timerHTML(title, seconds, adjustable) {
  return '<section class="card timer-card timer" data-seconds="' + seconds + '">' +
    '<div class="ring">' +
      '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-bg" cx="60" cy="60" r="52"/>' +
      '<circle class="ring-fg" cx="60" cy="60" r="52"/></svg>' +
      '<div class="ring-time" aria-live="off">' + fmtTime(seconds) + '</div>' +
    '</div>' +
    '<div class="timer-side">' +
      '<div class="title">' + esc(title) + '</div>' +
      '<div class="timer-msg" aria-live="polite"></div>' +
      '<div class="timer-btns">' +
        (adjustable ? '<button class="btn small ghost" type="button" data-t="minus" aria-label="۵ دقیقه کمتر">−۵</button>' +
                      '<button class="btn small ghost" type="button" data-t="plus" aria-label="۵ دقیقه بیشتر">+۵</button>' : '') +
        '<button class="btn small primary" type="button" data-t="toggle">شروع تایمر</button>' +
        '<button class="btn small ghost" type="button" data-t="reset" hidden>از نو</button>' +
      '</div>' +
    '</div></section>';
}

// فعال کردن تایمر روی کد HTML بالا
function bindTimer(root) {
  if (!root) return;
  const ring = root.querySelector('.ring-fg');
  const timeEl = root.querySelector('.ring-time');
  const msgEl = root.querySelector('.timer-msg');
  const toggleBtn = root.querySelector('[data-t="toggle"]');
  const resetBtn = root.querySelector('[data-t="reset"]');
  const minusBtn = root.querySelector('[data-t="minus"]');
  const plusBtn = root.querySelector('[data-t="plus"]');

  let total = parseInt(root.dataset.seconds, 10) || 600;
  let remaining = total;
  let endAt = 0;
  let iv = null;

  function draw() {
    timeEl.textContent = fmtTime(remaining);
    const ratio = total > 0 ? remaining / total : 0;
    ring.style.strokeDashoffset = String(RING_LENGTH * (1 - ratio));
  }

  function setAdjustEnabled(enabled) {
    if (minusBtn) minusBtn.disabled = !enabled;
    if (plusBtn) plusBtn.disabled = !enabled;
  }

  function tick() {
    remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
    draw();
    if (remaining <= 0) finish();
  }

  function start() {
    root.classList.remove('finished');
    msgEl.textContent = '';
    if (remaining <= 0) remaining = total;
    endAt = Date.now() + remaining * 1000;
    iv = setInterval(tick, 500);
    toggleBtn.textContent = 'توقف';
    resetBtn.hidden = false;
    setAdjustEnabled(false);
    draw();
  }

  function pause() {
    clearInterval(iv);
    iv = null;
    tick();
    toggleBtn.textContent = 'ادامه';
  }

  function reset() {
    clearInterval(iv);
    iv = null;
    remaining = total;
    root.classList.remove('finished');
    msgEl.textContent = '';
    toggleBtn.textContent = 'شروع تایمر';
    resetBtn.hidden = true;
    setAdjustEnabled(true);
    draw();
  }

  function finish() {
    clearInterval(iv);
    iv = null;
    root.classList.add('finished');
    msgEl.textContent = 'آفرین! وقتت تموم شد.';
    toggleBtn.textContent = 'شروع دوباره';
    remaining = 0;
    draw();
    beep();
    if (navigator.vibrate) { try { navigator.vibrate(300); } catch (e) { /* مهم نیست */ } }
  }

  toggleBtn.addEventListener('click', function () {
    if (iv) pause(); else start();
  });
  resetBtn.addEventListener('click', reset);

  function adjust(deltaSeconds) {
    if (iv) return;
    total = Math.min(3600, Math.max(300, total + deltaSeconds));
    remaining = total;
    root.classList.remove('finished');
    msgEl.textContent = '';
    draw();
  }
  if (minusBtn) minusBtn.addEventListener('click', function () { adjust(-300); });
  if (plusBtn) plusBtn.addEventListener('click', function () { adjust(300); });

  activeTimers.push({ destroy: function () { clearInterval(iv); iv = null; } });
  draw();
}

// یک صدای کوتاه برای پایان تایمر (بدون فایل صوتی)
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.75);
  } catch (e) {
    /* اگر صدا ممکن نبود، فقط پیام نشان داده می‌شود */
  }
}

/* ---------- ۷. صفحه‌ها ---------- */

const view = document.getElementById('view');
const navEl = document.getElementById('nav');

// نمایش یک صفحه با انیمیشن نرم
function show(html, options) {
  const keepScroll = options && options.keepScroll;
  stopAllTimers();
  view.innerHTML = html;
  view.classList.remove('enter');
  void view.offsetWidth;                      // برای اینکه انیمیشن دوباره اجرا شود
  view.classList.add('enter');
  if (!keepScroll) window.scrollTo(0, 0);
}

function setActiveNav(key) {
  navEl.querySelectorAll('.nav-item').forEach(function (a) {
    const on = a.dataset.key === key;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

function renderNav() {
  navEl.innerHTML = '<div class="nav-inner">' + NAV_ITEMS.map(function (n) {
    return '<a class="nav-item" data-key="' + n.key + '" href="' + n.href + '">' + icon(n.icon) + '<span>' + n.label + '</span></a>';
  }).join('') + '</div>';
}

// کارت یک تمرین (برای فهرست‌ها)
function exerciseCard(x, index, options) {
  const withRemove = options && options.remove;
  return '<div class="ex-wrap reveal' + (withRemove ? ' has-remove' : '') + '" style="--i:' + index + '">' +
    '<a class="card ex-card" href="#/exercise/' + esc(x.id) + '">' +
      '<div class="thumb">' + pic(x.finalImage, x.title) + '</div>' +
      '<div class="ex-info"><h3>' + esc(x.title) + '</h3>' +
        '<div class="meta">' +
          '<span class="badge lvl-' + esc(x.level) + '">' + esc(LEVELS[x.level] || '') + '</span>' +
          '<span class="meta-item">' + icon('clock') + toFa(x.durationMin) + ' دقیقه</span>' +
          (x.isChallenge ? '<span class="badge chal">چالش</span>' : '') +
          (isDone(x.id) ? '<span class="badge done">' + icon('check') + 'انجام شد</span>' : '') +
        '</div></div>' +
    '</a>' +
    (withRemove ? '<button class="icon-btn remove" type="button" data-action="unfav" data-id="' + esc(x.id) + '" aria-label="حذف از موردعلاقه‌ها">' + icon('close') + '</button>' : '') +
  '</div>';
}

// تمرین روز: هر روز یک تمرین، بر اساس تاریخ (بدون نیاز به سرور)
function dailyExercise() {
  const list = DB.exercises.filter(function (x) { return !x.isChallenge; });
  if (!list.length) return null;
  const d = new Date();
  const dayNumber = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return list[dayNumber % list.length];
}

/* --- صفحه‌ی اصلی --- */
function renderHome() {
  const info = DB.info;
  const daily = dailyExercise();
  const challenge = DB.exercises.find(function (x) { return x.isChallenge; });
  const homeCats = DB.categories.filter(function (c) { return c.showOnHome; });

  let html = '';

  // سربرگ
  html += '<header class="top reveal" style="--i:0">' +
    '<div class="brand"><img src="./icons/icon.svg" alt="" width="44" height="44"><span>' + esc(info.name || 'نقشینو') + '</span></div>' +
    '<a class="icon-btn" href="#/about" aria-label="درباره‌ی اپ">' + icon('info') + '</a>' +
  '</header>';

  // خوشامدگویی
  html += '<section class="hello reveal" style="--i:1"><h1>' + esc(info.greetingTitle || '') + '</h1><p>' + esc(info.greetingText || '') + '</p></section>';

  // تمرین روز
  if (daily) {
    html += '<section class="card daily reveal" style="--i:2">' +
      '<div class="tag">تمرین روز</div>' +
      '<div class="shot">' + pic(daily.finalImage, daily.title) + '</div>' +
      '<h2>' + esc(daily.title) + '</h2>' +
      '<p>' + esc(daily.description) + '</p>' +
      '<div class="meta"><span class="badge lvl-' + esc(daily.level) + '">' + esc(LEVELS[daily.level] || '') + '</span>' +
        '<span class="meta-item">' + icon('clock') + toFa(daily.durationMin) + ' دقیقه</span></div>' +
      '<a class="btn dark block" href="#/exercise/' + esc(daily.id) + '">شروع تمرین</a>' +
    '</section>';
  }

  // تایمر ۱۰ دقیقه‌ای
  html += '<div class="reveal" style="--i:3">' + timerHTML(info.timerTitle || '۱۰ دقیقه برای هنر', 600, false) + '</div>';

  // دسته‌بندی سریع
  if (homeCats.length) {
    html += '<section class="reveal" style="--i:4"><h2 class="section-title">موضوع‌ها</h2><div class="cats" style="margin-top:10px">' +
      homeCats.map(function (c) {
        return '<a class="cat" href="#/exercises?cat=' + esc(c.id) + '">' + icon(c.icon || 'pencil') + '<span>' + esc(c.title) + '</span></a>';
      }).join('') + '</div></section>';
  }

  // چالش‌های پیشرفته
  html += '<section class="card challenge reveal" style="--i:5">' +
    '<h2>' + esc(info.challengeTitle || 'چالش‌های پیشرفته') + '</h2>' +
    (challenge ? '<div class="shot">' + pic(challenge.finalImage, challenge.title) + '</div>' : '') +
    '<a class="btn dark block" href="#/challenges">' + esc(info.challengeButton || 'مشاهده چالش‌ها') + '</a>' +
  '</section>';

  show(html);
  setActiveNav('home');
  bindTimer(view.querySelector('.timer'));
}

/* --- فهرست تمرین‌ها --- */
let listState = { cat: 'all', level: 'all', q: '' };

function filteredExercises() {
  const q = normalize(listState.q);
  return DB.exercises.filter(function (x) {
    if (listState.cat !== 'all' && x.category !== listState.cat) return false;
    if (listState.level !== 'all' && x.level !== listState.level) return false;
    if (q) {
      const hay = normalize(x.title + ' ' + x.description + ' ' + getCategoryTitle(x.category));
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function renderResults() {
  const box = document.getElementById('results');
  if (!box) return;
  const items = filteredExercises();
  if (!items.length) {
    box.innerHTML = '<div class="empty">' + icon('search') + '<p>تمرینی با این شرایط پیدا نشد.</p>' +
      '<p class="muted">جستجو یا فیلترها را کمی تغییر بده.</p></div>';
    return;
  }
  box.innerHTML = '<div class="list">' + items.map(function (x, i) { return exerciseCard(x, Math.min(i, 8)); }).join('') + '</div>';
}

function renderExercises(params) {
  // اگر از صفحه‌ی اصلی با موضوع آمده باشیم، همان موضوع انتخاب می‌شود
  if (params.has('cat') || params.has('level')) {
    listState = { cat: params.get('cat') || 'all', level: params.get('level') || 'all', q: '' };
  }

  const catChips = [{ id: 'all', title: 'همه' }].concat(DB.categories).map(function (c) {
    return '<button class="chip' + (listState.cat === c.id ? ' on' : '') + '" type="button" data-cat="' + esc(c.id) + '">' + esc(c.title) + '</button>';
  }).join('');

  const levelChips = [['all', 'همه'], ['easy', 'آسان'], ['medium', 'متوسط'], ['hard', 'سخت']].map(function (l) {
    return '<button class="chip' + (listState.level === l[0] ? ' on' : '') + '" type="button" data-level="' + l[0] + '">' + l[1] + '</button>';
  }).join('');

  const html =
    '<h1 class="section-title reveal" style="--i:0">تمرین‌ها</h1>' +
    '<div class="search reveal" style="--i:1">' + icon('search') +
      '<input id="search" type="search" placeholder="جستجوی تمرین…" value="' + esc(listState.q) + '" autocomplete="off" aria-label="جستجوی تمرین"></div>' +
    '<div class="reveal" style="--i:2"><div class="filter-label">موضوع</div><div class="chips" id="cat-chips">' + catChips + '</div>' +
      '<div class="filter-label">سطح</div><div class="chips" id="level-chips">' + levelChips + '</div></div>' +
    '<a class="card challenge reveal" style="--i:3;display:flex;align-items:center;justify-content:space-between;gap:10px" href="#/challenges">' +
      '<span style="font-weight:700">چالش‌های پیشرفته</span>' + icon('back') + '</a>' +
    '<div id="results"></div>';

  show(html);
  setActiveNav('exercises');
  renderResults();

  document.getElementById('search').addEventListener('input', function (e) {
    listState.q = e.target.value;
    renderResults();
  });

  document.getElementById('cat-chips').addEventListener('click', function (e) {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    listState.cat = b.dataset.cat;
    this.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); });
    renderResults();
  });

  document.getElementById('level-chips').addEventListener('click', function (e) {
    const b = e.target.closest('[data-level]');
    if (!b) return;
    listState.level = b.dataset.level;
    this.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); });
    renderResults();
  });
}

/* --- چالش‌های پیشرفته --- */
function renderChallenges() {
  const items = DB.exercises.filter(function (x) { return x.isChallenge; });
  const html =
    '<div class="detail-top reveal" style="--i:0"><button class="icon-btn" type="button" data-action="back" aria-label="بازگشت">' + icon('back') + '</button>' +
    '<h1>چالش‌های پیشرفته</h1></div>' +
    '<p class="muted reveal" style="--i:1">نقاشی‌های سخت‌تر برای کسانی که مهارت بیشتری دارند. وقت بیشتری برایشان در نظر بگیر.</p>' +
    (items.length
      ? '<div class="list">' + items.map(function (x, i) { return exerciseCard(x, i + 2); }).join('') + '</div>'
      : '<div class="empty">' + icon('trophy') + '<p>هنوز چالشی اضافه نشده است.</p></div>');
  show(html);
  setActiveNav('exercises');
}

/* --- جزئیات تمرین --- */
function renderExercise(id) {
  const x = getExercise(id);
  if (!x) {
    show('<div class="empty">' + icon('search') + '<p>این تمرین پیدا نشد.</p>' +
      '<a class="btn primary" href="#/exercises">رفتن به تمرین‌ها</a></div>');
    setActiveNav('exercises');
    return;
  }

  const steps = (x.steps || []).map(function (s, i) {
    return '<div class="step reveal" style="--i:' + Math.min(i + 3, 9) + '">' +
      '<div class="step-no" aria-hidden="true">' + toFa(i + 1) + '</div>' +
      '<div class="step-body"><div class="shot">' + pic(s.image, 'مرحله‌ی ' + toFa(i + 1) + ': ' + x.title) + '</div>' +
      '<p>' + esc(s.text) + '</p></div></div>';
  }).join('');

  const fav = isFav(x.id);
  const done = isDone(x.id);

  const html =
    '<div class="detail-top reveal" style="--i:0"><button class="icon-btn" type="button" data-action="back" aria-label="بازگشت">' + icon('back') + '</button>' +
    '<h1>' + esc(x.title) + '</h1></div>' +
    '<div class="meta reveal" style="--i:1">' +
      '<span class="badge lvl-' + esc(x.level) + '">' + esc(LEVELS[x.level] || '') + '</span>' +
      '<span class="meta-item">' + icon('clock') + toFa(x.durationMin) + ' دقیقه</span>' +
      (x.isChallenge ? '<span class="badge chal">چالش</span>' : '') +
      (getCategoryTitle(x.category) ? '<span class="badge">' + esc(getCategoryTitle(x.category)) + '</span>' : '') +
    '</div>' +
    '<div class="shot reveal" style="--i:2">' + pic(x.finalImage, x.title) + '</div>' +
    '<p class="reveal" style="--i:2">' + esc(x.description) + '</p>' +
    '<div class="actions reveal" style="--i:3">' +
      '<button class="btn ghost fav' + (fav ? ' on' : '') + '" type="button" data-action="toggle-fav" data-id="' + esc(x.id) + '" aria-pressed="' + fav + '">' +
        icon('heart', fav ? 'on' : '') + '<span>' + (fav ? 'ذخیره شد' : 'موردعلاقه') + '</span></button>' +
      '<button class="btn donebtn' + (done ? ' is-done' : '') + '" type="button" data-action="toggle-done" data-id="' + esc(x.id) + '" aria-pressed="' + done + '">' +
        icon('check') + '<span>' + (done ? 'انجام شد' : 'انجام شد؟') + '</span></button>' +
    '</div>' +
    timerHTML('تایمر تمرین', (x.durationMin || 10) * 60, true) +
    '<h2 class="section-title">مرحله‌ها</h2>' +
    '<div class="steps">' + steps + '</div>';

  show(html);
  setActiveNav('exercises');
  bindTimer(view.querySelector('.timer'));
}

/* --- موردعلاقه‌ها --- */
function renderFavorites(keepScroll) {
  const items = DB.exercises.filter(function (x) { return isFav(x.id); });
  const html =
    '<h1 class="section-title reveal" style="--i:0">موردعلاقه‌ها</h1>' +
    (items.length
      ? '<div class="list">' + items.map(function (x, i) { return exerciseCard(x, i + 1, { remove: true }); }).join('') + '</div>'
      : '<div class="empty">' + icon('heart') + '<p>هنوز تمرینی را ذخیره نکرده‌ای.</p>' +
        '<p class="muted">توی صفحه‌ی هر تمرین، روی «موردعلاقه» بزن تا اینجا بیاید.</p>' +
        '<a class="btn primary" href="#/exercises">دیدن تمرین‌ها</a></div>');
  show(html, { keepScroll: keepScroll });
  setActiveNav('favorites');
}

/* --- پیشرفت من --- */
function renderProgress() {
  const doneList = doneExercises();
  const total = DB.exercises.length;
  const count = doneList.length;
  const percent = total ? Math.round(count / total * 100) : 0;

  // پیام انگیزشی مناسب با تعداد تمرین‌های انجام‌شده
  let message = '';
  (DB.info.motivation || []).forEach(function (m) { if (count >= m.min) message = m.text; });
  if (total && count >= total && DB.info.motivation && DB.info.motivation.length) {
    message = DB.info.motivation[DB.info.motivation.length - 1].text;
  }

  const html =
    '<h1 class="section-title reveal" style="--i:0">پیشرفت من</h1>' +
    '<section class="card progress-card reveal" style="--i:1">' + icon('trophy', 'big') +
      '<div class="count">' + toFa(count) + ' از ' + toFa(total) + '</div>' +
      '<div class="muted">تمرین انجام‌شده</div>' +
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + percent + '"><i id="bar-fill"></i></div>' +
      '<div class="muted">' + toFa(percent) + '٪</div>' +
    '</section>' +
    (message ? '<div class="motivate reveal" style="--i:2">' + esc(message) + '</div>' : '') +
    (count
      ? '<h2 class="section-title">تمرین‌های انجام‌شده</h2><div class="list">' + doneList.map(function (x, i) { return exerciseCard(x, i + 3); }).join('') + '</div>'
      : '<div class="empty">' + icon('pencil') + '<p>هنوز تمرینی را تمام نکرده‌ای.</p>' +
        '<a class="btn primary" href="#/exercises">شروع اولین تمرین</a></div>');

  show(html);
  setActiveNav('progress');

  // پر شدن تدریجی نوار پیشرفت
  const fill = document.getElementById('bar-fill');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { if (fill) fill.style.width = percent + '%'; });
  });
}

/* --- درباره‌ی اپ --- */
function renderAbout() {
  const info = DB.info;
  const about = info.about || {};
  const list = function (arr) {
    return '<ul class="about-list">' + (arr || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  };
  const html =
    '<div class="detail-top reveal" style="--i:0"><button class="icon-btn" type="button" data-action="back" aria-label="بازگشت">' + icon('back') + '</button>' +
    '<h1>درباره‌ی اپ</h1></div>' +
    '<section class="card about reveal" style="--i:1">' +
      '<img class="logo" src="./icons/icon.svg" alt="">' +
      '<h1>' + esc(info.name || 'نقشینو') + '</h1>' +
      '<p class="slogan">' + esc(info.slogan || '') + '</p>' +
      '<p>' + esc(about.intro || '') + '</p>' +
    '</section>' +
    '<section class="card reveal" style="--i:2"><h2 class="section-title">چطور استفاده کنم؟</h2>' + list(about.howTo) + '</section>' +
    '<section class="card reveal" style="--i:3"><h2 class="section-title">قابلیت‌ها</h2>' + list(about.features) + '</section>' +
    (about.note ? '<p class="muted reveal" style="--i:4">' + esc(about.note) + '</p>' : '');
  show(html);
  setActiveNav('');
}

/* --- پیام خطا (مثلاً اینترنت قطع است و محتوا هنوز ذخیره نشده) --- */
function renderError() {
  const isFile = location.protocol === 'file:';
  show('<div class="empty">' + icon('info') +
    '<p>' + (isFile
      ? 'این فایل را نباید با دو بار کلیک باز کرد. اپ را از لینک منتشرشده‌اش باز کن.'
      : 'نتوانستیم محتوا را بارگذاری کنیم. اینترنت را بررسی کن و دوباره امتحان کن.') + '</p>' +
    '<button class="btn primary" type="button" data-action="retry">امتحان دوباره</button></div>');
  setActiveNav('');
}

/* ---------- ۸. مسیریابی ---------- */
// آدرس‌ها به شکل #/home یا #/exercise/ex-001 هستند.

function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const split = hash.split('?');
  const parts = split[0].split('/').filter(Boolean);
  const params = new URLSearchParams(split[1] || '');

  switch (parts[0]) {
    case 'exercises': renderExercises(params); break;
    case 'exercise': renderExercise(decodeURIComponent(parts[1] || '')); break;
    case 'challenges': renderChallenges(); break;
    case 'favorites': renderFavorites(); break;
    case 'progress': renderProgress(); break;
    case 'about': renderAbout(); break;
    default: renderHome();
  }
  document.title = (DB.info.name || 'نقشینو');
}

/* --- دکمه‌های داخل صفحه‌ها --- */

// نمایش جشن کوچک (تیک و ستاره) هنگام تکمیل تمرین
function celebrate() {
  const old = document.querySelector('.celebrate');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="badge-big">' + icon('check') + '</div>' +
    ['s1', 's2', 's3', 's4'].map(function (c) { return icon('star', 'star ' + c); }).join('');
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 1700);
}

document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'back') {
    if (history.length > 1) history.back(); else location.hash = '#/home';
  }

  if (action === 'toggle-fav') {
    const on = toggleFav(id);
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('.ic').classList.toggle('on', on);
    btn.querySelector('span').textContent = on ? 'ذخیره شد' : 'موردعلاقه';
  }

  if (action === 'toggle-done') {
    const on = toggleDone(id);
    btn.classList.toggle('is-done', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('span').textContent = on ? 'انجام شد' : 'انجام شد؟';
    if (on) celebrate();
  }

  if (action === 'unfav') {
    toggleFav(id);
    renderFavorites(true);
  }

  if (action === 'retry') start();

  if (action === 'update-app') applyUpdate();
});

/* ---------- ۹. شروع برنامه و به‌روزرسانی ---------- */

function fetchJSON(url) {
  return fetch(url, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function loadData() {
  return Promise.all([
    fetchJSON(DATA_FILES.exercises),
    fetchJSON(DATA_FILES.categories),
    fetchJSON(DATA_FILES.info)
  ]).then(function (res) {
    DB.exercises = Array.isArray(res[0]) ? res[0] : [];
    DB.categories = Array.isArray(res[1]) ? res[1] : [];
    DB.info = res[2] || {};
  });
}

let started = false;
function start() {
  view.innerHTML = '<p class="loading">در حال بارگذاری…</p>';
  loadData().then(function () {
    renderNav();
    if (!started) {
      started = true;
      window.addEventListener('hashchange', route);
    }
    route();
  }).catch(function () {
    renderNav();
    renderError();
  });
}

/* --- به‌روزرسانی برای کسانی که اپ را نصب کرده‌اند --- */
let waitingWorker = null;
let updateRequested = false;

function showUpdateBar(worker) {
  waitingWorker = worker;
  const bar = document.getElementById('update-bar');
  if (bar) bar.hidden = false;
}

function applyUpdate() {
  updateRequested = true;
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  } else {
    location.reload();
  }
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;

  navigator.serviceWorker.register('./service-worker.js').then(function (reg) {
    // اگر نسخه‌ی جدید از قبل آماده بود
    if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar(reg.waiting);

    // وقتی نسخه‌ی جدید پیدا شد
    reg.addEventListener('updatefound', function () {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar(worker);
      });
    });

    // هر بار که اپ دوباره جلوی چشم کاربر آمد، دنبال نسخه‌ی جدید بگرد
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') reg.update().catch(function () {});
    });
  }).catch(function () {
    /* اگر ثبت نشد، اپ بدون حالت آفلاین کار می‌کند */
  });

  // فقط وقتی کاربر خودش «به‌روزرسانی» را زد، صفحه دوباره بارگذاری می‌شود
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (updateRequested) location.reload();
  });
}

setupServiceWorker();
start();
