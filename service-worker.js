/* =====================================================
   نقشینو - service-worker.js
   کار این فایل: آفلاین کار کردن اپ و رسیدن تغییرات به کاربران نصب‌شده.

   ⚠️ مهم‌ترین نکته:
   هر بار که هر فایلی از پروژه را عوض کردی (متن، تمرین جدید، رنگ و...)،
   عدد CACHE_VERSION را یکی بالا ببر (مثلاً v1 را بکن v2).
   بدون این کار، کاربران نسخه‌ی جدید را نمی‌گیرند.
   ===================================================== */

const CACHE_VERSION = "v1";   // ← هر بار تغییر دادی، این را یک عدد بالا ببر
const CACHE_NAME = "naqshino-" + CACHE_VERSION;

// فایل‌های اصلی که حتماً باید آفلاین هم باشند (همه‌ی مسیرها نسبی‌اند)
const CORE_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./data/exercises.json",
  "./data/categories.json",
  "./data/app-info.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

/* فایل‌های فونت:
   وقتی فونتی در پوشه‌ی fonts گذاشتی، اسم فایلش را اینجا هم اضافه کن، مثلاً:
   "./fonts/Vazirmatn-Regular.woff2",
   این فایل‌ها اختیاری‌اند؛ اگر وجود نداشته باشند مشکلی پیش نمی‌آید.
   (فایل‌های داخل پوشه‌ی fonts در هر صورت بعد از اولین بار دیده شدن هم ذخیره می‌شوند.) */
const FONT_FILES = [
  // "./fonts/Vazirmatn-Regular.woff2",
  // "./fonts/Vazirmatn-Medium.woff2",
  // "./fonts/Vazirmatn-Bold.woff2"
];

/* ---------- نصب: ذخیره‌ی فایل‌های اصلی ---------- */
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // cache: "reload" یعنی حتماً نسخه‌ی تازه را از اینترنت بگیر
      const core = cache.addAll(CORE_FILES.map(function (url) {
        return new Request(url, { cache: "reload" });
      }));

      // ذخیره‌ی تصاویر تمرین‌ها و فونت‌ها (اختیاری: هر کدام که وجود داشت)
      const optional = core.then(function () {
        return cacheOptionalFiles(cache);
      });

      return optional;
    })
    // نکته: عمداً skipWaiting نمی‌زنیم تا کاربر نوار «نسخه‌ی جدید آماده است» را ببیند
  );
});

// تصاویر و فونت‌ها را تا جایی که وجود دارند ذخیره می‌کند (خطا نادیده گرفته می‌شود)
function cacheOptionalFiles(cache) {
  return fetch("./data/exercises.json", { cache: "reload" })
    .then(function (r) { return r.json(); })
    .then(function (list) {
      const urls = [];
      (list || []).forEach(function (ex) {
        if (ex.finalImage) urls.push(ex.finalImage);
        (ex.steps || []).forEach(function (s) { if (s.image) urls.push(s.image); });
      });
      return urls.concat(FONT_FILES);
    })
    .catch(function () { return FONT_FILES; })
    .then(function (urls) {
      const unique = Array.from(new Set(urls));
      return Promise.allSettled(unique.map(function (url) {
        return fetch(url, { cache: "reload" }).then(function (resp) {
          if (resp.ok) return cache.put(url, resp);
        });
      }));
    });
}

/* ---------- فعال شدن: پاک کردن کش‌های قدیمی ---------- */
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name.indexOf("naqshino-") === 0 && name !== CACHE_NAME) {
          return caches.delete(name);
        }
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ---------- وقتی کاربر دکمه‌ی «به‌روزرسانی» را زد ---------- */
self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/* ---------- پاسخ به درخواست‌ها ---------- */
self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // فقط فایل‌های خود اپ

  // فایل‌های محتوا (data/): اول اینترنت، اگر نبود کش
  // تا تغییر محتوا زودتر برسد و در حالت آفلاین هم اپ کار کند
  if (url.pathname.indexOf("/data/") !== -1) {
    event.respondWith(networkFirst(request));
    return;
  }

  // بقیه‌ی فایل‌ها: اول کش، اگر نبود اینترنت (و ذخیره برای دفعه‌ی بعد)
  event.respondWith(cacheFirst(request));
});

function networkFirst(request) {
  return fetch(request, { cache: "no-cache" }).then(function (response) {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(request, { ignoreSearch: true }).then(function (cached) {
      return cached || new Response("[]", { status: 503, headers: { "Content-Type": "application/json" } });
    });
  });
}

function cacheFirst(request) {
  return caches.match(request, { ignoreSearch: true }).then(function (cached) {
    if (cached) return cached;

    return fetch(request).then(function (response) {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    }).catch(function () {
      // اگر اینترنت نبود و صفحه‌ی اصلی خواسته شد، صفحه‌ی ذخیره‌شده را نشان بده
      if (request.mode === "navigate") {
        return caches.match("./index.html");
      }
      return new Response("", { status: 504 });
    });
  });
}
