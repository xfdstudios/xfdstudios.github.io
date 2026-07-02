/* XFD homepage: Now Playing hero, character-select portal filter, unified feed.
   The feed merges articles.json (internal write-ups) with social-feed.json
   (platform posts), deduped by YouTube video id. Filtering is plain JS and
   degrades gracefully: portal cards keep real "Enter portal" links. */

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

const feedGrid = document.querySelector("#feed-grid");
const searchInput = document.querySelector("#portal-search");
const filterControls = document.querySelector(".filter-controls");
const portalSelect = document.querySelector("#portal-select");
const recentStrip = document.querySelector("#recent-strip");
const emptyState = document.querySelector("#empty-state");

let socialFeed = fallbackFeed;
let articles = [];
let feedItems = [];
let activeFilter = "all";

const categoryLabels = {
  all: "All",
  horror: "Horror",
  anime: "Anime & Manga",
  wrestling: "Wrestling",
  tech: "Gaming & Tech",
  popculture: "Pop Culture"
};

const platformLabels = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  threads: "Threads",
  discord: "Discord",
  fourthwall: "Fourthwall",
  pinterest: "Pinterest"
};

function label(value) {
  return categoryLabels[value] || platformLabels[value] || value;
}

function getVideoId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function parseWhen(value) {
  const t = Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

function displayDate(value) {
  const t = parseWhen(value);
  if (!t) return value || "";
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* Build one unified list: articles first (richer, internal links), then any
   social posts whose video isn't already covered by an article. */
function buildFeedItems() {
  const articleVideoIds = new Set(
    articles.map((a) => getVideoId(a.videoUrl)).filter(Boolean)
  );

  const articleItems = articles.map((a) => ({
    kind: "article",
    category: a.portal,
    tag: label(a.portal),
    meta: a.type || "article",
    title: a.title,
    date: a.date,
    image: a.image || "assets/NEW%20LOGO.png",
    url: `article.html?id=${a.id}`
  }));

  const socialItems = socialFeed
    .filter((item) => !articleVideoIds.has(getVideoId(item.url)))
    .map((item) => ({
      kind: "social",
      category: item.portal || "all",
      tag: platformLabels[item.platform] || item.platform,
      meta: item.type || "post",
      title: item.title,
      date: item.date,
      image: item.thumbnail || "assets/NEW%20LOGO.png",
      url: item.url
    }));

  feedItems = articleItems.concat(socialItems).sort((a, b) => parseWhen(b.date) - parseWhen(a.date));
}

function feedCard(item) {
  return `
    <article class="media-card" data-category="${item.category}">
      <span class="tag">${item.tag}</span>
      <a href="${item.url}">
        <img src="${item.image}" alt="${item.title} thumbnail" loading="lazy">
        <div class="content">
          <div class="meta-line">
            <span>${label(item.category)}</span>
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
  const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
  const filtered = feedItems.filter((item) => {
    const matchesFilter = activeFilter === "all" || item.category === activeFilter;
    const searchable = `${item.title} ${item.category} ${item.tag} ${item.meta} ${item.date}`.toLowerCase();
    return matchesFilter && searchable.includes(query);
  });

  feedGrid.innerHTML = filtered.map(feedCard).join("");
  if (emptyState) emptyState.hidden = filtered.length > 0;
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll(".filter-controls [data-filter]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  if (portalSelect) {
    portalSelect.querySelectorAll(".channel-card").forEach((card) => {
      const selected = card.dataset.select === filter;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-pressed", String(selected));
    });
  }
  renderFeed();
}

/* ── Now Playing hero ─────────────────────────────────────────── */

function resolveFeatured() {
  const cfg = window.XFD_FEATURED || {};
  const newest =
    socialFeed.find((item) => item.platform === "youtube") ||
    socialFeed.find((item) => item.type === "video") ||
    socialFeed[0];

  if (cfg.videoId) {
    return {
      title: cfg.title || (newest && newest.title) || "Latest from XFD",
      url: cfg.url || `https://www.youtube.com/watch?v=${cfg.videoId}`,
      date: "",
      thumbnail: `https://i.ytimg.com/vi/${cfg.videoId}/hqdefault.jpg`,
      heroImage: `https://i.ytimg.com/vi/${cfg.videoId}/maxresdefault.jpg`
    };
  }
  if (!newest) return null;
  return {
    title: newest.title,
    url: newest.url,
    date: newest.date,
    thumbnail: newest.thumbnail,
    heroImage: (newest.thumbnail || "").replace("/hqdefault.jpg", "/maxresdefault.jpg")
  };
}

function updateHero() {
  const featured = resolveFeatured();
  if (!featured) return;

  const heroTitle = document.querySelector("#hero-title");
  if (heroTitle) heroTitle.textContent = featured.title;

  const watchLink = document.querySelector("#featured-watch-link");
  if (watchLink) watchLink.href = featured.url;

  const heroBanner = document.querySelector(".hero-banner");
  if (heroBanner && featured.heroImage) {
    heroBanner.style.setProperty("--hero-banner-image", `url('${featured.heroImage}')`);
  }

  const panel = document.querySelector(".latest-video-panel");
  if (panel) {
    panel.href = featured.url;
    if (featured.thumbnail) {
      panel.style.backgroundImage =
        `linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.78)), url('${featured.thumbnail}')`;
    }
    const title = panel.querySelector(".latest-video-copy strong");
    const meta = panel.querySelector(".latest-video-copy small");
    if (title) title.textContent = featured.title;
    if (meta) meta.textContent = featured.date ? `Featured // ${displayDate(featured.date)}` : "Featured transmission";
  }

  const blurb = document.querySelector("#featured-drop-blurb");
  if (blurb) {
    const videoId = getVideoId(featured.url);
    const match = articles.find((a) => getVideoId(a.videoUrl) === videoId && (a.summary || a.body));
    if (match) {
      blurb.textContent = match.summary || match.body.slice(0, 300);
    }
  }
}

function updateRecentStrip() {
  if (!recentStrip) return;
  const featured = resolveFeatured();
  const featuredId = featured ? getVideoId(featured.url) : null;
  const recents = feedItems
    .filter((item) => getVideoId(item.url) !== featuredId)
    .slice(0, 3);
  if (!recents.length) return;
  recentStrip.innerHTML = recents
    .map((item) => `
      <a href="${item.url}">
        <span>${item.tag} // ${displayDate(item.date)}</span>
        <strong>${item.title}</strong>
      </a>
    `)
    .join("");
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
  updateHero();
  updateRecentStrip();
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

if (portalSelect) {
  portalSelect.addEventListener("click", (event) => {
    if (event.target.closest(".portal-enter")) return; // real link wins
    const card = event.target.closest(".channel-card");
    if (!card) return;
    const next = card.classList.contains("selected") ? "all" : card.dataset.select;
    setFilter(next);
    document.querySelector("#feed").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  portalSelect.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".channel-card");
    if (!card || event.target.closest(".portal-enter")) return;
    event.preventDefault();
    const next = card.classList.contains("selected") ? "all" : card.dataset.select;
    setFilter(next);
    document.querySelector("#feed").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (searchInput) searchInput.addEventListener("input", renderFeed);

loadAll();
