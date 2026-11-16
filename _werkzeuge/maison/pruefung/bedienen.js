#!/usr/bin/env node
/* Jede Funktion des Kontrollpanels bedienen (HAUS-GV.md «Fertig heisst» 2): Chromium, eigenes Wegwerf-Profil, eine Instanz, 1440 und 390.
   Gruss/Datum, Vorschau beim Darüberfahren (im Laptop) und zurück zur Ruhe, Tastatur-Fokus, Taste 1–6, jede Kachel, Stand je Werkzeug,
   «Steht an», Leiste (Anleitungen, Marke, Website ansehen, Sprungmarken), Laufband nur im Bild, Rundgang, Weniger Bewegung, Startfehler-Tür,
   jeder Link antwortet 200, nichts geht hinaus (kein mailto/tel/Formular). Schreibt nichts.
   node _werkzeuge/maison/pruefung/bedienen.js [adresse] */
const path = require('path'), http = require('http');
const { chromium } = require('/Users/robertreff/Desktop/Website-Projekte/_Befund-Vorschlaege/node_modules/playwright');
const ADR = process.argv[2] || '/_werkzeuge/maison/';
const ok = [], nein = [];
const pruef = (t, b, x) => (b ? ok : nein).push(t + (x ? ' · ' + x : ''));
const status = u => new Promise(r => { http.get(u, s => { s.resume(); r(s.statusCode); }).on('error', () => r(0)); });
(async () => {
  const b = await chromium.launch({ headless: true });
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'de-CH', timezoneId: 'Europe/Zurich', hasTouch: w < 500 });
    await ctx.addInitScript(() => { try { localStorage.setItem('rundgang-gv-maison', '1'); } catch (e) {} });
    const p = await ctx.newPage(); const fehler = [];
    p.on('pageerror', e => fehler.push(String(e))); p.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    for (const g of ['morgen', 'tag', 'abend']) {
      await p.goto(ADR + '?gruss=' + g, { waitUntil: 'networkidle' });
      const t = await p.textContent('#gruss'); pruef(`${w} Gruss ${g}`, t === { morgen: 'Guten Morgen.', tag: 'Guten Tag.', abend: 'Guten Abend.' }[g], t);
    }
    pruef(`${w} Datum ausgeschrieben`, /\d{4}/.test(await p.textContent('#datum')) && /[a-z]/i.test(await p.textContent('#datum')), await p.textContent('#datum'));
    await p.waitForTimeout(2500);
    // Stand je Werkzeug (live)
    const st = await p.evaluate(() => Object.fromEntries(['bureau', 'carte', 'imprimerie', 'reception', 'livre', 'registre'].map(k => [k, (document.querySelector(`[data-stand="${k}-kurz"]`) || {}).textContent])));
    for (const [k, v] of Object.entries(st)) pruef(`${w} Stand ${k}`, /\d|veröffentlicht/.test(v || ''), v);
    const heute = await p.textContent('[data-stand="registre-heute"]'); pruef(`${w} Zahlenzeile Heute`, heute !== '–', heute);
    const an = await p.$$eval('.m-an li', l => l.map(x => x.innerText.replace(/\s+/g, ' ')));
    pruef(`${w} Steht an (4)`, an.length === 4 && /Anfrage|offen|Nichts/.test(an[3]), an.join(' | '));
    const zahlen = await p.$$eval('[data-zahl]', l => l.map(x => x.dataset.zahl + '=' + x.textContent));
    pruef(`${w} Zahlen der Säle`, zahlen.every(z => !/=–$/.test(z)), zahlen.join(' '));
    if (w > 1000) {
      // Vorschau beim Darüberfahren, im Laptop, und zurück zur Ruhe
      for (let i = 0; i < 6; i++) {
        await p.hover(`.fa-k:nth-child(${i + 1}) a`); await p.waitForTimeout(700);
        const v = await p.evaluate(i => { const e = document.querySelector(`[data-vorschau="${i}"]`); return e && e.classList.contains('an') && !!e.querySelector('.m-geraet__laptop') && e.querySelector('.m-geraet__schirm img').complete; }, i);
        pruef(`${w} Vorschau Kachel ${i + 1} im Laptop`, v);
      }
      await p.mouse.move(700, 120); await p.waitForTimeout(700);
      pruef(`${w} Zeiger weg = Ruhebild`, await p.evaluate(() => document.querySelector('.hz-bild--ruhe').classList.contains('an')));
      await p.focus('.fa-k:nth-child(3) a'); await p.waitForTimeout(600);
      pruef(`${w} Tastatur-Fokus zeigt Vorschau`, await p.evaluate(() => document.querySelector('[data-vorschau="2"]').classList.contains('an')));
      await p.evaluate(() => document.activeElement.blur());
    } else {
      pruef(`${w} Handy: Bühne aus`, await p.evaluate(() => getComputedStyle(document.querySelector('.hz-buehne')).display === 'none'));
      pruef(`${w} kein seitliches Verrutschen`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    // Leiste: Anleitungen → Fuss, Marke → oben, Sprungmarken
    if (w > 760) { await p.click('.m-oben__ecke--l'); await p.waitForTimeout(900); pruef(`${w} «Anleitungen» springt zum Fuss`, await p.evaluate(() => document.querySelector('#fuss').getBoundingClientRect().top < innerHeight)); }
    await p.evaluate(() => scrollTo(0, 1500)); await p.waitForTimeout(300); await p.evaluate(() => scrollTo(0, 1300)); await p.waitForTimeout(800);
    await p.click('.m-ecke'); await p.waitForTimeout(900);
    pruef(`${w} Marke springt nach oben`, await p.evaluate(() => scrollY < 50), 'y=' + await p.evaluate(() => scrollY));
    // Laufband läuft nur im Bild
    pruef(`${w} Laufband steht ausser Bild`, await p.evaluate(() => { scrollTo(0, document.body.scrollHeight); return new Promise(r => setTimeout(() => r(!document.querySelector('.m-band').classList.contains('laeuft')), 500)); }));
    pruef(`${w} Laufband läuft im Bild`, await p.evaluate(() => { document.querySelector('.m-band').scrollIntoView({ block: 'center' }); return new Promise(r => setTimeout(() => r(document.querySelector('.m-band').classList.contains('laeuft')), 500)); }));
    // Taste 1–6 öffnet das Werkzeug
    if (w > 1000) for (let i = 1; i <= 6; i++) {
      await p.goto(ADR, { waitUntil: "load" }); await p.waitForTimeout(1800);
      await p.waitForSelector('.fa-k a', { timeout: 15000 }).catch(() => {}); const ziel = await p.evaluate(i => (document.querySelector(`.fa-k:nth-child(${i}) a`) || {}).href || 'fehlt auf ' + location.href, i);
      await p.mouse.move(5, 5); await p.keyboard.press(String(i)); await p.waitForURL(u => u.toString() === ziel, { timeout: 15000 }).catch(() => {});
      pruef(`${w} Taste ${i} öffnet ${ziel}`, p.url() === ziel, p.url());
    }
    // Jede Kachel antippen/klicken
    for (let i = 1; i <= 6; i++) {
      await p.goto(ADR, { waitUntil: "load" }); await p.waitForTimeout(1800);
      await p.waitForSelector('.fa-k a', { timeout: 15000 }).catch(() => {}); const ziel = await p.evaluate(i => (document.querySelector(`.fa-k:nth-child(${i}) a`) || {}).href || 'fehlt auf ' + location.href, i);
      await (w < 500 ? p.tap(`.fa-k:nth-child(${i}) a`) : p.click(`.fa-k:nth-child(${i}) a`)).catch(e => nein.push('klick ' + i + ' ' + e.message.split('\n')[0])); await p.waitForURL(u => u.toString() === ziel, { timeout: 15000 }).catch(() => {});
      pruef(`${w} Kachel ${i} öffnet`, p.url() === ziel, p.url());
    }
    // Rundgang über ?rundgang
    await p.goto(ADR + '?rundgang', { waitUntil: 'networkidle' }); await p.waitForSelector('.rdg-karte', { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(800);
    let schritte = 0;
    for (let n = 0; n < 6; n++) { const k = await p.$('.rdg-karte'); if (!k) break; schritte++; const inBild = await k.evaluate(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; }); if (!inBild) nein.push(`${w} Rundgang Karte ${schritte} nicht ganz im Bild`); const wt = await p.$('.rdg-karte .rdg-los'); if (!wt) break; await wt.click(); await p.waitForTimeout(900); }
    pruef(`${w} Rundgang fünf Schritte`, schritte === 5, schritte + ' Schritte');
    pruef(`${w} Fehler in der Seite`, fehler.length === 0, fehler.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // Weniger Bewegung
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.goto(ADR, { waitUntil: 'networkidle' }); await p.evaluate(() => scrollTo(0, 2400)); await p.waitForTimeout(300);
    pruef('Weniger Bewegung: nichts verschoben', await p.evaluate(() => [...document.querySelectorAll('[data-r]')].every(e => getComputedStyle(e).transform === 'none'))); await ctx.close(); }
  // Startfehler-Tür
  { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
    await p.route('**/maison.js*', r => r.abort()); await p.goto(ADR, { waitUntil: 'load' }); await p.waitForTimeout(800);
    pruef('Startfehler-Tür offen ohne maison.js', await p.evaluate(() => !document.querySelector('#tuer').hidden), await p.evaluate(() => document.querySelector('#tuer').innerText.replace(/\s+/g, ' '))); await ctx.close(); }
  // Jeder Link antwortet, nichts geht hinaus
  { const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(ADR, { waitUntil: 'load' });
    const l = await p.$$eval('a[href]', a => [...new Set(a.map(x => x.href))]);
    pruef('kein mailto/tel/Formular', !l.some(u => /^(mailto|tel):/.test(u)) && !(await p.$('form')));
    for (const u of l) { const s = await status(u.split('#')[0]); pruef('Link ' + u, s === 200 || s === 302, String(s)); }
    await ctx.close(); }
  await b.close();
  console.log('BEDIENT: ' + ok.length + ' grün, ' + nein.length + ' rot');
  nein.forEach(x => console.log('✗ ' + x));
  if (process.argv.includes('--alle')) ok.forEach(x => console.log('✓ ' + x));
})().catch(e => { console.error(e); process.exit(1); });
