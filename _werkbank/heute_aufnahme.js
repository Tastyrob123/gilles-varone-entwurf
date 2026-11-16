// Unterlagen Gilles Varone · Aufnahme der heutigen Fassung (09.11.2026): gillesvarone.ch wird nur gelesen. Das Fenster «Chasse locale» schliesst «Compris»,
// die Buchungsmaske wird für die Aufnahme ausgeblendet (nicht bedient), das Akkordeon der Cheffe sommelière nur aufgeklappt. POST/PUT/PATCH/DELETE sind
// gesperrt, nichts wird abgeschickt. Ergebnis: je Ausschnitt ein Bild und sein sichtbarer Text (lagen.json) für die «Heute»-Fassung der Unterlagen.
//   node _werkbank/heute_aufnahme.js _werkbank/quelle/heute     danach python3 _werkbank/heute_pdf.py
const path=require('path'),fs=require('fs');const { chromium } = require(path.join(process.env.HOME,'Desktop/Apps & Tools/Tasty Website Builder/node_modules/playwright'));
const OUT=process.argv[2];fs.mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
await p.route('**/*',r=>['POST','PUT','PATCH','DELETE'].includes(r.request().method())?r.abort():r.continue());
await p.goto('https://gillesvarone.ch',{waitUntil:'networkidle',timeout:60000}).catch(()=>{});await p.waitForTimeout(2500);
await p.getByText('Compris',{exact:false}).first().click({timeout:3000}).catch(()=>{});await p.waitForTimeout(800);
await p.evaluate(()=>{document.querySelectorAll('.elementor-popup-modal').forEach(e=>e.remove());document.documentElement.style.overflow='';document.body.style.overflow='';});
const H=await p.evaluate(()=>document.documentElement.scrollHeight);
for(let y=0;y<H;y+=400){await p.evaluate(y=>scrollTo(0,y),y);await p.waitForTimeout(120);}
await p.evaluate(()=>{document.querySelectorAll('iframe,[id*=zenchef],[class*=zenchef],[class*=Zenchef]').forEach(e=>e.style.visibility='hidden');});
// Akkordeon der Sommelière öffnen
await p.evaluate(()=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){if(n.nodeValue.includes('J’aime mettre en avant')){const l=n.parentElement.closest('.eael-accordion-list');const t=l&&l.querySelector('.eael-accordion-header');if(t){t.scrollIntoView({block:'center'});t.click();}return;}}});
await p.waitForTimeout(1500);await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(600);
const R=await p.evaluate(()=>{
 const knoten=t=>{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const i=n.nodeValue.toLowerCase().indexOf(t.toLowerCase());if(i>=0&&n.parentElement.getClientRects().length)return [n,i];}return null};
 const satz=(t)=>{const k=knoten(t);if(!k)return null;const r=document.createRange();r.setStart(k[0],k[1]);r.setEnd(k[0],k[1]+t.length);const q=[...r.getClientRects()];const x0=Math.min(...q.map(a=>a.left)),x1=Math.max(...q.map(a=>a.right)),y0=Math.min(...q.map(a=>a.top)),y1=Math.max(...q.map(a=>a.bottom));return {x0,x1,y0:y0+scrollY,y1:y1+scrollY,text:t};};
 const el=(t,sel)=>{const k=knoten(t);if(!k)return null;const e=sel?k[0].parentElement.closest(sel):k[0].parentElement;const r=e.getBoundingClientRect();return {x0:r.left,x1:r.right,y0:r.top+scrollY,y1:r.bottom+scrollY,text:e.innerText};};
 const lca=(a,z)=>{const ka=knoten(a)[0].parentElement,kz=knoten(z)[0].parentElement;const s=new Set();for(let e=ka;e;e=e.parentElement)s.add(e);let c=kz;while(c&&!s.has(c))c=c.parentElement;const r=c.getBoundingClientRect(),ra=ka.getBoundingClientRect(),rz=kz.getBoundingClientRect();return {x0:r.left,x1:r.right,y0:ra.top+scrollY,y1:rz.bottom+scrollY,text:c.innerText};};
 return {
  experiences: lca('n menu unique, changeant','La carte des vins'),
  intro: satz('Les expériences que je vous propose se différencient par le nombre de services qu’elles incluent.'),
  identique: satz('Veuillez noter que l’expérience choisie sera identique pour tous les convives assis au sein d’une même table.'),
  accords: satz('Je vous propose des accords mets et vins et des accords mets et créations sans alcool concoctés par nos soins avec chacune de mes expériences.'),
  chasse: el('chasse locale','li'),
  allergies: satz('Merci de nous signaler les allergies et les régimes alimentaires particuliers de votre table lors de votre réservation'),
  vins: satz('La carte des vins est régulièrement sujette à modifications.'),
  zitat: satz('J’aime mettre en avant le travail magnifique des vigneronnes et vignerons tout autour de la Suisse, et raconter leurs histoires ainsi que dégoter des accords parfaits et originaux qui sublimeront les produits travaillés par le chef.'),
  name: satz('Lise Donier-Meroz'),
  rolle: satz('Cheffe sommelière'),
  spalte: el('J’aime mettre en avant','.elementor-column'),
 };});
fs.writeFileSync(path.join(OUT,'lagen.json'),JSON.stringify(R,null,1));
// Ausschnitte: Sätze über die ganze Breite ihres Abschnitts (wie auf der Seite gesetzt), 8 px Luft oben und unten, nie die Nachbarzeile
const breite={spalte:R.spalte,name:R.spalte,rolle:R.spalte,zitat:R.spalte};
for(const [k,r] of Object.entries(R)){if(!r||k==='spalte'){if(!r)console.log('fehlt',k);continue;}const s=breite[k]||R.experiences,pad=k==='experiences'?0:8;
 const clip={x:Math.max(0,s.x0),y:Math.max(0,r.y0-pad),width:Math.min(1440,s.x1)-Math.max(0,s.x0),height:r.y1-r.y0+2*pad};r.clip=clip;
 await p.screenshot({path:path.join(OUT,k+'.png'),fullPage:true,clip});console.log(k,Math.round(clip.width),Math.round(clip.height));}
fs.writeFileSync(path.join(OUT,'lagen.json'),JSON.stringify(R,null,1));
await b.close();})();
