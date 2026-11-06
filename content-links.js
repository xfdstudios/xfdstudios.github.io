/* One article owns its primary video, related videos and cross-post URLs. */
(function (root) {
  function key(url) {
    if (!url) return null;
    var value = String(url);
    var yt = value.match(/(?:shorts\/|[?&]v=|youtu\.be\/|embed\/|\/vi\/)([a-zA-Z0-9_-]{11})/);
    if (yt) return "youtube:" + yt[1];
    try {
      var u = new URL(value);
      return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
    } catch (_) { return value; }
  }
  function keys(article) {
    var urls = [article.videoUrl, article.facebookUrl, article.tiktokUrl, article.instagramUrl, article.threadsUrl];
    (article.relatedVideos || []).forEach(function (v) { urls.push(typeof v === "string" ? v : v.url); });
    // Older articles may already embed a companion video in their body.
    var embeds = (article.body || "").matchAll(/@\[[^\]]*\]\(([^\s)]+)\)/g);
    for (var m of embeds) urls.push(m[1]);
    return Array.from(new Set(urls.filter(Boolean).map(key)));
  }
  function owners(articles) {
    var index = new Map();
    articles.forEach(function (article) {
      keys(article).forEach(function (k) { if (!index.has(k)) index.set(k, article); });
    });
    return index;
  }
  root.XFDContent = { key: key, keys: keys, owners: owners };
})(typeof window === "undefined" ? globalThis : window);
