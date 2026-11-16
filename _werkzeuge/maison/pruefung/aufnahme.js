#!/usr/bin/env node
/* Aufnahmen des Kontrollpanels zum Ansehen (HAUS-GV.md «Fertig heisst» 4): Chromium mit eigenem Wegwerf-Profil, eine Instanz,
   je Breite (1440, 390) das erste Bild, jeder Saal einzeln und die ganze Seite, nach _pruefung-gv/.
   node _werkzeuge/maison/pruefung/aufnahme.js [adresse] */
const path = require('path'), fs = require('fs');
const { chromium } = require('/Users/robertreff/Desktop/Website-Projekte/_Befund-Vorschlaege/node_modules/playwright');
const ADR = process.argv[2] || '/_werkzeuge/maison/';
const ZIEL = process.env.ZIEL || path.join(__dirname, '..', '_pruefung-gv');   /* ZIEL=… für Aufnahmen der Vorlage zum Vergleich */
fs.mkdirSync(ZIEL, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true });
  const aus = [];
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'de-CH', timezoneId: 'Europe/Zurich' });
    await ctx.addInitScript(() => { try { localStorage.setItem('rundgang-gv-maison', '1'); } catch (e) {} });
    const p = await ctx.newPage(); const f = [];
    p.on('pageerror', e => f.push(String(e))); p.on('console', m => { if (m.type() === 'error') f.push(m.text()); });
    await p.goto(ADR + '?gruss=tag', { waitUntil: 'networkidle' });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: path.join(ZIEL, `${w}-0-empfang.png`) });
    await p.evaluate(async () => { document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager'); for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } scrollTo(0, 0); });
    await p.waitForTimeout(2000);
    for (const id of ['bureau', 'carte', 'imprimerie', 'reception', 'livre', 'registre']) {
      const el = await p.$('#' + id); await el.scrollIntoViewIfNeeded(); await p.evaluate(() => { document.querySelector('.m-oben').style.visibility = 'hidden'; }); await p.waitForTimeout(900);
      await el.screenshot({ path: path.join(ZIEL, `${w}-saal-${id}.png`) });
    }
    await p.screenshot({ path: path.join(ZIEL, `${w}-9-ganz.png`), fullPage: true });
    aus.push({ breite: w, fehler: f });
    await ctx.close();
  }
  await b.close();
  console.log(JSON.stringify(aus, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
