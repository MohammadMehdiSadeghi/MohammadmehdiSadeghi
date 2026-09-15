/**
 * PorsCode Embed Loader v1
 * یک اسکریپت سبک برای جاسازی فرم‌ها در سایت‌های دیگر
 *
 * استفاده:
 * <div data-pcode-form="fr_xxxxxxxx"></div>
 * <script src="https://your-domain.com/loader.js" async></script>
 */
(function () {
  "use strict";

  var BASE = (function () {
    // URL فعلی اسکریپت را پیدا کن
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("loader.js") !== -1) {
        return src.replace(/\/loader\.js.*$/, "");
      }
    }
    return window.location.origin;
  })();

  // ─── ساخت iframe برای هر فرم ───
  function createIframe(formId, container, mode) {
    var iframe = document.createElement("iframe");
    iframe.src = BASE + "/embed/" + formId;
    iframe.setAttribute("data-form-id", formId);
    iframe.setAttribute("data-pcode-iframe", formId);
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow", "camera; microphone; autoplay");
    iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups");
    iframe.style.width = "100%";
    iframe.style.border = "none";
    iframe.style.minHeight = "400px";
    iframe.style.overscrollBehavior = "contain";

    // ─── ذخیره reference‌ها برای close از بیرون ───
    if (!window.__pcodeInstances) window.__pcodeInstances = {};
    window.__pcodeInstances[formId] = { iframe: iframe, mode: mode };

    if (mode === "inline") {
      iframe.style.height = "600px";
      container.appendChild(iframe);
    } else if (mode === "popup") {
      // popup mode: مخفی تا کلیک بشه
      iframe.style.display = "none";
      iframe.style.position = "fixed";
      iframe.style.top = "50%";
      iframe.style.left = "50%";
      iframe.style.transform = "translate(-50%, -50%)";
      iframe.style.zIndex = "99999";
      iframe.style.width = "90vw";
      iframe.style.maxWidth = "600px";
      iframe.style.height = "80vh";
      iframe.style.borderRadius = "16px";
      iframe.style.boxShadow = "0 25px 50px rgba(0,0,0,0.25)";
      document.body.appendChild(iframe);

      // overlay
      var overlay = document.createElement("div");
      overlay.setAttribute("data-pcode-overlay", formId);
      overlay.style.display = "none";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.5)";
      overlay.style.zIndex = "99998";
      overlay.style.backdropFilter = "blur(4px)";
      document.body.appendChild(overlay);
      window.__pcodeInstances[formId].overlay = overlay;

      function lockBody() {
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.touchAction = "none";
      }
      function unlockBody() {
        document.documentElement.style.overflow = "";
        document.documentElement.style.touchAction = "";
      }
      function openPopup() {
        iframe.style.display = "block";
        overlay.style.display = "block";
        lockBody();
        postEvent(formId, "opened");
      }
      function closePopup() {
        iframe.style.display = "none";
        overlay.style.display = "none";
        unlockBody();
        postEvent(formId, "closed");
      }

      window.__pcodeInstances[formId].close = closePopup;
      overlay.addEventListener("click", closePopup);

      // کلیک روی دکمه trigger
      if (container.tagName === "BUTTON" || container.tagName === "A") {
        container.addEventListener("click", function (e) {
          e.preventDefault();
          openPopup();
        });
      } else {
        // داخل کانتینر یک دکمه بساز
        var btn = document.createElement("button");
        btn.textContent = "باز کردن فرم";
        btn.style.cssText = "background:#58BDAF;color:#fff;padding:10px 24px;border-radius:16px;font-weight:bold;cursor:pointer;border:none;font-family:sans-serif;box-shadow:3px 3px 0 0 rgba(0,0,0,0.2);";
        btn.addEventListener("click", openPopup);
        container.appendChild(btn);
      }

      return iframe;
    } else if (mode === "popover") {
      // popover: پنل کوچک از گوشه صفحه
      iframe.style.display = "none";
      iframe.style.position = "fixed";
      iframe.style.bottom = "20px";
      iframe.style.right = "20px";
      iframe.style.zIndex = "99999";
      iframe.style.width = "380px";
      iframe.style.maxWidth = "90vw";
      iframe.style.height = "500px";
      iframe.style.borderRadius = "16px";
      iframe.style.boxShadow = "0 10px 40px rgba(0,0,0,0.2)";
      document.body.appendChild(iframe);

      // دکمه toggle
      var fab = document.createElement("button");
      fab.setAttribute("data-pcode-fab", formId);
      fab.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:100000;width:56px;height:56px;border-radius:50%;background:#21295A;color:#fff;font-size:24px;border:none;cursor:pointer;box-shadow:0 4px 15px rgba(33,41,90,0.4);display:flex;align-items:center;justify-content:center;font-family:sans-serif;";
      fab.innerHTML = '<span style="font-size:11px;font-weight:900;line-height:1.3;text-align:center;font-family:Vazirmatn,sans-serif;">پرس<br/><span style="color:#58BDAF;">کاد</span></span>';
      document.body.appendChild(fab);

      var isOpen = false;
      function togglePopover() {
        isOpen = !isOpen;
        iframe.style.display = isOpen ? "block" : "none";
        fab.innerHTML = isOpen ? '✕' : '<span style="font-size:11px;font-weight:900;line-height:1.3;text-align:center;font-family:Vazirmatn,sans-serif;">پرس<br/><span style="color:#58BDAF;">کاد</span></span>';
        if (isOpen) {
          document.documentElement.style.overflow = "hidden";
          document.documentElement.style.touchAction = "none";
        } else {
          document.documentElement.style.overflow = "";
          document.documentElement.style.touchAction = "";
        }
        postEvent(formId, isOpen ? "opened" : "closed");
      }
      function closePopover() {
        if (isOpen) togglePopover();
      }
      window.__pcodeInstances[formId].close = closePopover;
      fab.addEventListener("click", togglePopover);

      return iframe;
    }
  }

  // ─── postMessage events ───
  var events = {};
  function postEvent(formId, eventName, data) {
    if (events[formId] && events[formId][eventName]) {
      events[formId][eventName](data);
    }
  }

  // ─── گوش دادن به پیام‌های iframe ───
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || !d.type) return;

    if (d.type === "pcode:resize") {
      var iframe = document.querySelector('iframe[data-form-id="' + d.formId + '"]');
      if (iframe) iframe.style.height = d.height + "px";
    }

    if (d.type === "pcode:started") postEvent(d.formId, "started");
    if (d.type === "pcode:submitted") postEvent(d.formId, "submitted", d);
    if (d.type === "pcode:view") postEvent(d.formId, "viewed");

    // بستن فرم — از iframe ارسال شده
    if (d.type === "pcode:closed") {
      postEvent(d.formId, "closed");
      // روش مستقیم: استفاده از reference ذخیره شده
      var inst = window.__pcodeInstances && window.__pcodeInstances[d.formId];
      if (inst && typeof inst.close === "function") {
        inst.close();
      } else {
        // روش fallback: پیدا کردن عناصر با selector
        var closedIframe = document.querySelector('iframe[data-form-id="' + d.formId + '"]');
        if (closedIframe) closedIframe.style.display = "none";
        var overlay2 = document.querySelector('[data-pcode-overlay="' + d.formId + '"]');
        if (overlay2) overlay2.style.display = "none";
        var fab2 = document.querySelector('[data-pcode-fab="' + d.formId + '"]');
        if (fab2) fab2.innerHTML = '<span style="font-size:11px;font-weight:900;line-height:1.3;text-align:center;font-family:Vazirmatn,sans-serif;">پرس<br/><span style="color:#58BDAF;">کاد</span></span>';
      }
    }
  });

  // ─── API عمومی ───
  window.PorsCode = window.PorsCode || {};
  window.PorsCode.on = function (formId, event, callback) {
    if (!events[formId]) events[formId] = {};
    events[formId][event] = callback;
  };

  // ─── راه‌اندازی خودکار ───
  function init() {
    // Inline forms
    var containers = document.querySelectorAll("[data-pcode-form]");
    for (var i = 0; i < containers.length; i++) {
      var formId = containers[i].getAttribute("data-pcode-form");
      if (formId) createIframe(formId, containers[i], "inline");
    }

    // Popup buttons
    var popups = document.querySelectorAll("[data-pcode-popup]");
    for (var j = 0; j < popups.length; j++) {
      var fid = popups[j].getAttribute("data-pcode-popup");
      if (fid) createIframe(fid, popups[j], "popup");
    }

    // Popover from config
    if (window.PorsCode && window.PorsCode.popover) {
      var cfg = window.PorsCode.popover;
      if (cfg.formId) {
        var dummy = document.createElement("div");
        createIframe(cfg.formId, dummy, "popover");
      }
    }
  }

  // بارگذاری فونت IranSans
  function loadFont() {
    if (document.getElementById("porscad-font")) return;
    var link = document.createElement("link");
    link.id = "porscad-font";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33/Vazirmatn-font-face.css";
    document.head.appendChild(link);
  }

  // اجرا بعد از لود صفحه
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() { loadFont(); init(); });
  } else {
    loadFont();
    init();
  }
})();
