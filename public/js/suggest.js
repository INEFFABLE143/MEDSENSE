/* Med Sense: suggestions when a disease or medicine is not found.
   Save as public/js/suggest.js and load it in checker.html (see instructions). */
(function () {
  var css =
    ".chip{width:auto;border:1.5px solid var(--line);background:#fff;color:var(--pine);font-weight:600;font-size:13px;padding:6px 14px;border-radius:99px;cursor:pointer;box-shadow:none;letter-spacing:normal}" +
    ".chip:hover:not(:disabled){transform:none;filter:none;box-shadow:none;background:var(--pine);border-color:var(--pine);color:#fff}" +
    ".chip-row{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px}" +
    ".suggest-card .medicine-result-header p{color:var(--muted);font-size:14px}" +
    ".suggest-body{padding:16px 20px}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function esc(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function chip(label, attrs) {
    return '<button type="button" class="chip" ' + attrs + ">" + esc(label) + "</button>";
  }

  function medicineChip(name, diseaseName) {
    var attrs = 'data-fill-medicine="' + esc(name) + '"';
    if (diseaseName) attrs += ' data-fill-disease="' + esc(diseaseName) + '"';
    return chip(name, attrs);
  }

  /* ---------- medicine not found ---------- */
  function medicineHtml(data) {
    var d = data.disease || {};
    var meds = data.suggestedMedicines || [];
    var dym = data.didYouMean || [];
    var html = "";

    if (dym.length) {
      html += '<h2 class="section-title">🤔 Did you mean?</h2><div class="chip-row">' +
        dym.map(function (n) { return medicineChip(n); }).join("") + "</div>";
    }

    html += '<h2 class="section-title">💊 Medicines in our database for ' + esc(d.name) + "</h2>";

    if (meds.length) {
      html += '<p class="hint" style="margin-bottom:12px">Tap a medicine name to check it for this condition.</p>' +
        '<div class="medicine-table-wrapper"><table class="medicine-table"><thead><tr>' +
        "<th>Medicine</th><th>Form</th><th>Purpose</th><th>Uses</th><th>Age Information</th><th>Availability</th><th>Precautions</th>" +
        "</tr></thead><tbody>" +
        meds.map(function (m) {
          return "<tr><td>" + medicineChip(m.name) + '</td><td><span class="tablet">' + esc(m.form) + "</span></td><td>" +
            esc(m.purpose) + "</td><td>" + esc(m.uses) + "</td><td>" + esc(m.age) + "</td><td>" +
            esc(m.status) + "</td><td>" + esc(m.precautions) + "</td></tr>";
        }).join("") +
        "</tbody></table></div>";
    } else {
      html += '<div class="warning">No medicine is listed in our database for this condition. It may need professional diagnosis and treatment.</div>';
    }

    if (d.note) {
      html += '<div class="warning"><b>ℹ️ Note:</b> ' + esc(d.note) + "</div>";
    }

    if (d.warningSigns && d.warningSigns.length) {
      html += '<div class="redflag"><h3>🚨 Warning signs: get medical help</h3><ul>' +
        d.warningSigns.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
        '</ul><p class="em">Emergency? Call your local emergency number (112 in India).</p></div>';
    }

    html += '<div class="warning"><b>⚠️ These are not recommendations.</b> They are the medicines listed in the Med Sense database for this condition. ' +
      "Some may be prescription-only. Always check the package label and ask a doctor or pharmacist before use.</div>";

    return html;
  }

  /* ---------- disease not found ---------- */
  function diseaseHtml(data) {
    var list = data.suggestedDiseases || [];
    var html = "";

    if (data.medicineName && data.medicineUsedFor && data.medicineUsedFor.length) {
      html += '<h2 class="section-title">💊 ' + esc(data.medicineName) + " is listed for</h2><div class=\"chip-row\">" +
        data.medicineUsedFor.map(function (n) {
          return chip(n, 'data-fill-disease="' + esc(n) + '"');
        }).join("") + "</div>";
    }

    if (!list.length) {
      return html + '<div class="warning">No similar condition was found in the database. Try a different name or describe the main symptom (for example "cough" or "stomach pain").</div>';
    }

    html += '<h2 class="section-title">🤔 Similar conditions in our database</h2>';

    list.forEach(function (s) {
      html += '<div class="medicine-result suggest-card" style="margin-top:16px">' +
        '<div class="medicine-result-header"><h3>' + esc(s.name) + "</h3><p>" + esc(s.category) + " · " + esc(s.symptoms) + "</p></div>" +
        '<div class="suggest-body">';

      if (s.medicines && s.medicines.length) {
        html += "<p><b>Medicines listed (tap one to check it):</b></p><div class=\"chip-row\">" +
          s.medicines.map(function (m) { return medicineChip(m.name, s.name); }).join("") + "</div>";
      } else {
        html += "<p>No medicines are listed for this condition.</p>";
      }

      if (s.note) html += '<p class="hint" style="margin-top:8px">ℹ️ ' + esc(s.note) + "</p>";

      html += '<div class="chip-row" style="margin-top:12px">' +
        chip("Use this condition", 'data-fill-disease="' + esc(s.name) + '"') + "</div></div></div>";
    });

    html += '<div class="warning"><b>⚠️ Educational information only.</b> Similar conditions are matched by name and symptoms and are not a diagnosis. See a doctor if you are unsure what you have.</div>';
    return html;
  }

  /* ---------- public entry point ---------- */
  window.renderNotFound = function (data) {
    var result = document.getElementById("result");
    var title = data.field === "disease" ? "Disease Not Found"
      : data.field === "medicine" ? "Medicine Not Found"
      : "Please Check Your Input";

    var html = '<div class="error"><h2>❌ ' + title + "</h2><p>" + esc(data.error || "Something went wrong.") + "</p></div>";
    if (data.field === "medicine") html += medicineHtml(data);
    else if (data.field === "disease") html += diseaseHtml(data);

    result.innerHTML = html;
  };

  /* Clicking a suggestion fills the form and re-runs the check */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-fill-disease],[data-fill-medicine]");
    if (!b) return;

    var d = b.getAttribute("data-fill-disease");
    var m = b.getAttribute("data-fill-medicine");
    if (d !== null) document.getElementById("disease").value = d;
    if (m !== null) document.getElementById("medicine").value = m;

    if (typeof checkInfo === "function") checkInfo();
  });
})();
