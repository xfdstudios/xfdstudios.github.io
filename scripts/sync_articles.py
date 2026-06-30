"""Sync new YouTube videos into articles.json as draft entries.

Runs as part of the GitHub Actions workflow. Checks the YouTube RSS feed
for new videos that don't already exist in articles.json. Adds them as
draft entries with portal "tech" (default) so they show up in the admin
form ready to be edited and assigned the right portal.

The human workflow after this runs:
  1. Open xfdstudios.github.io/admin.html
  2. The new entry will already be in articles.json as a draft
  3. Edit the portal, caption, and body text
  4. Commit and push
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

YOUTUBE_CHANNEL_ID = "UCon9odxjxyp_bMh2wkuRbhg"
YOUTUBE_FEED = (
    f"https://www.youtube.com/feeds/videos.xml?channel_id={YOUTUBE_CHANNEL_ID}"
)
MAX_ITEMS     = 20
ARTICLES_PATH = Path(__file__).resolve().parent.parent / "articles.json"


NS = {
    "a":     "http://www.w3.org/2005/Atom",
    "yt":    "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "xfd-feed-bot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text[:60]


def parse_youtube_entries() -> list[dict]:
    raw  = fetch(YOUTUBE_FEED)
    root = ET.fromstring(raw)
    items: list[dict] = []
    for entry in root.findall("a:entry", NS)[:MAX_ITEMS]:
        title    = (entry.findtext("a:title",    default="", namespaces=NS) or "").strip()
        video_id = (entry.findtext("yt:videoId", default="", namespaces=NS) or "").strip()
        link_el  = entry.find("a:link", NS)
        url      = link_el.get("href", "") if link_el is not None else ""
        published = entry.findtext("a:published", default="", namespaces=NS) or ""

        try:
            dt       = datetime.fromisoformat(published.replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d")
        except ValueError:
            date_str = published[:10]

        if not video_id or not title or not url:
            continue

        is_short  = "/shorts/" in url
        video_url = f"https://www.youtube.com/shorts/{video_id}" if is_short else url

        items.append({
            "id":       "tech-" + slugify(title),   # default portal: tech — edit in admin
            "portal":   "tech",                      # CHANGE THIS in admin.html
            "title":    title,
            "date":     date_str,
            "summary":  "",                          # ADD caption in admin.html
            "type":     "short" if is_short else "video",
            "image":    f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "videoUrl": video_url,
            "body":     "",                          # ADD your thoughts in admin.html
            "_draft":   True,                        # marks it as auto-imported draft
        })
    return items


def load_articles() -> list[dict]:
    if not ARTICLES_PATH.exists():
        return []
    try:
        return json.loads(ARTICLES_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def main() -> int:
    existing = load_articles()

    # Build a set of known video URLs so we don't add duplicates
    known_urls: set[str] = set()
    for a in existing:
        if a.get("videoUrl"):
            known_urls.add(a["videoUrl"])

    try:
        youtube = parse_youtube_entries()
    except Exception as err:
        print(f"YouTube fetch failed: {err}", file=sys.stderr)
        return 1

    new_entries = [e for e in youtube if e["videoUrl"] not in known_urls]

    if not new_entries:
        print("articles.json already up to date — no new YouTube videos found.")
        return 0

    # Prepend new entries (newest first)
    merged   = new_entries + existing
    new_text = json.dumps(merged, indent=2, ensure_ascii=False) + "\n"
    old_text = ARTICLES_PATH.read_text(encoding="utf-8") if ARTICLES_PATH.exists() else ""

    if new_text == old_text:
        print("articles.json already up to date.")
        return 0

    ARTICLES_PATH.write_text(new_text, encoding="utf-8")
    print(f"Added {len(new_entries)} new draft article(s) to articles.json:")
    for e in new_entries:
        print(f"  - {e['title']}")
    print("Open admin.html to set the portal, caption, and body text for each one.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
