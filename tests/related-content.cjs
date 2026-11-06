const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const articles = JSON.parse(fs.readFileSync('articles.json'));
const social = JSON.parse(fs.readFileSync('social-feed.json'));
const context = vm.createContext({ URL, console, document: { querySelector: () => null }, window: {} });
vm.runInContext(fs.readFileSync('content-links.js', 'utf8'), context);
context.XFDContent = context.window.XFDContent;
vm.runInContext(fs.readFileSync('app.js', 'utf8').replace(/loadAll\(\);\s*$/, ''), context);
context.articleFixture = articles;
context.socialFixture = social;
vm.runInContext('articles = articleFixture; socialFeed = socialFixture; buildFeedItems(); buildHeroItems();', context);
const feed = vm.runInContext('feedItems', context);
const hero = vm.runInContext('heroItems', context);
for (const [id, companion] of [
  ['horror-ahs-13-finale-all-that-buildup', 'We4QsDj4ecM'],
  ['popculture-who-sang-the-real-ghostbusters-songs-tahiti', 'w7u8-fwN_zo']
]) {
  assert.equal(feed.filter(x => x.url === `articles/${id}.html`).length, 1);
  assert(!feed.some(x => x.kind === 'social' && x.url.includes(companion)));
  assert(hero.filter(x => x.key === id).length <= 1);
  assert(!hero.some(x => x.url.includes(companion)));
}
// Site-wide search must retain companion terms but return the combined article.
const searchSource = fs.readFileSync('search.js', 'utf8');
const search = vm.createContext({ URL, XFDContent: context.XFDContent, dataset: null,
 fetch: async path => ({ok: true, json: async () => path === 'articles.json' ? articles : social}) });
vm.runInContext(searchSource.slice(searchSource.indexOf('  function videoId('), searchSource.indexOf('  /* ── Search + render')), search);
(async () => {
 const results = await vm.runInContext('loadData()', search);
 for (const companion of ['We4QsDj4ecM', 'w7u8-fwN_zo']) assert(!results.some(x => x.external && x.url.includes(companion)));
 assert(results.find(x => x.url.includes('horror-ahs-13-finale-all-that-buildup')).text.includes('two weeks'));
 assert.equal(context.XFDContent.key('https://youtu.be/We4QsDj4ecM?t=3'), context.XFDContent.key('https://www.youtube.com/shorts/We4QsDj4ecM'));
 console.log('PASS: merged homepage cards, featured slides, site-wide search, companion terms and URL aliases');
})().catch(e => { console.error(e); process.exitCode = 1; });
