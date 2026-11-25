/* Renders an openFDA label result (from /api/lookup or /api/check) as a card. */
(function () {
  var css =
    ".fda-card{border:1.5px solid var(--line);border-radius:18px;background:var(--paper);overflow:hidden;margin:12px 0}" +
    ".fda-head{padding:16px 20px;border-bottom:1px solid var(--line)}" +
    ".fda-head h3{margin:6px 0 2px;color:var(--pine)}.fda-head p{color:var(--muted);font-size:14px;margin:0}" +
    ".fda-badge{display:inline-block;background:var(--pine);color:#fff;font-size:12px;font-weight:700;padding:2px 10px;border-radius:99px}" +
    ".fda-card details{padding:12px 20px;border-bottom:1px solid var(--line)}" +
    ".fda-card summary{cursor:pointer;font-weight:700;color:var(--pine)}" +
    ".fda-card details p{margin:8px 0 0;font-size:14px;line-height:1.6}" +
    ".fda-box{margin:0;padding:12px 20px;background:#3a1a1a1a;border-bottom:1px solid #e05555;color:inherit;font-size:14px}" +
    ".fda-src{padding:12px 20px;font-size:13px;color:var(--muted);margin:0}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  function esc(t) {
    return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  var SECTIONS = [
    ["Uses", "uses", true], ["Warnings", "warnings", true], ["Do not use if", "doNotUse", false],
    ["Stop use and ask a doctor if", "stopUse", false], ["Contraindications", "contraindications", false],
    ["Side effects (adverse reactions)", "adverseReactions", false], ["Interactions", "interactions", false],
    ["Pregnancy / breastfeeding", "pregnancy", false], ["Use in children", "pediatric", false],
  ];

  window.renderFdaCard = function (ext) {
    if (!ext || !ext.found) return "";
    var l = ext.label;
    var title = (l.brandNames[0] || l.genericNames[0] || ext.searchedAs || ext.query);
    var sub = [l.genericNames[0], l.activeIngredient && !l.genericNames[0] ? l.activeIngredient : null, l.manufacturer, l.route.join(", ")]
      .filter(Boolean).join(" · ");
    var h = '<div class="fda-card"><div class="fda-head"><span class="fda-badge">U.S. FDA drug label</span><h3>' + esc(title) +
      "</h3><p>" + esc(sub) + "</p></div>";
    if (l.boxedWarning) h += '<p class="fda-box"><b>🚨 Boxed warning:</b> ' + esc(l.boxedWarning) + "</p>";
    SECTIONS.forEach(function (s) {
      if (l[s[1]]) h += "<details" + (s[2] ? " open" : "") + "><summary>" + esc(s[0]) + "</summary><p>" + esc(l[s[1]]) + "</p></details>";
    });
    h += '<p class="fda-src">Source: openFDA (U.S. FDA drug labels)' + (l.labelDate ? ", label dated " + esc(l.labelDate) : "") +
      (ext.searchedAs && ext.searchedAs !== String(ext.query).toLowerCase() ? '. Searched as "' + esc(ext.searchedAs) + '"' : "") +
      ". This is a U.S. label: brand names, strengths, approved uses and availability can differ in India. Educational only. Check your own pack and ask a doctor or pharmacist.</p></div>";
    return h;
  };
})();
