/* Homepage shop teaser: an auto-rotating slideshow of product images from
   BOTH stores (Fourthwall live API + Redbubble shop-products.json). It's a
   showcase — each slide links to the product, and the section's button
   sends people to the full shop on shop.html. Reuses the .shop-slide
   styles from the Shop page. */
(function () {
  const FW_TOKEN = "ptkn" + "_56d0f08f-9cea-447d-90fe-892cf0888e6f"; // public read-only storefront token
  const FW_SHOP  = "https://xfd-shop.fourthwall.com";
  const FW_API   = "https://storefront-api.fourthwall.com/v1";

  const slideEl = document.getElementById("promo-slide");
  const thumbsEl = document.getElementById("promo-thumbs");
  const stageEl = document.querySelector("#shop .shop-stage");
  if (!slideEl) return;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let slides = [];
  let index = 0;
  let timer = null;

  async function loadFourthwall() {
    try {
      const url = `${FW_API}/collections/all/products`
        + `?storefront_token=${encodeURIComponent(FW_TOKEN)}&currency=USD&size=12`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return (data.results || []).map((p) => {
        const unit = p.variants && p.variants[0] && p.variants[0].unitPrice;
        return {
          store: "Fourthwall",
          title: p.name,
          image: (p.images && p.images[0] && p.images[0].url) || "",
          price: unit ? new Intl.NumberFormat("en-US", { style: "currency", currency: unit.currency }).format(unit.value) : "",
          url: `${FW_SHOP}/products/${encodeURIComponent(p.slug)}`
        };
      }).filter((s) => s.image);
    } catch (e) {
      return [];
    }
  }

  async function loadRedbubble() {
    try {
      const res = await fetch("shop-products.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      return (data || []).map((p) => ({
        store: "Redbubble",
        title: p.title,
        image: p.image,
        price: "",
        url: p.url
      })).filter((s) => s.image);
    } catch (e) {
      return [];
    }
  }

  function render() {
    if (!slides.length) {
      slideEl.innerHTML = '<p class="fw-error">Shop is stocking up — <a href="shop.html">browse the shop →</a></p>';
      return;
    }
    index = ((index % slides.length) + slides.length) % slides.length;
    const s = slides[index];
    slideEl.innerHTML =
      '<a class="shop-slide-media promo-media" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
        '<img src="' + esc(s.image) + '" alt="' + esc(s.title) + '">' +
      "</a>" +
      '<div class="shop-slide-info">' +
        '<span class="shop-slide-cat">' + esc(s.store) + "</span>" +
        "<h3>" + esc(s.title) + "</h3>" +
        (s.price ? '<p class="promo-price">' + esc(s.price) + "</p>" : "") +
        '<a class="button primary redbubble-button" href="' + esc(s.url) + '" target="_blank" rel="noopener">' +
          '<i class="fa-solid fa-cart-shopping" aria-hidden="true"></i> Shop now</a>' +
        '<span class="shop-slide-count">' + (index + 1) + " / " + slides.length + "</span>" +
      "</div>";
    updateThumbs();
  }

  function renderThumbs() {
    if (!thumbsEl) return;
    thumbsEl.innerHTML = slides.map((s, i) =>
      '<button class="shop-thumb" type="button" data-index="' + i + '" aria-label="' + esc(s.title) + '">' +
        '<img src="' + esc(s.image) + '" alt="" loading="lazy"></button>'
    ).join("");
    updateThumbs();
  }

  function updateThumbs() {
    if (!thumbsEl) return;
    thumbsEl.querySelectorAll(".shop-thumb").forEach((t, i) => t.classList.toggle("active", i === index));
  }

  function go(delta) { index += delta; render(); }
  function startAuto() { stopAuto(); if (slides.length > 1) timer = setInterval(() => go(1), 5000); }
  function stopAuto() { if (timer) clearInterval(timer); timer = null; }

  const prev = document.getElementById("promo-prev");
  const next = document.getElementById("promo-next");
  if (prev) prev.addEventListener("click", () => { go(-1); startAuto(); });
  if (next) next.addEventListener("click", () => { go(1); startAuto(); });
  if (thumbsEl) thumbsEl.addEventListener("click", (e) => {
    const t = e.target.closest(".shop-thumb");
    if (!t) return;
    index = Number(t.dataset.index);
    render();
    startAuto();
  });
  if (stageEl) {
    stageEl.addEventListener("mouseenter", stopAuto);
    stageEl.addEventListener("mouseleave", startAuto);
  }

  Promise.all([loadFourthwall(), loadRedbubble()]).then((res) => {
    // Interleave the two stores so both are represented up front.
    const fw = res[0], rb = res[1];
    const merged = [];
    for (let i = 0; i < Math.max(fw.length, rb.length); i++) {
      if (fw[i]) merged.push(fw[i]);
      if (rb[i]) merged.push(rb[i]);
    }
    slides = merged;
    index = 0;
    renderThumbs();
    render();
    startAuto();
  });
})();
