const portalInfo = {
  horror: {
    accent: "horror",
    href: "horror.html",
    icon: "fa-skull",
    label: "Horror",
    tagline: "Unknown signals, genre history, and practical effects love."
  },
  anime: {
    accent: "anime",
    href: "anime.html",
    icon: "fa-eye",
    label: "Anime",
    tagline: "Final bosses, power scaling, edits, and visual fire."
  },
  wrestling: {
    accent: "wrestling",
    href: "wrestling.html",
    icon: "fa-trophy",
    label: "Wrestling",
    tagline: "Match energy, roster moments, and ringside commentary."
  },
  tech: {
    accent: "tech",
    href: "tech-gaming.html",
    icon: "fa-gamepad",
    label: "Tech/Gaming",
    tagline: "Retro flags, console talk, gaming culture, and builds."
  },
  popculture: {
    accent: "popculture",
    href: "popculture.html",
    icon: "fa-icons",
    label: "Pop Culture",
    tagline: "Movies, music, celebs, trends, and the moments everyone is talking about."
  }
};

const portal = document.body.dataset.portal;
const info = portalInfo[portal];
const latestList = document.querySelector("#latest-stories");
const archiveList = document.querySelector("#archive-stories");

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function storyCard(story) {
  return `
    <a class="story-card" id="${story.id}" href="article.html?id=${story.id}">
      <img src="${story.image}" alt="${story.title}">
      <div>
        <span>${story.type} // ${formatDate(story.date)}</span>
        <h2>${story.title}</h2>
        <p>${story.summary}</p>
      </div>
    </a>
  `;
}

function archiveItem(story) {
  return `
    <li>
      <a href="article.html?id=${story.id}">
        <span>${formatDate(story.date)}</span>
        <strong>${story.title}</strong>
      </a>
    </li>
  `;
}

function portalLink([key, item], isCurrent = false) {
  return `
    <a class="portal-jump ${item.accent}${isCurrent ? " active" : ""}" href="${item.href}" ${isCurrent ? 'aria-current="page"' : ""}>
      <i class="fa-solid ${item.icon}" aria-hidden="true"></i>
      <span>${item.label}</span>
    </a>
  `;
}

function renderPortalNavigation() {
  const entries = Object.entries(portalInfo);
  const switcher = document.createElement("nav");
  switcher.className = "portal-switcher";
  switcher.setAttribute("aria-label", "Switch portals");
  switcher.innerHTML = entries.map((entry) => portalLink(entry, entry[0] === portal)).join("");

  document.querySelector(".portal-hero").append(switcher);

  const related = entries.filter(([key]) => key !== portal);
  const relatedSection = document.createElement("section");
  relatedSection.className = "related-portals";
  relatedSection.innerHTML = `
    <div class="section-heading">
      <p class="eyebrow">Portal network</p>
      <h2>Explore related portals</h2>
    </div>
    <div class="related-grid">
      ${related
        .map(([key, item]) => `
          <a class="related-card ${item.accent}" href="${item.href}">
            <i class="fa-solid ${item.icon}" aria-hidden="true"></i>
            <span>${item.label}</span>
            <p>${item.tagline}</p>
          </a>
        `)
        .join("")}
    </div>
  `;

  document.querySelector(".portal-main").append(relatedSection);
}

async function loadStories() {
  if (!info) return;

  document.querySelector("#portal-label").textContent = info.label;
  document.querySelector("#portal-title").textContent = `${info.label} Portal`;
  document.querySelector("#portal-tagline").textContent = info.tagline;
  renderPortalNavigation();

  const response = await fetch("articles.json");
  const stories = await response.json();
  const portalStories = stories
    .filter((story) => story.portal === portal)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const latest = portalStories;
  const archive = portalStories.slice(1);

  latestList.innerHTML = latest.map(storyCard).join("") || "<p>No stories yet.</p>";
  archiveList.innerHTML = archive.map(archiveItem).join("") || "<li>No archived stories yet.</li>";
}

loadStories();
