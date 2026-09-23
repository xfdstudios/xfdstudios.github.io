/* XFD homepage: hero slideshow of the latest videos + one deduped feed.
   Dedupe works two ways:
   1) canonical video id — pulled from the link OR the thumbnail, so the
      same video posted on YouTube/Threads/Instagram/Facebook collapses
      into one card (articles win, then YouTube, then other platforms);
   2) fuzzy title match — titles that are ~75%+ identical (or where one
      is a prefix of the other) are treated as the same content. */

const fallbackFeed = [
  {
    title: "XFD Weekly Finale Boss: Round 001",
    date: "Jun 9, 2026",
    platform: "youtube",
    portal: "anime",
    type: "video",
    url: "https://www.youtube.com/shorts/vpBdZ3I8KCo",
    thumbnail: "https://i3.ytimg.com/vi/vpBdZ3I8KCo/hqdefault.jpg"
  },
  {
    title: "Toxic Pokemon Mains Exposed",
    date: "Jun 4, 2026",
    platform: "tiktok",
    portal: "tech",
    type: "short",
    url: "https://www.tiktok.com/@xenofinaldawn",
    thumbnail: "https://i1.ytimg.com/vi/lI6RkRICVBc/hqdefault.jpg"
  },
  {
    title: "Horror watchlist update from the XFD zone",
    date: "Jun 8, 2026",
    platform: "facebook",
    portal: "horror",
    type: "post",
    url: "https://www.facebook.com/XFDTV/",
    thumbnail: "https://i4.ytimg.com/vi/wooEz2_Gn-U/hqdefault.jpg"
  }
];

const FEED_MAX = 6;

const feedGrid = document.querySelector("#feed-grid");
const searchInput = document.querySelector("#portal-search");
const filterControls = document.querySelector(".filter-controls");
const emptyState = document.querySelector("#empty-state");

let socialFeed = fallbackFeed;
let articles = [];
let feedItems = [];
let activeFilter = "all";

const categoryLabels = {
  all: "XFD",
  horror: "Horror",
  anime: "Anime & Manga",
  wrestling: "Wrestling",
  tech: "Gaming & Tech",
  popculture: "Pop Culture"
};

function categoryLabel(value) {
  return categoryLabels[value] || value;
}

/* ── Dedupe helpers ───────────────────────────────────────────── */

function getVideoId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:shorts\/|v=|youtu\.be\/|embed\/|\/vi\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* Same video id from the link or the thumbnail image. */
function canonicalId(urlValue, thumbnailValue) {
  return getVideoId(urlValue) || getVideoId(thumbnailValue);
}

function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/* True when titles are effectively the same content: one contains the
   other from the start, or their word overlap (Dice) is >= 0.75. */
function similarTitles(a, b) {
  const ta = normalizeTitle(a);
  const tb = normalizeTitle(b);
  if (!ta.length || !tb.length) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.length >= 3 && long.slice(0, short.length).join(" ") === short.join(" ")) return true;
  const setB = new Set(tb);
  const shared = ta.filter((w) => setB.has(w)).length;
  return (2 * shared) / (ta.length + tb.length) >= 0.75;
}

function sourceRank(item) {
  if (item.kind === "article") return 0;
  if (item.platform === "youtube") return 1;
  return 2;
}

function parseWhen(value) {
  // A bare "YYYY-MM-DD" parses as UTC midnight, which is still the previous
  // day in US time zones. Read it as local midnight, like article.html does.
  const s = String(value || "");
  const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s);
  return Number.isNaN(t) ? 0 : t;
}

function displayDate(value) {
  const t = parseWhen(value);
  if (!t) return value || "";
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── Unified feed ─────────────────────────────────────────────── */

function buildFeedItems() {
  const candidates = [];

  articles.forEach((a) => {
    candidates.push({
      kind: "article",
      platform: "article",
      category: a.portal,
      meta: a.type || "article",
      title: a.title,
      date: a.date,
      image: a.image || "assets/xeno-final-dawn-logo.png",
      url: `article.html?id=${a.id}`,
      videoKey: canonicalId(a.videoUrl, a.image),
      search: `${a.title} ${a.summary || ""} ${a.body || ""}`.toLowerCase()
    });
  });

  socialFeed.forEach((item) => {
    candidates.push({
      kind: "social",
      platform: item.platform,
      category: item.portal || "all",
      meta: item.type || "post",
      title: item.title,
      date: item.date,
      image: item.thumbnail || "assets/xeno-final-dawn-logo.png",
      url: item.url,
      videoKey: canonicalId(item.url, item.thumbnail),
      search: `${item.title} ${item.platform} ${item.type || ""}`.toLowerCase()
    });
  });

  /* Best-first, so the keeper of each duplicate group is the richest. */
  candidates.sort((a, b) => sourceRank(a) - sourceRank(b) || parseWhen(b.date) - parseWhen(a.date));

  const kept = [];
  for (const item of candidates) {
    const dupe = kept.find(
      (k) =>
        (item.videoKey && k.videoKey && item.videoKey === k.videoKey) ||
        similarTitles(item.title, k.title)
    );
    if (dupe) {
      /* A social post can carry a more specific category than "all". */
      if (dupe.category === "all" && item.category !== "all") dupe.category = item.category;
      continue;
    }
    kept.push(item);
  }

  feedItems = kept.sort((a, b) => parseWhen(b.date) - parseWhen(a.date));
}

function feedCard(item) {
  return `
    <article class="media-card" data-category="${item.category}">
      <span class="tag">${categoryLabel(item.category)}</span>
      <a href="${item.url}">
        <img src="${item.image}" alt="${item.title} thumbnail" loading="lazy">
        <div class="content">
          <div class="meta-line">
            <span>${categoryLabel(item.category)}</span>
            <span>${item.meta}</span>
          </div>
          <h3>${item.title}</h3>
          <p>${displayDate(item.date)}</p>
        </div>
      </a>
    </article>
  `;
}

function renderFeed() {
  if (!feedGrid) return;
  const filtered = feedItems.filter((item) => activeFilter === "all" || item.category === activeFilter);
  feedGrid.innerHTML = filtered.slice(0, FEED_MAX).map(feedCard).join("");
  if (emptyState) emptyState.hidden = filtered.length > 0;
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll(".filter-controls [data-filter]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderFeed();
}

/* ── Hero slideshow ───────────────────────────────────────────── */

let heroItems = [];
let heroIndex = 0;
let heroTimer = null;

function buildHeroItems() {
  const cfg = window.XFD_FEATURED || {};
  const max = cfg.heroMax || 5;

  const videos = [];
  const seen = new Set();
  for (const item of socialFeed) {
    const key = canonicalId(item.url, item.thumbnail) || item.title;
    if (seen.has(key)) continue;
    if (!item.thumbnail) continue;
    seen.add(key);
    videos.push({
      title: item.title,
      url: item.url,
      date: item.date,
      platform: item.platform,
      thumbnail: item.thumbnail,
      heroImage: (item.thumbnail || "").replace("/hqdefault.jpg", "/maxresdefault.jpg")
    });
    if (videos.length >= max) break;
  }

  if (cfg.videoId) {
    videos.unshift({
      title: cfg.title || "Featured from XFD",
      url: cfg.url || `https://www.youtube.com/watch?v=${cfg.videoId}`,
      date: "",
      platform: "youtube",
      thumbnail: `https://i.ytimg.com/vi/${cfg.videoId}/hqdefault.jpg`,
      heroImage: `https://i.ytimg.com/vi/${cfg.videoId}/maxresdefault.jpg`
    });
  }

  heroItems = videos.slice(0, max);
}

function renderHeroSlide() {
  if (!heroItems.length) return;
  heroIndex = ((heroIndex % heroItems.length) + heroItems.length) % heroItems.length;
  const item = heroItems[heroIndex];

  const heroTitle = document.querySelector("#hero-title");
  if (heroTitle) heroTitle.textContent = item.title;

  const meta = document.querySelector("#hero-slide-meta");
  if (meta) meta.textContent = item.date ? `Uploaded // ${displayDate(item.date)}` : "Featured transmission";

  const watchLink = document.querySelector("#featured-watch-link");
  if (watchLink) watchLink.href = item.url;

  const heroBanner = document.querySelector(".hero-banner");
  if (heroBanner && item.heroImage) {
    heroBanner.style.setProperty("--hero-banner-image", `url('${item.heroImage}')`);
  }

  const panel = document.querySelector(".latest-video-panel");
  if (panel) {
    panel.href = item.url;
    panel.style.backgroundImage =
      `linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.78)), url('${item.thumbnail}')`;
    const title = panel.querySelector(".latest-video-copy strong");
    const small = panel.querySelector(".latest-video-copy small");
    if (title) title.textContent = item.title;
    if (small) small.textContent = item.date ? `Now playing // ${displayDate(item.date)}` : "Now playing";
  }

  const count = document.querySelector("#hero-count");
  if (count) count.textContent = `${heroIndex + 1} / ${heroItems.length}`;
}

function heroGo(delta) {
  heroIndex += delta;
  renderHeroSlide();
}

function startHeroAuto() {
  stopHeroAuto();
  if (heroItems.length > 1) heroTimer = setInterval(() => heroGo(1), 6000);
}

function stopHeroAuto() {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = null;
}

/* ── Data loading ─────────────────────────────────────────────── */

async function loadAll() {
  try {
    const response = await fetch("social-feed.json");
    if (!response.ok) throw new Error("Social feed unavailable");
    socialFeed = await response.json();
  } catch (error) {
    socialFeed = fallbackFeed;
  }

  try {
    const response = await fetch("articles.json");
    if (!response.ok) throw new Error("Articles unavailable");
    articles = await response.json();
  } catch (error) {
    articles = [];
  }

  buildFeedItems();
  buildHeroItems();
  renderHeroSlide();
  startHeroAuto();
  renderFeed();
}

/* ── Events ───────────────────────────────────────────────────── */

if (filterControls) {
  filterControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    setFilter(button.dataset.filter);
  });
}


const heroPrev = document.querySelector("#hero-prev");
const heroNext = document.querySelector("#hero-next");
if (heroPrev) heroPrev.addEventListener("click", () => { heroGo(-1); startHeroAuto(); });
if (heroNext) heroNext.addEventListener("click", () => { heroGo(1); startHeroAuto(); });

const heroBannerEl = document.querySelector(".hero-banner");
if (heroBannerEl) {
  heroBannerEl.addEventListener("mouseenter", stopHeroAuto);
  heroBannerEl.addEventListener("mouseleave", startHeroAuto);
}

loadAll();
