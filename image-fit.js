/* Keep card pictures whole. Cards crop images to a fixed shape, which cut
   heads off portrait art and the sides off wide video thumbnails. When an
   image's shape is far from its frame, show all of it ("contain") over a
   blurred, darkened copy of itself instead of cropping.

   YouTube's 4:3 default thumbnails (hqdefault/sddefault/0.jpg) are left
   alone: they're letterboxed with black bars, and the normal crop trims
   those bars away, which is what we want. */
(function () {
  const CARD_IMAGES = ".media-card img, .story-card img, .design-video-card img";
  const MIN_KEPT = 0.85; // fit instead of crop if cropping would hide >15%
  const YT_LETTERBOXED = /ytimg\.com\/vi\/[^/]+\/(?:hq|sd)?default\.jpg|ytimg\.com\/vi\/[^/]+\/0\.jpg/;

  // Share of the image a "cover" crop keeps for this frame (1 = nothing lost).
  function kept(natW, natH, boxW, boxH) {
    if (!natW || !natH || !boxW || !boxH) return 1;
    const a = natW / natH;
    const b = boxW / boxH;
    return Math.min(a, b) / Math.max(a, b);
  }

  function cssUrl(src) {
    return 'url("' + String(src).replace(/["\\\n]/g, encodeURIComponent) + '")';
  }

  function fit(img) {
    if (img.dataset.fitChecked || YT_LETTERBOXED.test(img.currentSrc || img.src)) return;
    const box = img.getBoundingClientRect();
    if (box.width < 40 || box.height < 40) return; // hidden or not laid out yet
    img.dataset.fitChecked = "1";
    if (kept(img.naturalWidth, img.naturalHeight, box.width, box.height) >= MIN_KEPT) return;

    const frame = document.createElement("picture");
    frame.className = "img-fit-frame";
    frame.style.setProperty("--fit-image", cssUrl(img.currentSrc || img.src));
    img.parentNode.insertBefore(frame, img);
    frame.appendChild(img);
    img.classList.add("img-fit");
  }

  function watch(img) {
    if (img.complete && img.naturalWidth) fit(img);
    else img.addEventListener("load", () => fit(img), { once: true });
  }

  function scan(root) {
    if (root.matches && root.matches(CARD_IMAGES)) watch(root);
    if (root.querySelectorAll) root.querySelectorAll(CARD_IMAGES).forEach(watch);
  }

  scan(document);
  // Feeds, portal lists and the shop render their cards after load.
  new MutationObserver((records) => {
    records.forEach((r) => r.addedNodes.forEach((node) => node.nodeType === 1 && scan(node)));
  }).observe(document.body, { childList: true, subtree: true });

  // Cards in hidden tabs or carousels have no size yet; re-check on resize.
  let pending = null;
  window.addEventListener("resize", () => {
    clearTimeout(pending);
    pending = setTimeout(() => document.querySelectorAll(CARD_IMAGES).forEach((img) => {
      if (!img.dataset.fitChecked) fit(img);
    }), 200);
  });

  /* Homepage "Now playing" panel: a tall frame that showed wide video
     thumbnails with their sides cut off. app.js calls this for each slide. */
  window.XFDFitPanel = function (panel, src, isShort) {
    if (!panel || !src) return;
    panel.classList.remove("is-fit"); // until we know this slide's shape
    panel.dataset.fitSrc = src;
    // Letterboxed YouTube thumbnails: try the 16:9 HD frame, then the small
    // 16:9 one (YouTube serves a 120px placeholder when HD doesn't exist).
    let candidates = [src];
    if (YT_LETTERBOXED.test(src)) {
      if (isShort) return; // vertical Short centered in a 4:3 frame: the crop is right
      const base = src.replace(/\/(?:hq|sd)?default\.jpg$|\/0\.jpg$/, "");
      candidates = [base + "/maxresdefault.jpg", base + "/mqdefault.jpg"];
    }
    (function tryNext(i) {
      if (i >= candidates.length) return;
      const image = candidates[i];
      const probe = new Image();
      probe.onerror = () => tryNext(i + 1);
      probe.onload = () => {
        if (panel.dataset.fitSrc !== src) return; // the slide moved on
        if (i < candidates.length - 1 && probe.naturalWidth < 320) return tryNext(i + 1);
        const r = panel.getBoundingClientRect();
        const fits = kept(probe.naturalWidth, probe.naturalHeight, r.width, r.height) < MIN_KEPT;
        panel.classList.toggle("is-fit", fits);
        if (fits) panel.style.setProperty("--fit-image", cssUrl(image));
      };
      probe.src = image;
    })(0);
  };
})();
