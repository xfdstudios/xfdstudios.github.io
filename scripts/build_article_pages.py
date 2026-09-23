#!/usr/bin/env python3
"""Build a static, crawlable page for every article in articles.json.

article.html renders articles in the browser from articles.json, so search
engines only see an empty template that every article shares. This script
writes articles/<id>.html for each article with the title, description,
canonical URL, social tags and structured data (Article, VideoObject,
BreadcrumbList, FAQPage) in the HTML itself, plus the rendered body. It
also writes each portal page's headline and article list into its HTML
(portal-page.js used to be the only thing that filled them in) and
regenerates sitemap.xml so every article is listed.

Run it after editing articles.json:
    python3 scripts/build_article_pages.py
The "Build article pages" GitHub Action also runs it on every push that
touches articles.json, article.html, portal-page.js or this script.
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://xfdstudios.github.io"
TEMPLATE = ROOT / "article.html"
ARTICLES = ROOT / "articles.json"
OUT_DIR = ROOT / "articles"
SITEMAP = ROOT / "sitemap.xml"

PORTALS = {
    "horror": ("Horror", "horror.html"),
    "anime": ("Anime & Manga", "anime.html"),
    "wrestling": ("Wrestling", "wrestling.html"),
    "tech": ("Gaming & Tech", "tech-gaming.html"),
    "popculture": ("Pop Culture", "popculture.html"),
}
THREADS_PROFILE = "https://www.threads.com/@xenofinaldawn"
YOUTUBE_CHANNEL = "https://www.youtube.com/@Xenofinaldawn"
ORGANIZATION = {
    "@type": "Organization",
    "@id": f"{SITE}/#organization",
    "name": "XFD Studios",
    "alternateName": "Xeno Final Dawn",
    "url": f"{SITE}/",
    "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/xeno-final-dawn-logo.png"},
}
# Top-level pages for the sitemap, with the portal whose newest article
# decides their lastmod (None = site-wide newest, "" = no lastmod).
STATIC_PAGES = [
    ("", None),
    ("horror.html", "horror"),
    ("anime.html", "anime"),
    ("wrestling.html", "wrestling"),
    ("tech-gaming.html", "tech"),
    ("popculture.html", "popculture"),
    ("designs.html", ""),
    ("about.html", ""),
    ("contact.html", ""),
]

HEADING = re.compile(r"^#{2,3}\s+")
BULLET = re.compile(r"^[-*]\s+")
LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
OLD_ARTICLE_LINK = re.compile(r"^article\.html\?id=([a-z0-9-]+)$")
VIDEO_ID = re.compile(r"(?:shorts/|v=|youtu\.be/|embed/)([A-Za-z0-9_-]{11})")
TRAILING_HASHTAGS = re.compile(r"(?:\s*#\w+)+\s*$")


# ── Body rendering: a port of the renderer in article.html ────────────────

def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def attr(s: str) -> str:
    """Escape for a double-quoted attribute (apostrophes stay readable)."""
    return esc(s).replace('"', "&quot;")


def safe_href(href: str) -> bool:
    return not re.search(r"[\"'<>]", href) and (
        bool(re.match(r"^https?://", href)) or ":" not in href
    )


def inline(s: str) -> str:
    def link(m: re.Match) -> str:
        label, href = m.group(1), m.group(2)
        if not safe_href(href):
            return m.group(0)
        # Old-style links point straight at the static page instead of
        # bouncing through article.html's redirect.
        old = OLD_ARTICLE_LINK.match(href)
        if old:
            href = f"articles/{old.group(1)}.html"
        external = href.startswith(("http://", "https://"))
        extra = ' target="_blank" rel="noopener"' if external else ""
        return f'<a href="{href}"{extra}>{label}</a>'

    return LINK.sub(link, esc(s))


def render_block(block: str) -> str:
    lines = [ln.strip() for ln in block.split("\n") if ln.strip()]
    if not any(HEADING.match(ln) or BULLET.match(ln) for ln in lines):
        return f"<p>{inline(block).replace(chr(10), '<br>')}</p>"
    out: list[str] = []
    items: list[str] = []
    para: list[str] = []

    def flush_list() -> None:
        if items:
            out.append("<ul>" + "".join(f"<li>{inline(i)}</li>" for i in items) + "</ul>")
            items.clear()

    def flush_para() -> None:
        if para:
            out.append("<p>" + "<br>".join(inline(p) for p in para) + "</p>")
            para.clear()

    for ln in lines:
        if HEADING.match(ln):
            flush_list()
            flush_para()
            out.append(f"<h2>{esc(HEADING.sub('', ln))}</h2>")
        elif BULLET.match(ln):
            flush_para()
            items.append(BULLET.sub("", ln))
        else:
            flush_list()
            para.append(ln)
    flush_list()
    flush_para()
    return "".join(out)


def render_body(text: str) -> str:
    text = text.strip()
    splitter = r"\n\s*\n" if re.search(r"\n\s*\n", text) else r"\n+"
    blocks = [b.strip() for b in re.split(splitter, text) if b.strip()]
    rendered = "\n".join(render_block(b) for b in blocks)
    return re.sub(r"</ul>\n?<ul>", "", rendered)


# ── Text helpers ──────────────────────────────────────────────────────────

def plain(text: str) -> str:
    """Body/summary markup flattened to one line of plain text."""
    text = LINK.sub(r"\1", text or "")
    lines = [BULLET.sub("", HEADING.sub("", ln.strip())) for ln in text.splitlines()]
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:—–- ") + "…"


def seo_title(title: str) -> str:
    return TRAILING_HASHTAGS.sub("", title).strip() or title


def description(a: dict) -> str:
    src = plain(a.get("summary", "")) or plain(a.get("body", "")) or a["title"]
    return clip(TRAILING_HASHTAGS.sub("", src).strip(), 158)


def absolute(url: str) -> str:
    return url if url.startswith(("http://", "https://")) else f"{SITE}/{url.lstrip('/')}"


def pretty_date(iso: str) -> str:
    d = date.fromisoformat(iso)
    return f"{d:%b} {d.day}, {d.year}"


def quick_answers(body: str) -> list[tuple[str, str]]:
    """Question/answer pairs from a '## Quick answers' section, if any."""
    m = re.search(r"^##\s+Quick answers\s*$(.*?)(?=^##\s|\Z)", body or "", re.M | re.S | re.I)
    if not m:
        return []
    pairs = []
    for block in re.split(r"\n\s*\n", m.group(1).strip()):
        q, sep, a = block.strip().partition("? ")
        if sep and q and a:
            pairs.append((plain(q) + "?", plain(a)))
    return pairs


# ── Page building ─────────────────────────────────────────────────────────

def structured_data(a: dict, canonical: str, title: str, desc: str, image: str,
                    portal: tuple[str, str], video_id: str | None) -> str:
    label, href = portal
    graph: list[dict] = [
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": label, "item": f"{SITE}/{href}"},
                {"@type": "ListItem", "position": 3, "name": title, "item": canonical},
            ],
        },
        {
            "@type": "Article",
            "@id": f"{canonical}#article",
            "headline": clip(title, 110),
            "description": desc,
            "image": [image],
            "datePublished": a["date"],
            "dateModified": a["date"],
            "inLanguage": "en-US",
            "articleSection": label,
            "author": {"@type": "Person", "name": "XenoFinalDawn", "url": YOUTUBE_CHANNEL},
            "publisher": ORGANIZATION,
            "mainEntityOfPage": canonical,
        },
    ]
    if video_id:
        graph[1]["video"] = {"@id": f"{canonical}#video"}
        graph.append({
            "@type": "VideoObject",
            "@id": f"{canonical}#video",
            "name": title,
            "description": plain(a.get("summary", "")) or desc,
            "thumbnailUrl": [image],
            "uploadDate": a["date"],
            "embedUrl": f"https://www.youtube.com/embed/{video_id}",
            "url": a["videoUrl"],
            "publisher": {"@id": ORGANIZATION["@id"]},
        })
    faq = quick_answers(a.get("body", ""))
    if faq:
        graph.append({
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": q,
                 "acceptedAnswer": {"@type": "Answer", "text": ans}}
                for q, ans in faq
            ],
        })
    data = json.dumps({"@context": "https://schema.org", "@graph": graph},
                      ensure_ascii=False, indent=2)
    return data.replace("</", "<\\/")


def head_meta(a: dict, canonical: str, title: str, desc: str, image: str,
              portal: tuple[str, str], video_id: str | None) -> str:
    img_size = ""
    if "i.ytimg.com" in image and "hqdefault" in image:
        img_size = ('    <meta property="og:image:width" content="480">\n'
                    '    <meta property="og:image:height" content="360">\n')
    t, d, i, c = attr(title), attr(desc), attr(image), attr(canonical)
    ld = structured_data(a, canonical, title, desc, image, portal, video_id)
    return (
        "    <!-- Primary meta (generated by scripts/build_article_pages.py) -->\n"
        f"    <title>{t} | XFD Studios</title>\n"
        f'    <meta name="description" content="{d}">\n'
        f'    <link rel="canonical" href="{c}">\n'
        '    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">\n'
        "\n"
        "    <!-- Open Graph (link previews on Facebook, Instagram, Discord, iMessage, etc.) -->\n"
        '    <meta property="og:type" content="article">\n'
        '    <meta property="og:site_name" content="XFD Studios">\n'
        f'    <meta property="og:title" content="{t}">\n'
        f'    <meta property="og:description" content="{d}">\n'
        f'    <meta property="og:url" content="{c}">\n'
        f'    <meta property="og:image" content="{i}">\n'
        f"{img_size}"
        f'    <meta property="og:image:alt" content="{t}">\n'
        f'    <meta property="article:published_time" content="{a["date"]}">\n'
        f'    <meta property="article:section" content="{attr(portal[0])}">\n'
        "\n"
        "    <!-- Twitter/X card -->\n"
        '    <meta name="twitter:card" content="summary_large_image">\n'
        f'    <meta name="twitter:title" content="{t}">\n'
        f'    <meta name="twitter:description" content="{d}">\n'
        f'    <meta name="twitter:image" content="{i}">\n'
        "\n"
        f'    <script type="application/ld+json">\n{ld}\n    </script>\n'
        "\n"
    )


def main_content(a: dict, portal: tuple[str, str], video_id: str | None) -> str:
    label, href = portal
    title = attr(a["title"])
    if video_id:
        media = (
            '        <div class="article-video-wrap" id="article-video-wrap">\n'
            "          <iframe\n"
            '            id="article-video-frame"\n'
            f'            src="https://www.youtube.com/embed/{video_id}?rel=0"\n'
            f'            title="{title}"\n'
            "            allowfullscreen\n"
            '            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"\n'
            "          ></iframe>\n"
            "        </div>\n\n"
            f'        <a class="article-watch-btn" id="article-watch-link" href="{attr(a["videoUrl"])}" target="_blank" rel="noopener">\n'
            '          <i class="fa-brands fa-youtube" aria-hidden="true"></i>\n'
            "          Watch on YouTube\n"
            "        </a>\n"
        )
    else:
        media = (
            f'        <a class="article-thread-btn" id="article-thread-link" href="{attr(a.get("threadsUrl") or THREADS_PROFILE)}" target="_blank" rel="noopener">\n'
            '          <i class="fa-brands fa-threads" aria-hidden="true"></i>\n'
            "          Read more on Threads\n"
            "        </a>\n"
        )
    body = render_body(a.get("body") or a.get("summary") or "")
    return (
        '<main class="article-main">\n'
        f'      <a class="article-back" id="article-back-link" href="{href}">\n'
        '        <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>\n'
        f'        <span id="article-back-label">Back to {esc(label)}</span>\n'
        "      </a>\n\n"
        "      <article>\n"
        '        <div class="article-head">\n'
        f'          <p class="eyebrow" id="article-portal-label">{esc(label)}</p>\n'
        f'          <h1 id="article-title">{esc(a["title"])}</h1>\n'
        f'          <p class="meta" id="article-meta">{esc(a["type"])} // <time datetime="{a["date"]}">{pretty_date(a["date"])}</time></p>\n'
        "        </div>\n\n"
        f"{media}\n"
        '        <div class="article-body" id="article-body">\n'
        f"{body}\n"
        "        </div>\n"
        "      </article>\n"
        "    </main>"
    )


def build_page(template: str, a: dict) -> str:
    portal = PORTALS.get(a["portal"], ("XFD", "index.html"))
    canonical = f"{SITE}/articles/{a['id']}.html"
    title = seo_title(a["title"])
    desc = description(a)
    image = absolute(a.get("image") or "assets/og-card.png")
    m = VIDEO_ID.search(a.get("videoUrl") or "")
    video_id = m.group(1) if m else None

    page = template
    # Pages live in /articles/, so resolve every relative URL (styles,
    # scripts, nav links, body links) from the site root.
    page = replace_once(page, r'(<meta name="viewport"[^>]*>\n)', r'\1    <base href="/">\n')
    page = replace_once(
        page,
        r'    <!-- Primary meta -->.*?(?=    <link rel="stylesheet" href="https://cdnjs)',
        lambda _: head_meta(a, canonical, title, desc, image, portal, video_id),
    )
    page = replace_once(page, r'<main class="article-main">.*?</main>',
                        lambda _: main_content(a, portal, video_id))
    # The browser-side loader isn't needed: the content is already here.
    page = replace_once(page, r'    <script>\s*const portalInfo.*?</script>\n', "")
    return page


def replace_once(text: str, pattern: str, repl) -> str:
    new, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"article.html template changed; pattern not found: {pattern[:60]}")
    return new


def portal_copy() -> dict[str, tuple[str, str]]:
    """Portal label + tagline, read from portal-page.js so there's one source."""
    js = (ROOT / "portal-page.js").read_text(encoding="utf-8")
    found = {
        m.group(1): (m.group(2), m.group(3))
        for m in re.finditer(
            r'(\w+):\s*\{[^{}]*?label:\s*"([^"]*)"[^{}]*?tagline:\s*"([^"]*)"', js)
    }
    missing = set(PORTALS) - set(found)
    if missing:
        raise SystemExit(f"portal-page.js: no label/tagline found for {sorted(missing)}")
    return found


def story_card(a: dict) -> str:
    # Same markup portal-page.js renders, so the page looks identical before
    # and after the script runs.
    return (
        f'          <a class="story-card" id="{a["id"]}" href="articles/{a["id"]}.html">\n'
        f'            <img src="{attr(a.get("image") or "")}" alt="{attr(a["title"])}">\n'
        "            <div>\n"
        f'              <span>{esc(a["type"])} // {pretty_date(a["date"])}</span>\n'
        f'              <h2>{esc(a["title"])}</h2>\n'
        f'              <p>{esc(a.get("summary") or "")}</p>\n'
        "            </div>\n"
        "          </a>"
    )


def archive_item(a: dict) -> str:
    return (
        "            <li>\n"
        f'              <a href="articles/{a["id"]}.html">\n'
        f'                <span>{pretty_date(a["date"])}</span>\n'
        f'                <strong>{esc(a["title"])}</strong>\n'
        "              </a>\n"
        "            </li>"
    )


def fill(page: str, open_tag: str, close_tag: str, content: str, indent: str) -> str:
    """Put generated content inside a container, between build markers."""
    pattern = re.escape(open_tag) + r"(?:<!-- built:start -->.*?<!-- built:end -->)?" + re.escape(close_tag)
    block = f"{open_tag}<!-- built:start -->\n{content}\n{indent}<!-- built:end -->{close_tag}"
    return replace_once(page, pattern, lambda _: block)


def build_portal_page(key: str, articles: list[dict], copy: tuple[str, str]) -> str:
    label, tagline = copy
    path = ROOT / PORTALS[key][1]
    page = path.read_text(encoding="utf-8")
    page = replace_once(page, r'<p class="eyebrow" id="portal-label">.*?</p>',
                        lambda _: f'<p class="eyebrow" id="portal-label">{esc(label)}</p>')
    page = replace_once(page, r'<h1 id="portal-title">.*?</h1>',
                        lambda _: f'<h1 id="portal-title">{esc(label)} Portal</h1>')
    page = replace_once(page, r'<p id="portal-tagline">.*?</p>',
                        lambda _: f'<p id="portal-tagline">{esc(tagline)}</p>')

    stories = sorted((a for a in articles if a["portal"] == key),
                     key=lambda a: a["date"], reverse=True)
    latest = "\n".join(story_card(a) for a in stories) or "          <p>No stories yet.</p>"
    archive = "\n".join(archive_item(a) for a in stories[1:]) or "            <li>No archived stories yet.</li>"
    page = fill(page, '<div id="latest-stories" class="story-grid">', "</div>", latest, "          ")
    page = fill(page, '<ul id="archive-stories">', "</ul>", archive, "          ")
    path.write_text(page, encoding="utf-8")
    return path.name


def build_sitemap(articles: list[dict]) -> str:
    newest = max(a["date"] for a in articles)
    by_portal: dict[str, str] = {}
    for a in articles:
        by_portal[a["portal"]] = max(by_portal.get(a["portal"], ""), a["date"])
    rows = []
    for page, portal in STATIC_PAGES:
        lastmod = newest if portal is None else by_portal.get(portal, "") if portal else ""
        tag = f"<lastmod>{lastmod}</lastmod>" if lastmod else ""
        rows.append(f"  <url><loc>{SITE}/{page}</loc>{tag}</url>")
    for a in sorted(articles, key=lambda a: (a["date"], a["id"]), reverse=True):
        rows.append(f"  <url><loc>{SITE}/articles/{a['id']}.html</loc><lastmod>{a['date']}</lastmod></url>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "\n".join(rows) + "\n</urlset>\n")


def main() -> None:
    template = TEMPLATE.read_text(encoding="utf-8")
    articles = json.loads(ARTICLES.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(exist_ok=True)

    wanted = set()
    for a in articles:
        path = OUT_DIR / f"{a['id']}.html"
        path.write_text(build_page(template, a), encoding="utf-8")
        wanted.add(path.name)
    # Drop pages for articles that were removed from articles.json.
    for stale in OUT_DIR.glob("*.html"):
        if stale.name not in wanted:
            stale.unlink()

    copy = portal_copy()
    portals = [build_portal_page(key, articles, copy[key]) for key in PORTALS]

    SITEMAP.write_text(build_sitemap(articles), encoding="utf-8")
    print(f"built {len(wanted)} article pages, filled {len(portals)} portal pages, "
          f"wrote sitemap.xml ({len(wanted) + len(STATIC_PAGES)} URLs)")


if __name__ == "__main__":
    main()
