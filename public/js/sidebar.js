/* Med Sense: sidebar menu + scroll helpers (shared by every page).
   Include as the first thing inside <body>:  <script src="js/sidebar.js"></script>
   Needs css/layout.css. */
(function () {
  if (window.__msSide || !document.body) return;
  window.__msSide = true;

  var KEY = "medsense-side";
  var body = document.body;
  var wide = window.matchMedia("(min-width:1180px)");
  var reduced = window.matchMedia("(prefers-reduced-motion:reduce)");
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  var BROWSE = [
    { key: "home", href: "index.html#home", ico: "🩺", label: "Diseases" },
    { key: "medicines", href: "index.html#medicines", ico: "💊", label: "Medicines" },
    { key: "ingredients", href: "index.html#ingredients", ico: "🧪", label: "Ingredients" },
    { key: "compare", href: "index.html#compare", ico: "⚖️", label: "Compare" },
    { key: "saved", href: "index.html#saved", ico: "♥", label: "Saved", badge: true }
  ];
  var TOOLS = [
    { key: "scan", href: "scan.html", ico: "📄", label: "Scan prescription" },
    { key: "checker", href: "checker.html", ico: "✅", label: "Medicine checker" },
    { key: "search", href: "search.html", ico: "🔎", label: "Search all medicines" },
    { key: "library", href: "medicine-library.html", ico: "📚", label: "Medicine Study Library" }
  ];

  function link(i) {
    return '<a class="ms-link" data-k="' + i.key + '" href="' + i.href + '"><span class="ms-ico" aria-hidden="true">' + i.ico +
      '</span><span>' + i.label + '</span>' + (i.badge ? '<span class="ms-badge" id="ms-badge"></span>' : "") + "</a>";
  }

  var ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
  var ICON_DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  body.insertAdjacentHTML("afterbegin",
    '<div class="ms-progress" id="ms-progress" aria-hidden="true"></div>' +
    '<div class="ms-topbar" aria-hidden="true"><img src="img/med-sense-icon.svg" alt=""><b>Med Sense</b></div>' +
    '<div class="ms-burger" id="ms-burger" role="button" tabindex="0" aria-label="Open menu" aria-controls="ms-side" aria-expanded="false">' + ICON_MENU + "</div>" +
    '<div class="ms-backdrop" id="ms-backdrop"></div>' +
    '<aside class="ms-side" id="ms-side" aria-label="Main menu">' +
      '<div class="ms-head"><a class="ms-brand" href="index.html#home"><img src="img/med-sense-icon.svg" alt=""><b>Med Sense</b></a>' +
      '<div class="ms-close" id="ms-close" role="button" tabindex="0" aria-label="Close menu">' + ICON_X + "</div></div>" +
      '<div class="ms-links" role="navigation" aria-label="Sections">' +
        '<div class="ms-group">Browse</div>' + BROWSE.map(link).join("") +
        '<div class="ms-group">Tools</div>' + TOOLS.map(link).join("") +
      "</div>" +
      '<div class="ms-foot">Educational information only. Not a substitute for advice from a doctor or pharmacist.</div>' +
    "</aside>" +
    '<div class="ms-scroll">' +
      '<div class="ms-go off" id="ms-up" role="button" tabindex="0" aria-label="Scroll to top">' + ICON_UP + "</div>" +
      '<div class="ms-go off" id="ms-down" role="button" tabindex="0" aria-label="Scroll to bottom">' + ICON_DOWN + "</div>" +
    "</div>");

  var $ = function (id) { return document.getElementById(id); };
  var side = $("ms-side"), burger = $("ms-burger"), prog = $("ms-progress"), up = $("ms-up"), down = $("ms-down");

  body.classList.add("ms-has");

  /* ---------- active item + saved count ---------- */
  function activeKey() {
    if (page === "scan.html") return "scan";
    if (page === "checker.html") return "checker";
    if (page === "search.html") return "search";
    if (page === "medicine-library.html") return "library";
    var h = location.hash.slice(1).split("/")[0];
    return ({ "": "home", home: "home", d: "home", medicines: "medicines", m: "medicines", ingredients: "ingredients", i: "ingredients", compare: "compare", saved: "saved" })[h] || "home";
  }
  function favCount() {
    try { var x = JSON.parse(localStorage.getItem("medsense-favs")); return x ? (x.d || []).length + (x.m || []).length : 0; }
    catch (e) { return 0; }
  }
  function sync() {
    var k = activeKey();
    Array.prototype.forEach.call(side.querySelectorAll(".ms-link"), function (a) {
      var on = a.getAttribute("data-k") === k;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    var n = favCount(), b = $("ms-badge");
    if (b) b.textContent = n ? String(n) : "";
  }
  window.msSideSync = sync;

  /* ---------- open / close ---------- */
  function pref() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setOpen(v, remember) {
    body.classList.toggle("ms-open", v);
    burger.setAttribute("aria-expanded", v ? "true" : "false");
    if (remember && wide.matches) { try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (e) {} }
    setTimeout(onScroll, 280);
  }
  function press(el, fn) {
    el.addEventListener("click", fn);
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  }
  press(burger, function () { setOpen(true, true); });
  press($("ms-close"), function () { setOpen(false, true); burger.focus(); });
  $("ms-backdrop").addEventListener("click", function () { setOpen(false, false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && body.classList.contains("ms-open") && !wide.matches) { setOpen(false, false); burger.focus(); }
  });
  side.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".ms-link")) {
      if (!wide.matches) setOpen(false, false);
      setTimeout(sync, 0);
    }
  });
  var onWideChange = function () { setOpen(wide.matches && pref() !== "0", false); };
  if (wide.addEventListener) wide.addEventListener("change", onWideChange); else wide.addListener(onWideChange);
  setOpen(wide.matches && pref() !== "0", false);

  /* ---------- scroll helpers ---------- */
  function onScroll() {
    var el = document.documentElement;
    var max = el.scrollHeight - window.innerHeight;
    var y = window.pageYOffset || el.scrollTop || 0;
    prog.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    up.classList.toggle("off", y < 200);
    down.classList.toggle("off", max < 400 || max - y < 200);
  }
  function jump(top) {
    var el = document.documentElement;
    window.scrollTo({ top: top ? 0 : el.scrollHeight, behavior: reduced.matches ? "auto" : "smooth" });
  }
  press(up, function () { jump(true); });
  press(down, function () { jump(false); });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  if (window.ResizeObserver) new ResizeObserver(onScroll).observe(body);

  /* ---------- keep the menu in step with the page ---------- */
  window.addEventListener("hashchange", sync);
  window.addEventListener("storage", sync);
  document.addEventListener("click", function () { setTimeout(sync, 0); });
  sync();
  onScroll();
})();
