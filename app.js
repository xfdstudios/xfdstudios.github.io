const fallbackFeed = [
  {
    title: "Jade Cargill Was Fighting for Her Life Mid-Match",
    date: "Jun 14, 2026",
    platform: "youtube",
    portal: "wrestling",
    type: "video",
    url: "https://www.youtube.com/shorts/e7mKx7nxLw0",
    thumbnail: "https://i2.ytimg.com/vi/e7mKx7nxLw0/hqdefault.jpg"
  },
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
    title: "Ringside reaction: chaos, timing, and the finish",
    date: "Jun 12, 2026",
    platform: "instagram",
    portal: "wrestling",
    type: "photo",
    url: "https://www.instagram.com/xenofinaldawn/",
    thumbnail: "https://i3.ytimg.com/vi/VKSfvJUTv4w/hqdefault.jpg"
  },
  {
    title: "Horror watchlist update from the XFD zone",
    date: "Jun 8, 2026",
    platform: "facebook",
    portal: "horror",
    type: "post",
    url: "https://www.facebook.com/XFDTV/",
    thumbnail: "https://i4.ytimg.com/vi/wooEz2_Gn-U/hqdefault.jpg"
  },
  {
    title: "Before gaming got scammed",
    date: "May 16, 2026",
    platform: "threads",
    portal: "tech",
    type: "thread",
    url: "https://www.threads.com/@xenofinaldawn",
    thumbnail: "https://i2.ytimg.com/vi/UY0bomzPkU8/hqdefault.jpg"
  }
];

const rail = document.querySelector("#video-rail");
const searchInput = document.querySelector("#portal-search");
const filterControls = document.querySelector(".filter-controls");
const filterLinks = Array.from(document.querySelectorAll("[data-filter-link]"));
const emptyState = document.querySelector("#empty-state");
const ideaGrid = document.querySelector("#idea-grid");
let socialFeed = fallbackFeed;
let articles = [];
let activeFilter = "all";

const hubOrder = ["horror", "anime", "wrestling", "tech", "popculture"];

const hubInfo = {
  horror: { label: "Horror", icon: "fa-skull" },
  anime: { label: "Anime", icon: "fa-eye" },
  wrestling: { label: "Wrestling", icon: "fa-trophy" },
  tech: { label: "Tech/Gaming", icon: "fa-gamepad" },
  popculture: { label: "Pop Culture", icon: "fa-icons" }
};

function getVideoId(url) {
  if (!url) return null;
  const parts = url.split("/");
  return parts[parts.length - 1].split("?")[0];
}

function teaser(text, maxLength = 180) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

const platformOrder = [
  "youtube",
  "tiktok",
  "instagram",
  "facebook",
  "threads",
  "discord",
  "fourthwall",
  "pinterest"
];

function label(value) {
  const labels = {
    discord: "Discord",
    facebook: "Facebook",
    fourthwall: "Fourthwall",
    instagram: "Instagram",
    pinterest: "Pinterest",
    tech: "Tech/Gaming",
    threads: "Threads",
    tiktok: "TikTok",
    wrestling: "Wrestling",
    youtube: "YouTube"
  };
  return labels[value] || value;
}

function filterButtons() {
  return Array.from(document.querySelectorAll("[data-filter]"));
}

function syncPlatformFilters() {
  const availablePlatforms = new Set(socialFeed.map((item) => item.platform));
  const existingFilters = new Set(filterButtons().map((button) => button.dataset.filter));

  platformOrder.forEach((platform) => {
    if (!availablePlatforms.has(platform) || existingFilters.has(platform)) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.filter = platform;
    button.textContent = label(platform);
    filterControls.append(button);
  });
}

function socialCard(item) {
  return `
    <article class="media-card" data-category="${item.portal}" data-platform="${item.platform}">
      <span class="tag">${label(item.platform)}</span>
      <a href="${item.url}">
        <img src="${item.thumbnail}" alt="${item.title} thumbnail">
        <div class="content">
          <div class="meta-line">
            <span>${label(item.portal)}</span>
            <span>${item.type}</span>
          </div>
          <h3>${item.title}</h3>
          <p>${item.date}</p>
        </div>
      </a>
    </article>
  `;
}

function renderFeed() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = socialFeed.filter((item) => {
    const matchesFilter = activeFilter === "all" || item.platform === activeFilter;
    const searchable = `${item.title} ${item.platform} ${item.portal} ${item.type} ${item.date}`.toLowerCase();
    return matchesFilter && searchable.includes(query);
  });

  rail.innerHTML = filtered.map(socialCard).join("");
  emptyState.hidden = filtered.length > 0;
}

function updateDiscover() {
  const latestVideo =
    socialFeed.find((item) => item.platform === "youtube") ||
    socialFeed.find((item) => item.type === "video") ||
    socialFeed[0];
  const latestDesign = socialFeed.find((item) => item.type === "design");
  const discoverItems = Array.from(document.querySelectorAll(".discover-feed a"));

  if (latestVideo && discoverItems[0]) {
    discoverItems[0].href = latestVideo.url;
    discoverItems[0].querySelector("strong").textContent = latestVideo.title;
  }

  if (latestDesign && discoverItems[1]) {
    discoverItems[1].href = latestDesign.url;
    discoverItems[1].querySelector("strong").textContent = latestDesign.title;
  }

  if (!latestVideo) return;

  const heroBanner = document.querySelector(".hero-banner");
  if (heroBanner && latestVideo.thumbnail) {
    const heroImage = latestVideo.thumbnail.replace("/hqdefault.jpg", "/maxresdefault.jpg");
    heroBanner.style.setProperty("--hero-banner-image", `url('${heroImage}')`);
  }

  const latestPanel = document.querySelector(".latest-video-panel");
  if (latestPanel) {
    latestPanel.href = latestVideo.url;
    if (latestVideo.thumbnail) {
      latestPanel.style.backgroundImage =
        `linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.78)), url('${latestVideo.thumbnail}')`;
    }
    const title = latestPanel.querySelector(".latest-video-copy strong");
    const meta = latestPanel.querySelector(".latest-video-copy small");
    if (title) title.textContent = latestVideo.title;
    if (meta) meta.textContent = `Latest upload // ${latestVideo.date}`;
  }

  updateFeaturedDrop(latestVideo);
}

function updateFeaturedDrop(latestVideo) {
  const blurb = document.querySelector("#featured-drop-blurb");
  if (!blurb) return;

  const videoId = getVideoId(latestVideo.url);
  const matchedArticle = articles.find((article) => {
    if (article._draft || !(article.summary || article.body)) return false;
    return article.videoUrl && getVideoId(article.videoUrl) === videoId;
  });

  if (matchedArticle) {
    blurb.textContent = matchedArticle.summary || teaser(matchedArticle.body, 320);
  } else {
    blurb.textContent =
      `New from XFD: "${latestVideo.title}." Catch the full watch, then dig into Horror, Anime, ` +
      `Wrestling, Tech/Gaming, or Pop Culture for the write-ups behind it.`;
  }
}

function ideaCard(portal, article) {
  const info = hubInfo[portal];
  return `
    <a class="channel-card ${portal}" href="article.html?id=${article.id}">
      <span>// ${article.type || "entry"}: ${article.date}</span>
      <div class="channel-icon" aria-hidden="true"><i class="fa-solid ${info.icon}"></i></div>
      <h3>${article.title}</h3>
      <p>${teaser(article.summary || article.body)}</p>
      <b>Read more</b>
    </a>
  `;
}

function renderIdeaGrid() {
  if (!ideaGrid) return;

  const cards = hubOrder
    .map((portal) => {
      const latest = articles
        .filter((a) => a.portal === portal && !a._draft && (a.summary || a.body))
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return latest ? ideaCard(portal, latest) : "";
    })
    .filter(Boolean);

  if (cards.length) {
    ideaGrid.innerHTML = cards.join("");
  }
}

async function loadArticles() {
  try {
    const response = await fetch("articles.json");
    if (!response.ok) throw new Error("Articles unavailable");
    articles = await response.json();
  } catch (error) {
    articles = [];
  }

  renderIdeaGrid();
  updateFeaturedDrop(
    socialFeed.find((item) => item.platform === "youtube") ||
      socialFeed.find((item) => item.type === "video") ||
      socialFeed[0]
  );
}

async function loadSocialFeed() {
  try {
    const response = await fetch("social-feed.json");
    if (!response.ok) throw new Error("Social feed unavailable");
    socialFeed = await response.json();
  } catch (error) {
    socialFeed = fallbackFeed;
  }

  syncPlatformFilters();
  updateDiscover();
  renderFeed();
}

filterControls.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  filterButtons().forEach((item) => item.classList.toggle("active", item === button));
  renderFeed();
});

filterLinks.forEach((link) => {
  link.addEventListener("click", () => {
    activeFilter = "all";
    filterButtons().forEach((item) => item.classList.toggle("active", item.dataset.filter === "all"));
    searchInput.value = link.dataset.filterLink;
    renderFeed();
  });
});

document.querySelector(".rail-button.prev").addEventListener("click", () => {
  rail.scrollBy({ left: -360, behavior: "smooth" });
});

document.querySelector(".rail-button.next").addEventListener("click", () => {
  rail.scrollBy({ left: 360, behavior: "smooth" });
});

searchInput.addEventListener("input", renderFeed);

loadSocialFeed();
loadArticles();
