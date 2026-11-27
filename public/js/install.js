/* Med Sense — Add to home screen / Install app */
(function () {
  var deferred = null;
  var KEY = "ms_install_dismissed";

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function dismissed() {
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
  }

  function css() {
    if (document.getElementById("ms-install-css")) return;
    var s = document.createElement("style");
    s.id = "ms-install-css";
    s.textContent =
      ".ms-install{position:fixed;left:50%;bottom:78px;transform:translateX(-50%);z-index:70;" +
      "display:flex;align-items:center;gap:12px;max-width:min(420px,calc(100% - 24px));" +
      "padding:12px 14px;border-radius:16px;background:#0a4d4e;color:#fff;" +
      "box-shadow:0 12px 32px rgba(0,0,0,.28);font:600 14px/1.35 Manrope,Segoe UI,Arial,sans-serif}" +
      ".ms-install p{margin:0;flex:1;font-weight:500;font-size:13px;opacity:.95}" +
      ".ms-install b{display:block;font-weight:800;font-size:14px;margin-bottom:2px}" +
      ".ms-install .ms-install-go{border:0;border-radius:99px;padding:8px 14px;font:700 13px Manrope,sans-serif;" +
      "background:#7ff0d0;color:#062a33;cursor:pointer}" +
      ".ms-install .ms-install-x{border:0;background:transparent;color:#c9ece6;font-size:18px;cursor:pointer;line-height:1;padding:4px 6px}" +
      ".ms-install-fab{position:fixed;right:16px;bottom:64px;z-index:64;border:0;border-radius:99px;" +
      "padding:10px 16px;font:700 13px Manrope,sans-serif;background:#0a4d4e;color:#fff;" +
      "box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer}" +
      "@media(max-width:700px){.ms-install{bottom:88px}.ms-install-fab{bottom:70px;right:12px}}" +
      "@media print{.ms-install,.ms-install-fab{display:none!important}}";
    document.head.appendChild(s);
  }

  function showBanner() {
    if (document.getElementById("ms-install")) return;
    css();
    var el = document.createElement("div");
    el.id = "ms-install";
    el.className = "ms-install";
    el.setAttribute("role", "dialog");
    el.innerHTML =
      "<p><b>Add Med Sense to your device</b>Open it like an app from your home screen or desktop</p>" +
      "<button type=\"button\" class=\"ms-install-go\">Add icon</button>" +
      "<button type=\"button\" class=\"ms-install-x\" aria-label=\"Dismiss\">×</button>";
    document.body.appendChild(el);
    el.querySelector(".ms-install-go").onclick = function () { triggerInstall(); };
    el.querySelector(".ms-install-x").onclick = function () {
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      el.remove();
      ensureFab();
    };
  }

  function ensureFab() {
    if (isStandalone() || document.getElementById("ms-install-fab")) return;
    // Only show fab if install is possible or we want to show instructions
    css();
    var b = document.createElement("button");
    b.type = "button";
    b.id = "ms-install-fab";
    b.className = "ms-install-fab";
    b.textContent = "Add to device";
    b.onclick = function () { triggerInstall(); };
    document.body.appendChild(b);
  }

  function triggerInstall() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (choice) {
        deferred = null;
        var banner = document.getElementById("ms-install");
        if (banner) banner.remove();
        var fab = document.getElementById("ms-install-fab");
        if (fab) fab.remove();
        if (choice && choice.outcome === "accepted") {
          try { localStorage.setItem(KEY, "1"); } catch (e) {}
        }
      });
      return;
    }
    // Fallback instructions when browser has no native prompt
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var isAndroid = /android/i.test(navigator.userAgent);
    var msg;
    if (isIOS) {
      msg = "On iPhone/iPad: tap the Share button, then “Add to Home Screen”.";
    } else if (isAndroid) {
      msg = "On Android: open the browser menu (⋮) and choose “Install app” or “Add to Home screen”.";
    } else {
      msg = "In Chrome or Edge on desktop: open the address-bar install icon, or Menu → “Install Med Sense” / “Cast, save and share” → “Install page as app”.";
    }
    alert(msg);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (!isStandalone() && !dismissed()) showBanner();
    else if (!isStandalone()) ensureFab();
  });

  window.addEventListener("appinstalled", function () {
    deferred = null;
    var banner = document.getElementById("ms-install");
    if (banner) banner.remove();
    var fab = document.getElementById("ms-install-fab");
    if (fab) fab.remove();
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
  });

  // If already installable later, or user dismissed banner — keep a small button
  document.addEventListener("DOMContentLoaded", function () {
    if (isStandalone()) return;
    // iOS never fires beforeinstallprompt — show fab with instructions
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !dismissed()) ensureFab();
  });
})();
