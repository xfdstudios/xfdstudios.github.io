/* Merch card inside articles (built by scripts/build_article_pages.py from
   an article's "merch" field). The card works on its own as text plus a
   shop button; this adds live product photos from the matching Fourthwall
   collection, one per design. */
(function () {
  const FW_TOKEN = "ptkn" + "_56d0f08f-9cea-447d-90fe-892cf0888e6f"; // public read-only storefront token
  const FW_SHOP  = "https://xfd-shop.fourthwall.com";
  const FW_API   = "https://storefront-api.fourthwall.com/v1";
  const MAX_ITEMS = 4;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // "Own the Game Tee (Black · Deep Teal) | XFD Physical Culture" -> "Own the Game"
  const design = (name) => String(name).split("|")[0].replace(/\(.*?\)/g, "")
    .replace(/\b(tee|hoodie|shirt|t-shirt)\b/gi, "").trim().toLowerCase();
  const label = (name) => String(name).split("|")[0].trim();

  async function fill(card) {
    const box = card.querySelector(".merch-promo-products");
    const collection = card.getAttribute("data-collection");
    if (!box || !collection) return;
    try {
      const url = `${FW_API}/collections/${encodeURIComponent(collection)}/products`
        + `?storefront_token=${encodeURIComponent(FW_TOKEN)}&currency=USD&size=40`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const products = (data.results || []).filter((p) => p.images && p.images[0] && p.images[0].url);
      // Tees first (the cheaper way in), then one product per design.
      products.sort((a, b) => /hoodie/i.test(a.name) - /hoodie/i.test(b.name));
      const seen = new Set();
      const picks = [];
      for (const p of products) {
        const key = design(p.name);
        if (seen.has(key)) continue;
        seen.add(key);
        picks.push(p);
        if (picks.length === MAX_ITEMS) break;
      }
      if (!picks.length) return;
      box.innerHTML = picks.map((p) => {
        const unit = p.variants && p.variants[0] && p.variants[0].unitPrice;
        const price = unit ? new Intl.NumberFormat("en-US", { style: "currency", currency: unit.currency }).format(unit.value) : "";
        return '<a class="merch-promo-item" href="' + esc(`${FW_SHOP}/products/${encodeURIComponent(p.slug)}`) + '" target="_blank" rel="noopener">' +
          '<img src="' + esc(p.images[0].url) + '" alt="' + esc(label(p.name)) + '" loading="lazy">' +
          '<span class="merch-promo-name">' + esc(label(p.name)) + "</span>" +
          (price ? '<span class="merch-promo-price">' + esc(price) + "</span>" : "") +
          "</a>";
      }).join("");
      box.hidden = false;
    } catch (e) {
      // Shop unreachable: the text and button still work.
    }
  }

  document.querySelectorAll(".merch-promo[data-collection]").forEach(fill);
})();
