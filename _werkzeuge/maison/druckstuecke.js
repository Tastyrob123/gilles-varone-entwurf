#!/usr/bin/env node
/* Blätter aus «Drucksachen & Feed» als Stücke für den Saal des Kontrollpanels (M08): öffnet das Werkzeug unsichtbar (Chromium, eigenes
   Wegwerf-Profil, eine Instanz, nur GET), sucht die gesetzten Blätter der Vorlagen des Hauses nach ihrem Text, legt jedes gerade (ohne die
   Drehung der Werkstatt) auf eine freie Fläche und nimmt es in vierfacher Dichte auf: roh/druck/<n>.png. Nichts wird geschrieben.
   Gewählt: Vorlagen ohne Namen von Gästen (keine «Famille …», keine Tischkarten), passend zum Haus: Menü des Abends, Fermetures, GaultMillau.
   node _werkzeuge/maison/druckstuecke.js [adresse] */
const path = require('path'), fs = require('fs');
const { chromium } = require('/Users/robertreff/Desktop/Website-Projekte/_Befund-Vorschlaege/node_modules/playwright');
const ADR = process.argv[2] || '/_werkzeuge/imprimerie/';
const ZIEL = path.join(__dirname, 'roh', 'druck');
const WAHL = [['1-menu-du-soir', 'Le menu du soir'], ['2-fermetures', 'Fermetures'], ['3-gaultmillau', 'GaultMillau']];
(async () => {
  fs.mkdirSync(ZIEL, { recursive: true });
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 932 }, deviceScaleFactor: 4, locale: 'de-CH' });
  await ctx.addInitScript(() => { try { localStorage.setItem('ds-varone-willkommen', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const aus = [];
  await p.route('**/*', r => ['GET', 'HEAD'].includes(r.request().method()) ? r.continue() : r.abort());
  await p.goto(ADR, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(4000);
  for (const [name, text] of WAHL) {
    const ok = await p.evaluate(text => {
      document.querySelectorAll('#ms-probe').forEach(x => x.remove());
      const q = [...document.querySelectorAll('.blatt')].find(e => e.textContent.includes(text) && !/Famille|Réservé/.test(e.textContent));
      if (!q) return false;
      const f = document.createElement('div'); f.id = 'ms-probe';
      f.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;padding:0;margin:0;background:transparent;transform:none';
      const k = q.cloneNode(true); k.style.transform = 'none'; k.style.boxShadow = 'none';
      f.appendChild(k); document.body.appendChild(f); scrollTo(0, 0); return true;
    }, text);
    if (!ok) { aus.push({ name, fehlt: text }); continue; }
    await p.waitForTimeout(500);
    const r = await (await p.$('#ms-probe .blatt')).boundingBox();   /* auf ganze Pixel nach innen, sonst schaut am Rand die Seite darunter durch */
    await p.screenshot({ path: path.join(ZIEL, name + '.png'), clip: { x: Math.ceil(r.x), y: Math.ceil(r.y), width: Math.floor(r.width - (Math.ceil(r.x) - r.x)), height: Math.floor(r.height - (Math.ceil(r.y) - r.y)) } });
    aus.push({ name, text });
  }
  await b.close();
  console.log(JSON.stringify(aus, null, 1));
})().catch(e => { console.error(String(e)); process.exit(1); });
