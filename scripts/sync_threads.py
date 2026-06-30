"""Pull latest Threads posts into social-feed.json.

Requires a Threads User Access Token stored as a GitHub Secret named
THREADS_TOKEN. See THREADS_SETUP.md in the repo root for how to get it.

Posts are added to social-feed.json under platform "threads".
Existing threads entries are replaced with fresh data from the API.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

FEED_PATH   = Path(__file__).resolve().parent.parent / "social-feed.json"
TOKEN       = os.environ.get("THREADS_TOKEN", "")
API_BASE    = "https://graph.threads.net/v1.0"
MAX_POSTS   = 20

# Map Threads media types to XFD content types
TYPE_MAP = {
    "TEXT_POST":      "thread",
    "IMAGE":          "photo",
    "VIDEO":          "video",
    "CAROUSEL_ALBUM": "photo",
}


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "xfd-feed-bot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def get_threads_posts() -> list[dict]:
    if not TOKEN:
        raise RuntimeError("THREADS_TOKEN environment variable is not set.")

    # Get user ID
    me_url  = f"{API_BASE}/me?fields=id,username&access_token={TOKEN}"
    me_data = fetch_json(me_url)
    user_id = me_data.get("id")
    if not user_id:
        raise RuntimeError(f"Could not get Threads user ID: {me_data}")

    # Get recent posts
    fields  = "id,text,timestamp,media_type,thumbnail_url,permalink"
    posts_url = (
        f"{API_BASE}/{user_id}/threads"
        f"?fields={fields}"
        f"&limit={MAX_POSTS}"
        f"&access_token={TOKEN}"
    )
    data  = fetch_json(posts_url)
    posts = data.get("data", [])

    items: list[dict] = []
    for post in posts:
        text       = (post.get("text") or "").strip()
        timestamp  = post.get("timestamp", "")
        media_type = post.get("media_type", "TEXT_POST")
        permalink  = post.get("permalink", "https://www.threads.com/@xenofinaldawn")
        thumb      = post.get("thumbnail_url", "")

        if not text:
            continue

        # Parse date
        try:
            dt       = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            date_str = dt.strftime("%b %-d, %Y")
        except (ValueError, AttributeError):
            date_str = timestamp[:10] if timestamp else ""

        # Use first line as title (up to 80 chars)
        first_line = text.split("\n")[0][:80]
        title = first_line + ("..." if len(text.split("\n")[0]) > 80 else "")

        items.append({
            "title":     title,
            "date":      date_str,
            "platform":  "threads",
            "portal":    "all",            # assign portal manually via admin.html
            "type":      TYPE_MAP.get(media_type, "thread"),
            "url":       permalink,
            "thumbnail": thumb or "",
            "body":      text,             # full post text becomes article body
        })

    return items


def load_feed() -> list[dict]:
    if not FEED_PATH.exists():
        return []
    try:
        return json.loads(FEED_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def main() -> int:
    existing    = load_feed()
    non_threads = [item for item in existing if item.get("platform") != "threads"]

    try:
        threads_posts = get_threads_posts()
    except Exception as err:
        print(f"Threads fetch failed: {err}", file=sys.stderr)
        return 1

    if not threads_posts:
        print("No Threads posts returned; leaving feed unchanged.")
        return 0

    merged   = non_threads + threads_posts
    new_text = json.dumps(merged, indent=2, ensure_ascii=False) + "\n"
    old_text = FEED_PATH.read_text(encoding="utf-8") if FEED_PATH.exists() else ""

    if new_text == old_text:
        print("social-feed.json Threads section already up to date.")
        return 0

    FEED_PATH.write_text(new_text, encoding="utf-8")
    print(f"Updated social-feed.json with {len(threads_posts)} Threads post(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
