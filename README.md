# xfdportal
One portal. Infinite possibilities. The official central hub for XenoFinalDawn (XFD).

`google1dbb749f98320359.html` verifies the site in Google Search Console.
Nothing links to it, but don't delete it: removing it unverifies the site.

## Social-content article updates — OJ, November 6, 2026

Check Facebook, YouTube and TikTok against existing articles before adding content. Only add missing published content. When a long video and a Short are related, include BOTH in the SAME article, with playable embeds and original-platform links where supported. Cross-posts belong with that article too. Separate articles are for unrelated content, not automatically for different lengths or platforms. Examples: Judy Winslow Short + Tahiti documentary; AHS finale Short + AHS finale review. Keep old article URLs redirecting to the combined article when consolidating.

This rule applies to ALL surfaces: homepage feed, featured carousel, portal lists and archives, site-wide search, article pages, sitemap and future imports. Register related video URLs in the owning article’s `relatedVideos` list; retain its embedded players. `content-links.js` maps original URLs and companion embeds to that article. The importer must recognize the same companions and URL aliases so they cannot reappear as separate articles. Redirect retired article URLs; exclude them from listings and sitemap.

## Merch cards in articles
Add `"merch": "physical-culture"` to an article in `articles.json` to show the XFD Physical Culture card just before its "Your turn" section. `scripts/build_article_pages.py` (the `MERCH` table) writes the card's text and shop button; `merch-promo.js` adds live product photos, one per design, from the matching Fourthwall collection. Use it only on articles that relate to the line (physical vs digital games and game ownership). To add another merch line, add an entry to `MERCH` with its Fourthwall collection handle.
