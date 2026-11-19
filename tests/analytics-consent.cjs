const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fixture(saved,broken=false){
 const nodes=[],cookies=[],events={},data={};let reloads=0;
 if(saved)data['xfd-analytics-consent-v1']=JSON.stringify({choice:saved,expires:Date.now()+10000});
 function el(tag){return {tag,children:[],handlers:{},dataset:{},hidden:false,textContent:'',setAttribute(){},appendChild(n){this.children.push(n);nodes.push(n)},addEventListener(t,f){this.handlers[t]=f},focus(){},querySelector(s){return this.querySelectorAll(s)[0]},querySelectorAll(s){if(!this.parts){this.parts={};for(const k of ['accepted','declined']){const b=el('button');b.dataset.choice=k;this.parts[k]=b}this.parts.close=el('button');this.parts.status=el('p')}
 if(s==='[data-choice]')return [this.parts.accepted,this.parts.declined];return [this.parts[s==='[data-close]'?'close':s==='[data-status]'?'status':'accepted']];}}}
 const doc={head:el('head'),body:el('body'),readyState:'complete',title:'Test',querySelector:()=>null,createElement:el};Object.defineProperty(doc,'cookie',{get:()=>'',set:v=>cookies.push(v)});
 const win={addEventListener:(k,f)=>events[k]=f};const loc={hostname:'xfdstudios.github.io',origin:'https://xfdstudios.github.io',pathname:'/articles/test.html',reload:()=>reloads++};
 const ctx={window:win,document:doc,location:loc,localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>{if(broken)throw Error();data[k]=v}},Date,JSON};
 vm.runInNewContext(fs.readFileSync('analytics-consent.js','utf8'),ctx);
 const panel=nodes.find(n=>n.className==='xfd-consent');
 return {win,nodes,panel,events,data,choose:k=>panel.parts[k].handlers.click(),reloads:()=>reloads};
}
let f=fixture();assert(!f.nodes.some(n=>n.src));assert.equal(f.win['ga-disable-G-F1K33T8TD6'],true);
f.choose('declined');assert(!f.nodes.some(n=>n.src));
f.choose('accepted');assert.equal(f.nodes.filter(n=>n.src).length,1);f.choose('accepted');assert.equal(f.nodes.filter(n=>n.src).length,1);
const config=f.win.dataLayer.find(a=>a[0]==='config')[2];assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);assert.equal(config.page_referrer,'');assert.equal(config.page_location,'https://xfdstudios.github.io/articles/test.html');
f.choose('declined');assert.equal(f.win['ga-disable-G-F1K33T8TD6'],true);assert.equal(f.reloads(),1);
f=fixture('declined');assert(!f.nodes.some(n=>n.src));assert(f.panel.hidden);
f=fixture('accepted');assert.equal(f.nodes.filter(n=>n.src).length,1);delete f.data['xfd-analytics-consent-v1'];f.events.storage({key:'xfd-analytics-consent-v1'});assert.equal(f.reloads(),1);assert(f.win['ga-disable-G-F1K33T8TD6']);
f=fixture(null,true);f.choose('accepted');assert(!f.nodes.some(n=>n.src));assert(f.win['ga-disable-G-F1K33T8TD6']);
console.log('PASS: no preconsent loader, decline persistence, single opt-in loader, ad flags, sanitized location, withdrawal, cross-tab revocation, storage failure closed');
