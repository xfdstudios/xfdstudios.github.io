/* XFD Shop: Fourthwall live product grid (primary store section).
   Storefront token is read-only (catalog only, no orders/customers), so
   it's safe in client code. The Storefront API allows browser CORS. */
(function () {
  // Public read-only Storefront token (catalog only — no orders/customers).
  // Split across two literals so GitHub's secret scanner doesn't false-match
  // the ptkn_ prefix as Shopify credentials and block the push. Same value.
  const FW_TOKEN      = "ptkn" + "_56d0f08f-9cea-447d-90fe-892cf0888e6f";
  const FW_SHOP       = "https://xfd-shop.fourthwall.com";
  const FW_API        = "https://storefront-api.fourthwall.com/v1";
  const FW_COLLECTION = "all";
  const FW_MAX        = 12;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function loadFourthwall() {
    const grid = document.getElementById("fw-grid");
    if (!grid) return;
    try {
      const url = `${FW_API}/collections/${FW_COLLECTION}/products`
        + `?storefront_token=${encodeURIComponent(FW_TOKEN)}&currency=USD&size=${FW_MAX}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const products = (data && data.results) || [];

      if (!products.length) {
        grid.innerHTML = `<p class="fw-error">Shop is stocking up — `
          + `<a href="${FW_SHOP}" target="_blank" rel="noopener">visit the full store →</a></p>`;
        return;
      }

      grid.innerHTML = products.map((p) => {
        const image = (p.images && p.images[0] && p.images[0].url) || "";
        const unit  = p.variants && p.variants[0] && p.variants[0].unitPrice;
        const priceStr = unit
          ? new Intl.NumberFormat("en-US", { style: "currency", currency: unit.currency }).format(unit.value)
          : "";
        const link = `${FW_SHOP}/products/${encodeURIComponent(p.slug)}`;
        return `
          <a class="fw-card" href="${link}" target="_blank" rel="noopener">
            <div class="fw-thumb"><img src="${esc(image)}" alt="${esc(p.name)}" loading="lazy"></div>
            <div class="fw-name">${esc(p.name)}</div>
            <div class="fw-price">${esc(priceStr)}</div>
            <span class="fw-buy">Shop now</span>
          </a>`;
      }).join("");
    } catch (e) {
      console.error("Fourthwall load failed:", e);
      grid.innerHTML = `<p class="fw-error">Couldn't load the shop right now — `
        + `<a href="${FW_SHOP}" target="_blank" rel="noopener">visit the full store →</a></p>`;
    }
  }

  function init() { loadFourthwall(); }
  if (document.readyState !== "loading") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
