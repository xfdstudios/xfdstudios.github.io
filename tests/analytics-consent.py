"""Headless consent regression. Existing Playwright installation; no user browser."""
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
import json, os
ROOT=Path(__file__).resolve().parents[1]
BASE='https://xfdstudios.github.io'
LIVE=os.environ.get('XFD_ANALYTICS_LIVE')=='1'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 c=b.new_context(viewport={'width':390,'height':844})
 requests=[]; responses=[]
 def route(r):
  u=urlparse(r.request.url)
  if u.hostname=='xfdstudios.github.io':
   if LIVE: r.continue_(); return
   f=ROOT/(u.path.lstrip('/') or 'index.html')
   if f.is_file(): r.fulfill(path=str(f)); return
   r.fulfill(status=404,body=''); return
  if u.hostname in ['www.googletagmanager.com','www.google-analytics.com','region1.google-analytics.com','analytics.google.com']:
   r.continue_(); return
  r.abort()
 c.route('**/*',route)
 page=c.new_page()
 def track(r):
  if 'google-analytics.com' in r.url or 'googletagmanager.com' in r.url:
   requests.append(r.url)
   if '/g/collect' in r.url:
    q=parse_qs(urlparse(r.url).query); body=r.post_data or ''
    responses.append({'event':q.get('en'),'url':q.get('dl'),'npa':q.get('npa'),'body':body[:300]})
 page.on('request',track)
 statuses=[]
 page.on('response',lambda r: statuses.append(r.status) if '/g/collect' in r.url else None)
 page.goto(BASE+'/articles/tech-gta-6-box-has-no-disc-212-gb-pre-load.html?private_test=DO_NOT_SEND#private-fragment',wait_until='domcontentloaded')
 page.wait_for_timeout(1500)
 assert not requests,requests
 assert not [x for x in c.cookies() if x['name'].startswith('_ga')]
 page.get_by_role('button',name='Decline / withdraw').click()
 page.reload(wait_until='domcontentloaded');page.wait_for_timeout(700)
 assert not requests
 page.get_by_role('button',name='Analytics choices',exact=True).click()
 page.get_by_role('button',name='Accept analytics',exact=True).click()
 page.wait_for_timeout(5000)
 assert len([u for u in requests if '/gtag/js?' in u])==1,requests
 assert any('/g/collect' in u for u in requests),'No collect request after consent'
 assert all('DO_NOT_SEND' not in u and 'private-fragment' not in u for u in requests)
 # Click a real existing outbound link without opening its destination.
 page.locator('a[href="https://www.youtube.com/watch?v=799EnkM0t1U"]').first.evaluate("e => {e.addEventListener('click',x=>x.preventDefault());}")
 page.locator('a[href="https://www.youtube.com/watch?v=799EnkM0t1U"]').first.click()
 page.wait_for_timeout(2000)
 page.get_by_role('button',name='Analytics choices',exact=True).click()
 page.get_by_role('button',name='Decline / withdraw').click()
 page.wait_for_load_state('domcontentloaded');page.wait_for_timeout(1000)
 mark=len(requests)
 assert not [x for x in c.cookies() if x['name'].startswith('_ga')],c.cookies()
 page.reload(wait_until='domcontentloaded');page.wait_for_timeout(1200)
 assert len(requests)==mark,'Google request after withdrawn reload'
 assert page.evaluate('window["ga-disable-G-F1K33T8TD6"]') is True
 print(json.dumps({'mode':'live' if LIVE else 'local','before_consent':'no Google requests/cookies','decline':'persists','accept':'single loader','withdraw':'no GA cookies or later Google requests','collect_statuses':statuses,'events':responses},indent=2))
 b.close()
