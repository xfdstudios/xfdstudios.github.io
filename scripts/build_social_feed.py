"""Refresh social-feed.json from public source feeds.

Currently pulls the XFD YouTube channel via its public Atom feed. Other
platforms (TikTok, Instagram, Facebook, Threads) do not expose a public,
free, ad-blocker-friendly feed for a static site, so existing non-youtube
entries in social-feed.json are preserved untouched.
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
MAX_YOUTUBE_ITEMS = 12
FEED_PATH = Path(__file__).resolve().parent.parent / "social-feed.json"


NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "xfd-feed-bot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def parse_youtube_entries() -> list[dict]:
    raw = fetch(YOUTUBE_FEED)
    root = ET.fromstring(raw)
    items: list[dict] = []
    for entry in root.findall("a:entry", NS)[:MAX_YOUTUBE_ITEMS]:
        title = (entry.findtext("a:title", default="", namespaces=NS) or "").strip()
        video_id = (entry.findtext("yt:videoId", default="", namespaces=NS) or "").strip()
        link_el = entry.find("a:link", NS)
        url = link_el.get("href") if link_el is not None else ""
        published = entry.findtext("a:published", default="", namespaces=NS) or ""
        try:
            dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
            date_str = dt.strftime("%b %-d, %Y")
        except ValueError:
            date_str = published[:10]
        if not video_id or not title or not url:
            continue
        items.append({
            "title": title,
            "date": date_str,
            "platform": "youtube",
            "portal": "all",
            "type": "short" if "/shorts/" in url else "video",
            "url": url,
            "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        })
    return items


def load_existing() -> list[dict]:
    if not FEED_PATH.exists():
        return []
    try:
        return json.loads(FEED_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def merge(existing: list[dict], youtube: list[dict]) -> list[dict]:
    non_youtube = [item for item in existing if item.get("platform") != "youtube"]
    # de-dupe youtube by URL, keep latest order from feed
    seen: set[str] = set()
    deduped_youtube: list[dict] = []
    for item in youtube:
        if item["url"] in seen:
            continue
        seen.add(item["url"])
        deduped_youtube.append(item)
    return deduped_youtube + non_youtube


def main() -> int:
    existing = load_existing()
    try:
        youtube = parse_youtube_entries()
    except Exception as err:
        print(f"YouTube fetch failed: {err}", file=sys.stderr)
        return 1
    if not youtube:
        print("No YouTube entries returned; leaving feed unchanged.")
        return 0
    merged = merge(existing, youtube)
    new_text = json.dumps(merged, indent=2, ensure_ascii=False) + "\n"
    old_text = FEED_PATH.read_text(encoding="utf-8") if FEED_PATH.exists() else ""
    if new_text == old_text:
        print("social-feed.json already up to date.")
        return 0
    FEED_PATH.write_text(new_text, encoding="utf-8")
    print(f"social-feed.json updated with {len(youtube)} YouTube items.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
