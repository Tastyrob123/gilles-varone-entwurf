// Vorher/Nachher für die Werkbank von Gilles Varone, Savièse (09.11.2026, Vorlage Schlössli): je Seite die heutige Seite des Hauses und der Entwurf,
// oberster Bildschirm 1440 × 900 mit doppelter Pixeldichte.   node _werkbank/vorher.js [slug …]
//   → _werkbank/ansichten/Vorher/<slug>-alt.jpg und <slug>-neu.jpg   (gelesen von H.VORHER im Kit-Bau)
//   → dazu _werkbank/ansichten/Heute/Startseite.jpg (= startseite-alt.jpg)
// Die heutige Seite ist eine lange Einzelseite: für Expériences, Équipe und Infos wird zum Abschnitt (#id) gescrollt.
// Beim Öffnen liegen dort zwei Fenster über der Seite (Expérience chasse locale, Reservierungsfenster von Zenchef nach 3 s);
// beide werden vor der Aufnahme geschlossen («Compris» bzw. das Kreuz im Fenster), damit die Seite selbst zu sehen ist.
// Die Fenster selbst sind Befunde 02 und 03 (_werkbank/analyse/potential.json).
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(process.env.HOME, 'Desktop/Apps & Tools/Tasty Website Builder/node_modules/playwright'));
const HIER = __dirname, ZIEL = path.join(HIER, 'ansichten', 'Vorher'), HEUTE = path.join(HIER, 'ansichten', 'Heute');
const NEU = 'http://127.0.0.1:' + (process.env.WB_PORT || 9718) + '/';
const ALT = 'https://gillesvarone.ch/';
const PAARE = [   // [slug, heutige Adresse, neue Seite, Abschnitt der heutigen Seite]
  ['startseite', ALT, 'index.html', null],
  ['experiences', ALT, 'experiences.html', 'experiences'],
  ['equipe', ALT, 'equipe.html', 'equipe'],
  ['infos', ALT, 'infos.html', 'horaires'],
];
const KOPF = 104;   // Höhe der festen Kopfleiste der heutigen Seite am Rechner
const nur = process.argv.slice(2);

async function fensterZu(p) {
  for (const f of p.frames()) if (/zenchef/.test(f.url())) {
    for (const s of ['button[aria-label*="ferm" i]', 'button[aria-label*="close" i]']) { const e = await f.$(s); if (e) { await e.click().catch(() => {}); break; } }
  }
  await p.waitForTimeout(1000);
  await p.evaluate(() => { const e = document.querySelector('[class*="ZC_sdk__opened"]'); if (e && e.getBoundingClientRect().height > 300) e.style.display = 'none'; });
  await p.evaluate(() => { const b = [...document.querySelectorAll('.elementor-popup-modal a, .elementor-popup-modal button, .dialog-close-button')].find(e => /compris/i.test(e.textContent) || e.classList.contains('dialog-close-button')); if (b) b.click(); });
  await p.waitForTimeout(1500);
}

(async () => {
  fs.mkdirSync(ZIEL, { recursive: true }); fs.mkdirSync(HEUTE, { recursive: true });
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'fr-CH' });
  for (const [s, alt, neu, stelle] of PAARE) {
    if (nur.length && !nur.includes(s)) continue;
    const p = await ctx.newPage();
    try {
      const r = await p.goto(alt, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(5000);
      for (const t of ['refuser', 'tout refuser', 'ablehnen', 'decline', 'reject']) { const ab = await p.$(`text=/^\\s*${t}\\s*$/i`); if (ab) { await ab.click().catch(() => {}); await p.waitForTimeout(1500); break; } }
      await fensterZu(p);
      await p.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); });
      await p.waitForTimeout(3000);
      if (stelle) for (let i = 0; i < 4; i++) { await p.evaluate(([id, k]) => { const e = document.getElementById(id); if (e) scrollTo(0, Math.max(0, e.getBoundingClientRect().top + scrollY - k)); }, [stelle, KOPF]); await p.waitForTimeout(2000); }   // mehrmals: nachladende Bilder verschieben die Lage
      else { await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500); }
      await fensterZu(p);
      await p.screenshot({ path: path.join(ZIEL, s + '-alt.jpg'), quality: 90 });
      if (s === 'startseite') fs.copyFileSync(path.join(ZIEL, s + '-alt.jpg'), path.join(HEUTE, 'Startseite.jpg'));
      console.log('heute', s, r && r.status(), p.url(), await p.title());
    } catch (e) { console.log('alt fehlgeschlagen', s, String(e).slice(0, 160)); }
    await p.goto(NEU + neu, { waitUntil: 'load' }); await p.evaluate(() => document.fonts && document.fonts.ready);
    await p.waitForTimeout(neu === 'index.html' ? 6200 : 3800);
    await p.screenshot({ path: path.join(ZIEL, s + '-neu.jpg'), quality: 90 });
    await p.close(); console.log('Vorher/Nachher', s);
  }
  await b.close();
})();
