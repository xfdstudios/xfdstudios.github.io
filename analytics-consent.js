/* Optional GA4. No Google tag is fetched until the visitor opts in. */
(() => {
  'use strict';
  if (window.XFDAnalyticsConsent) return;
  const ID = 'G-F1K33T8TD6';
  const KEY = 'xfd-analytics-consent-v1';
  const TTL = 180 * 86400000;
  let loaded = false;
  let panel, settings;
  window['ga-disable-' + ID] = true;
  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      return v && ['accepted', 'declined'].includes(v.choice) && v.expires > Date.now() ? v.choice : null;
    } catch (_) { return null; }
  }
  function clearCookies() {
    document.cookie.split(';').forEach(part => {
      const name = part.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      const host = location.hostname;
      ['', '; domain=' + host, '; domain=.' + host].forEach(domain => {
        document.cookie = name + '=; Max-Age=0; path=/' + domain + '; SameSite=Lax';
      });
    });
  }
  function start() {
    if (loaded || read() !== 'accepted') return;
    loaded = true;
    window['ga-disable-' + ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('set', {allow_google_signals: false, allow_ad_personalization_signals: false});
    window.gtag('js', new Date());
    // Strip query strings/fragments; never pass form fields, search terms or user IDs.
    window.gtag('config', ID, {
      allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_domain: location.hostname, cookie_expires: TTL / 1000,
      page_location: location.origin + location.pathname,
      page_referrer: '',
      page_title: document.title,
      send_page_view: true
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    script.id = 'xfd-google-analytics';
    document.head.appendChild(script);
  }
  function choose(choice) {
    // A denied/withdrawn choice takes effect before any UI/navigation work.
    if (choice !== 'accepted') {
      window['ga-disable-' + ID] = true;
      clearCookies();
    }
    try { localStorage.setItem(KEY, JSON.stringify({choice, expires: Date.now() + TTL})); }
    catch (_) {
      // Fail closed when a durable choice cannot be stored.
      window['ga-disable-' + ID] = true;
      clearCookies();
      panel.querySelector('[data-status]').textContent = 'Your browser could not save this choice. Analytics stays off.';
      return;
    }
    panel.hidden = true;
    settings.focus();
    if (choice === 'accepted') start();
    else if (loaded) location.reload(); // Unload all Google timers/listeners after withdrawal.
  }
  function show() { panel.hidden = false; panel.querySelector('button').focus(); }
  function init() {
    const style = document.createElement('style');
    style.textContent = '.xfd-consent{position:fixed;bottom:1rem;left:1rem;right:1rem;max-width:40rem;margin:auto;z-index:10000;background:#111b2a;color:#fff;border:2px solid #6bbfff;border-radius:12px;padding:1rem;box-shadow:0 4px 24px #0008;font:16px/1.5 system-ui}.xfd-consent[hidden]{display:none}.xfd-consent p{margin:.4rem 0 .8rem}.xfd-consent a{color:#a7d9ff}.xfd-consent-buttons{display:flex;gap:.75rem;flex-wrap:wrap}.xfd-consent button,.xfd-analytics-settings{font:inherit;cursor:pointer;border:2px solid #92cfff;border-radius:6px;padding:.55rem .8rem;background:#152e46;color:#fff}.xfd-consent button:focus-visible,.xfd-analytics-settings:focus-visible{outline:3px solid #fff;outline-offset:3px}.xfd-analytics-settings{margin:.7rem}';
    document.head.appendChild(style);
    settings = document.createElement('button');
    settings.type = 'button'; settings.className = 'xfd-analytics-settings';
    settings.textContent = 'Analytics choices'; settings.addEventListener('click', show);
    (document.querySelector('footer') || document.body).appendChild(settings);
    panel = document.createElement('section');
    panel.className = 'xfd-consent'; panel.setAttribute('aria-label', 'Optional analytics');
    panel.innerHTML = '<h2 style="font-size:1.1rem;margin:0">Optional analytics</h2><p>May XFD use Google Analytics cookies to measure page visits and outgoing link clicks? Advertising features are off. Declining will not affect the site. You can change or withdraw your choice at any time using Analytics choices.</p><p><a href="/privacy.html">Privacy details</a></p><div class="xfd-consent-buttons"><button type="button" data-choice="accepted">Accept analytics</button><button type="button" data-choice="declined">Decline / withdraw</button><button type="button" data-close>Close without changing</button></div><p data-status role="status"></p>';
    panel.querySelectorAll('[data-choice]').forEach(b => b.addEventListener('click', () => choose(b.dataset.choice)));
    panel.querySelector('[data-close]').addEventListener('click', () => { panel.hidden = true; settings.focus(); });
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') { panel.hidden = true; settings.focus(); } });
    document.body.appendChild(panel);
    const choice = read(); panel.hidden = choice !== null;
    if (choice === 'accepted') start(); else clearCookies();
  }
  window.XFDAnalyticsConsent = {open: show};
  window.addEventListener('storage', e => {
    if (e.key === KEY && read() !== 'accepted') {
      window['ga-disable-' + ID] = true; clearCookies();
      if (loaded) location.reload();
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
