// sanity check
console.log("app.js loaded");

// Remove FOUC guard when everything finishes loading
window.addEventListener('load', ()=> document.documentElement.classList.remove('fouc-guard'));

// ----- Ad-block “soft” detection (non-invasive) -----
(function detectAdBlock(){
  const bait = document.createElement('div');
  bait.className = 'adsbox ad-banner ad-unit ad-slot';
  bait.style.cssText = 'width:1px;height:1px;position:absolute;left:-10000px;top:-10000px;';
  document.body.appendChild(bait);
  setTimeout(() => {
    const blocked = !bait || bait.offsetParent === null || bait.offsetHeight === 0;
    bait.remove();
    if(blocked){
      const bar = document.getElementById('ab-warning');
      if(bar) bar.classList.remove('hidden');
      const x = document.getElementById('ab-dismiss');
      if(x) x.addEventListener('click', () => bar.classList.add('hidden'));
    }
  }, 100);
})();

// ----- External links: ensure new tab + noopener -----
document.querySelectorAll('[data-external]').forEach(a=>{
  a.setAttribute('target','_blank');
  a.setAttribute('rel','noopener');
});

// ----- Carousel scroll buttons (Home) -----
(function(){
  const row = document.querySelector('.video-carousel');
  if(!row) return;
  const prev = document.getElementById('scrollPrev');
  const next = document.getElementById('scrollNext');
  const step = 320;
  if(prev) prev.addEventListener('click', ()=> row.scrollBy({left:-step,behavior:'smooth'}));
  if(next) next.addEventListener('click', ()=> row.scrollBy({left: step,behavior:'smooth'}));
})();

// ----- Modal for portfolio images -----
(function(){
  const modal = document.getElementById('modal');
  if(!modal) return;
  const inner = document.getElementById('modalInner');
  const closeBtn = document.getElementById('modalClose');

  function openImage(src, alt='Artwork'){
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    inner.innerHTML = `<img class="modal-image" alt="${alt}" src="${src}">`;
  }
  function closeModal(){
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    inner.innerHTML = '';
  }
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('.thumb');
    if(t){
      const src = t.getAttribute('data-full');
      const img = t.querySelector('img');
      openImage(src, img ? img.alt : 'Artwork');
    }
  });
  modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeModal(); });
})();

// ----- RedBubble embed: load on demand (click) or when scrolled into view -----
(function(){
  const box = document.getElementById('rb-portfolio');
  if(!box) return;

  const store = box.dataset.rbStore || 'gr3at1';
  let loaded = false;

  function fallback(msg){
    box.innerHTML = `<p style="color:#f99">${msg} <a href="https://www.redbubble.com/people/${store}/shop" target="_blank" rel="noopener">Open the store in a new tab.</a></p>`;
  }

  function renderRB(){
    try{
      if(typeof RBExternalPortfolio === "function"){
        new RBExternalPortfolio('www.redbubble.com', store, 5, 5).renderIframe('rb-portfolio');
        // be nice to the browser
        const iframe = box.querySelector('iframe');
        if(iframe){ iframe.setAttribute('loading','lazy'); }
      }else{
        fallback("RedBubble embed couldn’t start.");
      }
    }catch(e){
      fallback("RedBubble embed is blocked.");
    }
  }

  function loadRB(){
    if(loaded) return;
    loaded = true;
    box.innerHTML = "Loading store previews…";
    const s = document.createElement('script');
    s.src = "https://www.redbubble.com/assets/external_portfolio.js";
    s.async = true;
    s.onload = renderRB;
    s.onerror = function(){ fallback("RedBubble script failed to load."); };
    document.head.appendChild(s);

    // safety timeout if blockers swallow events
    setTimeout(function(){
      const el = box.querySelector('iframe');
      if(!el){ fallback("Embed didn’t load (possibly blocked)."); }
    }, 5000);
  }

  // Click-to-embed
  const btn = document.getElementById('rb-load');
  if(btn) btn.addEventListener('click', loadRB);

  // Optional: auto-load when scrolled near (enable by setting data-rb-autoload="1")
  if(box.dataset.rbAutoload === '1' && 'IntersectionObserver' in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          loadRB();
          io.disconnect();
        }
      });
    }, { root:null, rootMargin:'0px 0px -30% 0px', threshold:0.2 });
    io.observe(box);
  }
})();