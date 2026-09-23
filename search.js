/* Site-wide keyword search. On any page, typing in the header search box
   and pressing Enter (or clicking the magnifier) opens a results window —
   a lightbox listing every matching article/post as a clickable link that
   jumps straight to the content that mentions the word. */
(function () {
  var box = document.querySelector(".search-shell input");
  if (!box) return;

  var CATEGORY_LABELS = {
    horror: "Horror",
    anime: "Anime & Manga",
    wrestling: "Wrestling",
    tech: "Gaming & Tech",
    popculture: "Pop Culture",
    all: "XFD"
  };

  var dataset = null; // lazily loaded + cached

  /* ── Build the modal once ─────────────────────────────────────── */
  var modal = document.createElement("div");
  modal.className = "search-modal";
  modal.id = "search-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Search results");
  modal.innerHTML =
    '<div class="search-modal-panel">' +
      '<button class="search-modal-close" type="button" aria-label="Close search">×</button>' +
      '<p class="search-modal-eyebrow">Search // transmissions</p>' +
      '<h2 class="search-modal-title">Results for “<span id="search-modal-term"></span>”</h2>' +
      '<p class="search-modal-count" id="search-modal-count"></p>' +
      '<ul class="search-modal-results" id="search-modal-results"></ul>' +
      '<p class="search-modal-empty" id="search-modal-empty" hidden>No matches found — try another keyword.</p>' +
    "</div>";
  document.body.appendChild(modal);

  var panel = modal.querySelector(".search-modal-panel");
  var termEl = modal.querySelector("#search-modal-term");
  var countEl = modal.querySelector("#search-modal-count");
  var listEl = modal.querySelector("#search-modal-results");
  var emptyEl = modal.querySelector("#search-modal-empty");

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function videoId(url) {
    if (!url) return null;
    var m = String(url).match(/(?:shorts\/|v=|youtu\.be\/|embed\/|\/vi\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function whenMs(d) {
    // Bare "YYYY-MM-DD" is read as local midnight, not UTC, so article dates
    // don't show a day early in US time zones.
    var s = String(d || "");
    var t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T00:00:00" : s);
    return isNaN(t) ? 0 : t;
  }
  function niceDate(d) {
    var t = whenMs(d);
    if (!t) return d || "";
    return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function label(c) { return CATEGORY_LABELS[c] || c; }

  /* ── Load + normalize searchable items (deduped) ──────────────── */
  function loadData() {
    if (dataset) return Promise.resolve(dataset);
    return Promise.all([
      fetch("articles.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }),
      fetch("social-feed.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
    ]).then(function (res) {
      var articles = res[0] || [];
      var social = res[1] || [];
      var items = [];

      articles.forEach(function (a) {
        items.push({
          rank: 0,
          category: a.portal || "all",
          title: a.title || "",
          date: a.date || "",
          url: "articles/" + encodeURIComponent(a.id) + ".html",
          external: false,
          vid: videoId(a.videoUrl) || videoId(a.image),
          text: ((a.title || "") + " " + (a.summary || "") + " " + (a.body || "")).toLowerCase()
        });
      });
      social.forEach(function (s) {
        items.push({
          rank: s.platform === "youtube" ? 1 : 2,
          category: s.portal || "all",
          title: s.title || "",
          date: s.date || "",
          url: s.url || "#",
          external: true,
          vid: videoId(s.url) || videoId(s.thumbnail),
          text: ((s.title || "") + " " + (s.platform || "")).toLowerCase()
        });
      });

      // Dedupe: same video id collapses to the richest source (article > YT > other).
      items.sort(function (a, b) { return a.rank - b.rank || whenMs(b.date) - whenMs(a.date); });
      var kept = [], seen = {};
      items.forEach(function (it) {
        if (it.vid) {
          if (seen[it.vid]) return;
          seen[it.vid] = true;
        }
        kept.push(it);
      });
      dataset = kept;
      return dataset;
    });
  }

  /* ── Search + render ──────────────────────────────────────────── */
  function runSearch(query) {
    var words = query.toLowerCase().split(/\s+/).filter(Boolean);
    var matches = dataset
      .filter(function (it) {
        var hay = it.text + " " + label(it.category).toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) !== -1; });
      })
      .sort(function (a, b) { return whenMs(b.date) - whenMs(a.date); });

    termEl.textContent = query;
    countEl.textContent = matches.length + (matches.length === 1 ? " result" : " results");
    emptyEl.hidden = matches.length > 0;

    listEl.innerHTML = matches.map(function (it) {
      var target = it.external ? ' target="_blank" rel="noopener"' : "";
      return (
        '<li class="search-result" data-category="' + escapeHtml(it.category) + '">' +
          '<a href="' + escapeHtml(it.url) + '"' + target + ">" +
            '<span class="search-result-cat">' + escapeHtml(label(it.category)) + "</span>" +
            '<span class="search-result-title">' + escapeHtml(it.title) + "</span>" +
            '<span class="search-result-date">' + escapeHtml(niceDate(it.date)) + "</span>" +
          "</a>" +
        "</li>"
      );
    }).join("");
  }

  function openSearch() {
    var query = box.value.trim();
    if (!query) { box.focus(); return; }
    loadData().then(function () {
      runSearch(query);
      modal.setAttribute("aria-hidden", "false");
      var closeBtn = modal.querySelector(".search-modal-close");
      if (closeBtn) closeBtn.focus();
    });
  }
  function closeSearch() {
    modal.setAttribute("aria-hidden", "true");
  }

  /* ── Wire up ──────────────────────────────────────────────────── */
  box.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); openSearch(); }
  });
  var icon = document.querySelector(".search-shell i");
  if (icon) icon.addEventListener("click", openSearch);

  modal.addEventListener("click", closeSearch);
  panel.addEventListener("click", function (e) { e.stopPropagation(); });
  modal.querySelector(".search-modal-close").addEventListener("click", closeSearch);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSearch();
  });
})();
