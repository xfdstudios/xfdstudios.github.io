/* XFD Halloween mode. Turns itself on during October (visitor's local time)
   and does nothing the rest of the year, so it never needs to be switched on
   or off by hand. While it's on it adds:
   - Halloween icons: menu icons swap to a ghost, skull, witch hat and spider;
     cobwebs and slime drips on the header; bats crossing the homepage banner;
     a graveyard silhouette above the footer; a pumpkin-orange "Watch now"
   - a small "Hello, boils and ghouls!" welcome, shown once per visitor
   - a Halloween countdown line on the homepage
   - a tab-title gag when someone switches to another tab
   - a 5-pumpkin hunt, one pumpkin per portal page, with a "Pumpkin Hunt"
     button on every page that explains the rules and tracks progress.
     Finding all 5 unlocks a free phone wallpaper (one of two, picked at
     random per visitor).
   Preview it in any month with ?halloween=on, or hide it with ?halloween=off.
   Progress is kept in localStorage per visitor; if storage is blocked, the
   hunt still works on the current page, it just won't remember. */
(function () {
  var params = new URLSearchParams(location.search);
  var force = params.get("halloween");
  var now = new Date();
  var active = force === "on" || (force !== "off" && now.getMonth() === 9);
  if (!active) return;

  var YEAR = now.getFullYear();
  var KEY = "xfd-halloween-" + YEAR;
  var memory = {};
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return memory; }
  }
  function save(state) {
    memory = state;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode etc. */ }
  }

  /* Each pumpkin's spot was checked for overlaps at phone and desktop widths. */
  var PORTALS = [
    { key: "horror", label: "Horror", href: "horror.html", spot: ".archive-panel", corner: "top" },
    { key: "anime", label: "Anime & Manga", href: "anime.html", spot: ".related-portals", corner: "top" },
    { key: "wrestling", label: "Wrestling", href: "wrestling.html", spot: ".site-footer", corner: "bottom" },
    { key: "tech", label: "Gaming & Tech", href: "tech-gaming.html", spot: ".archive-panel", corner: "top" },
    { key: "popculture", label: "Pop Culture", href: "popculture.html", spot: ".archive-panel", corner: "top" }
  ];
  var WALLPAPERS = {
    graveyard: {
      preview: "assets/halloween/xfd-halloween-wallpaper-graveyard-preview.jpg",
      full: "assets/halloween/xfd-halloween-wallpaper-graveyard.jpg",
      alt: "XFD Halloween wallpaper: a haunted graveyard under a full moon, with slime, a crypt and three glowing jack-o'-lanterns"
    },
    shrine: {
      preview: "assets/halloween/xfd-halloween-wallpaper-shrine-preview.jpg",
      full: "assets/halloween/xfd-halloween-wallpaper-shrine.jpg",
      alt: "XFD Halloween wallpaper: a horror collector's shrine with cursed relics, candles and the XFD logo on an old TV"
    }
  };
  var NAV_ICONS = {
    "fa-newspaper": "fa-ghost",
    "fa-microchip": "fa-skull",
    "fa-pen-nib": "fa-hat-wizard",
    "fa-envelope": "fa-spider"
  };

  document.documentElement.classList.add("xfd-halloween");
  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "halloween.css?v=5";
  document.head.appendChild(css);

  function make(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html) node.innerHTML = html;
    return node;
  }
  function decorative(tag, className, html) {
    var node = make(tag, className, html);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  /* ── Halloween icons ─────────────────────────────────────────── */

  var header = document.querySelector(".site-header");
  if (header) {
    header.appendChild(decorative("div", "xfd-web xfd-web--left"));
    header.appendChild(decorative("div", "xfd-web xfd-web--right"));
    header.appendChild(decorative("div", "xfd-slime"));
  }

  var navIcons = document.querySelectorAll(".nav-links i");
  for (var n = 0; n < navIcons.length; n++) {
    for (var from in NAV_ICONS) {
      if (navIcons[n].classList.contains(from)) {
        navIcons[n].classList.remove(from);
        navIcons[n].classList.add(NAV_ICONS[from]);
      }
    }
  }

  var BAT = '<svg viewBox="0 0 100 44"><path d="M50 16c-3-6-8-8-12-6 2 4 0 8-4 8-6-6-18-8-30-2 8 2 12 8 12 16 6-4 12-4 16 0 2-6 8-8 12-6l6 8 6-8c4-2 10 0 12 6 4-4 10-4 16 0 0-8 4-14 12-16-12-6-24-4-30 2-4 0-6-4-4-8-4-2-9 0-12 6z"/><path d="M46 12l1-6 2 5zm8 0l-1-6-2 5z"/></svg>';
  var hero = document.querySelector(".hero-banner");
  if (hero) {
    hero.appendChild(decorative("div", "xfd-bats",
      '<span class="xfd-bat xfd-bat--1">' + BAT + "</span>" +
      '<span class="xfd-bat xfd-bat--2">' + BAT + "</span>" +
      '<span class="xfd-bat xfd-bat--3">' + BAT + "</span>"));
  }

  var footer = document.querySelector(".site-footer");
  if (footer) footer.parentNode.insertBefore(decorative("div", "xfd-graveyard", graveyardSvg()), footer);

  function graveyardSvg() {
    function stone(x, w, h) {
      var r = w / 2;
      return '<path d="M' + x + " 92V" + (92 - h + r) + "a" + r + " " + r + " 0 0 1 " + w + " 0V92z\"/>";
    }
    function cross(x, h) {
      return '<path d="M' + (x - 3) + " 92V" + (92 - h) + "h6V92zM" + (x - 11) + " " + (92 - h + 10) + 'h22v6h-22z"/>';
    }
    function pumpkin(x, s) {
      var y = 92 - 13 * s;
      return '<g transform="translate(' + x + " " + y + ") scale(" + s + ')">' +
        '<path fill="#4f7a23" d="M-1-13c0-4 2-6 5-7l1 2c-2 1-3 3-3 5z"/>' +
        '<ellipse fill="#ff8a2b" cx="0" cy="0" rx="16" ry="13"/>' +
        '<ellipse fill="#e86a10" cx="0" cy="0" rx="6" ry="13"/>' +
        '<path fill="#ffe08a" d="M-10-4l4-5 4 5zM2-4l4-5 4 5zM-10 4c4 5 16 5 20 0l-3 1-2 3-3-3-2 3-3-3-2 3-2-3z"/>' +
        "</g>";
    }
    var fence = "";
    for (var f = 0; f < 7; f++) {
      var fx = 610 + f * 16;
      fence += '<path d="M' + fx + " 92V58l3-6 3 6v34z\"/>";
    }
    fence += '<path d="M604 66h116v4H604zM604 80h116v4H604z"/>';
    return '<svg viewBox="0 0 1200 96" preserveAspectRatio="xMidYMax slice">' +
      '<defs><linearGradient id="xfd-sky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#8a35ff" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#8a35ff" stop-opacity=".22"/></linearGradient></defs>' +
      '<rect width="1200" height="96" fill="url(#xfd-sky)"/>' +
      '<g fill="#0c0914">' +
        '<path d="M0 86q150-12 300-2t300-4 300 6 300-8V96H0z"/>' +
        '<path d="M118 92V40c-8-6-20-10-30-8 10-4 22 0 28 4V22c-6-6-8-14-6-20 4 6 6 12 9 16 2-6 8-10 14-12-4 6-6 12-6 18v18c6-6 16-8 26-6-10 2-20 8-25 14v42z"/>' +
        stone(250, 30, 34) + stone(300, 22, 24) + cross(395, 40) + stone(505, 28, 30) +
        fence + stone(760, 34, 38) + cross(880, 34) + stone(975, 26, 28) + stone(1085, 32, 36) +
      "</g>" +
      pumpkin(455, 1.1) + pumpkin(825, 0.9) + pumpkin(1040, 1.25) + pumpkin(190, 0.8) +
      "</svg>";
  }

  /* ── Countdown on the homepage ───────────────────────────────── */

  var mark = document.querySelector(".hero-copy .signal-mark");
  var countdown = countdownText();
  if (mark && countdown) {
    var line = make("p", "xfd-countdown");
    line.textContent = countdown;
    mark.insertAdjacentElement("afterend", line);
  }
  function countdownText() {
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.round((new Date(YEAR, 9, 31) - today) / 86400000);
    if (days === 0) return "🎃 Happy Halloween, boils and ghouls!";
    if (days === 1) return "🎃 1 day until Halloween";
    if (days > 1) return "🎃 " + days + " days until Halloween";
    return "";
  }

  /* ── Tab-title gag ───────────────────────────────────────────── */

  var realTitle = document.title;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      realTitle = document.title;
      document.title = "👻 Come back… the crypt misses you";
    } else {
      document.title = realTitle;
    }
  });

  /* ── Dialogs (rules + prize) ─────────────────────────────────── */

  function openDialog(className, html) {
    var dialog = make("div", "xfd-dialog " + className,
      '<div class="xfd-dialog-panel" role="dialog" aria-modal="true" aria-labelledby="xfd-dialog-title">' +
        '<button type="button" class="xfd-close" aria-label="Close">×</button>' + html +
      "</div>");
    function close() {
      dialog.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    dialog.addEventListener("click", function (e) { if (e.target === dialog) close(); });
    dialog.querySelector(".xfd-close").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(dialog);
    dialog.querySelector(".xfd-close").focus();
    return dialog;
  }

  function openRules() {
    var have = found();
    var list = PORTALS.map(function (p) {
      var isHere = p.key === document.body.dataset.portal;
      return have.indexOf(p.key) !== -1
        ? '<li class="is-found"><span>✓</span> ' + p.label + " <em>found</em></li>"
        : '<li><span>🎃</span> <a href="' + p.href + '">' + p.label + "</a>" + (isHere ? " <em>it's on this page</em>" : "") + "</li>";
    }).join("");
    openDialog("xfd-rules",
      '<p class="xfd-dialog-eyebrow">Halloween at XFD</p>' +
      '<h2 id="xfd-dialog-title">🎃 The XFD Pumpkin Hunt</h2>' +
      "<p>5 pumpkins are hiding on the site this October. Find them all to unlock a free Halloween phone wallpaper.</p>" +
      '<h3>How to play</h3><ol class="xfd-rules-list">' +
        "<li>There's one pumpkin on each portal page: Horror, Anime &amp; Manga, Wrestling, Gaming &amp; Tech and Pop Culture.</li>" +
        "<li>Look around each page, especially the corners. Tap a pumpkin to collect it.</li>" +
        "<li>Your progress saves in this browser, so hunt at your own pace on the same device.</li>" +
        "<li>Find all 5 to unlock one of two XFD wallpapers, picked at random.</li>" +
        "<li>The hunt runs through October 31.</li>" +
      "</ol>" +
      "<h3>Your pumpkins: " + have.length + " / " + PORTALS.length + '</h3><ul class="xfd-progress-list">' + list + "</ul>");
  }

  function openPrize() {
    var s = load();
    if (!WALLPAPERS[s.prize]) {
      s.prize = Math.random() < 0.5 ? "graveyard" : "shrine";
      save(s);
    }
    var paper = WALLPAPERS[s.prize];
    openDialog("xfd-prize",
      '<p class="xfd-dialog-eyebrow">All 5 pumpkins found</p>' +
      '<h2 id="xfd-dialog-title">You unlocked a free XFD wallpaper 🎃</h2>' +
      '<img src="' + paper.preview + '" alt="' + paper.alt + '">' +
      '<a class="button primary" href="' + paper.full + '" download="XFD-Halloween-Wallpaper.jpg">Download wallpaper</a>' +
      '<p class="xfd-prize-note">Set it as your lock screen. Happy Halloween from XFD.</p>');
  }

  /* ── Welcome, once per visitor ───────────────────────────────── */

  var state = load();
  if (!state.welcomed) {
    state.welcomed = true;
    save(state);
    setTimeout(showWelcome, 1200);
  }
  function showWelcome() {
    var box = make("div", "xfd-welcome",
      '<button type="button" class="xfd-close" aria-label="Close">×</button>' +
      "<strong>🎃 Hello, boils and ghouls!</strong>" +
      "Welcome to the crypt. 5 pumpkins are hiding across the XFD portals. " +
      "Find them all to unlock a free Halloween phone wallpaper." +
      '<button type="button" class="xfd-welcome-rules">How to play</button>');
    box.setAttribute("role", "status");
    box.querySelector(".xfd-close").addEventListener("click", function () { box.remove(); });
    box.querySelector(".xfd-welcome-rules").addEventListener("click", function () {
      box.remove();
      openRules();
    });
    document.body.appendChild(box);
  }

  /* ── Pumpkin hunt ────────────────────────────────────────────── */

  function found() {
    var s = load();
    return Array.isArray(s.found) ? s.found : [];
  }

  var here = null;
  for (var i = 0; i < PORTALS.length; i++) {
    if (PORTALS[i].key === document.body.dataset.portal) here = PORTALS[i];
  }
  if (here && found().indexOf(here.key) === -1) placePumpkin(here);
  renderHuntButton();

  function placePumpkin(portal) {
    var host = document.querySelector(portal.spot) || document.querySelector("main");
    if (!host) return;
    host.classList.add("xfd-pumpkin-host");
    var pumpkin = make("button", "xfd-pumpkin xfd-pumpkin--" + portal.corner);
    pumpkin.type = "button";
    pumpkin.textContent = "🎃";
    pumpkin.setAttribute("aria-label", "Hidden pumpkin");
    pumpkin.addEventListener("click", function () {
      var s = load();
      s.found = Array.isArray(s.found) ? s.found : [];
      if (s.found.indexOf(portal.key) === -1) s.found.push(portal.key);
      save(s);
      pumpkin.disabled = true;
      pumpkin.classList.add("is-found");
      setTimeout(function () { pumpkin.remove(); }, 650);
      if (s.found.length >= PORTALS.length) {
        renderHuntButton();
        setTimeout(openPrize, 500);
      } else {
        renderHuntButton("Found one! " + s.found.length + " / " + PORTALS.length);
      }
    });
    host.appendChild(pumpkin);
  }

  function renderHuntButton(flash) {
    var have = found();
    var done = have.length >= PORTALS.length;
    var old = document.querySelector(".xfd-hunt");
    if (old) old.remove();
    var button = make("button", "xfd-hunt");
    button.type = "button";
    var label = done ? "🎃 Wallpaper unlocked" : "🎃 Pumpkin Hunt · " + have.length + " / " + PORTALS.length;
    button.textContent = flash ? "🎃 " + flash : label;
    if (flash) {
      button.classList.add("is-flash");
      setTimeout(function () {
        button.textContent = label;
        button.classList.remove("is-flash");
      }, 2600);
    }
    button.addEventListener("click", done ? openPrize : openRules);
    document.body.appendChild(button);
  }
})();
