/* Markenbuch · Restaurant Gilles Varone · Bilder für die Listen «Farben» und «Schriften» (Robert 20.10.2026: «in allen Tools Bilder dazu»).
   Nimmt je Schrift und für Tinte und Papier einen Ausschnitt der Website des Hauses, so wie er dort steht (nur lesen, unsichtbar, ein Browser).
   Aufruf aus bau.py: node listen_bilder.js <zielordner> <adresse> …  (Seiten über den eigenen Server, /…) → listen/<name>.png */
const path = require('path');
const { chromium } = require(path.join(process.env.HOME, 'Aussen-Pruefung/node_modules/playwright'));
const [, , ZIEL, ...SEITEN] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  // je Wunsch: erstes sichtbares Element mit dieser Schrift (und, falls genannt, auf hellem Grund), 10 bis 90 Zeichen
  const WUNSCH = [
    ['schrift-t', 'GV Gill', 'titel'], ['schrift-m', 'GV Caviar', 'klein'], ['farbe-tinte', 'GV Gill', 'lauf-hell'], ['farbe-papier', null, 'papier']];
  for (const [name, schrift, art] of WUNSCH) {
    let box = null;
    for (const SEITE of SEITEN) {
    await p.goto(SEITE, { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    await p.evaluate(async () => { const d = document.documentElement; d.classList.remove('vor'); d.classList.add('auf', 'ruhig'); document.querySelectorAll('img[data-src]').forEach(i => { i.src = i.dataset.src; }); await document.fonts.ready; });
    await p.waitForTimeout(800);
    box = await p.evaluate(([schrift, art]) => {
      const hell = el => { let e = el; while (e && e !== document.body) { const c = getComputedStyle(e).backgroundColor; const m = c.match(/\d+/g); if (m && +m[3] !== 0 && c !== 'rgba(0, 0, 0, 0)') { return (+m[0] + +m[1] + +m[2]) / 3 > 180; } e = e.parentElement; } return true; };
      let el;
      if (art === 'papier') el = document.querySelector('section.papier');
      else el = [...document.querySelectorAll('h1,h2,h3,p,span,small,a,b,li,div')].find(e => {
        const s = getComputedStyle(e), t = (e.textContent || '').trim(), r = e.getBoundingClientRect();
        if (!s.fontFamily.includes(schrift) || e.children.length > 3 || t.length < (art === 'hand' ? 3 : 10) || t.length > (art === 'lauf-hell' ? 260 : 90) || r.width < 40 || s.visibility === 'hidden' || +s.opacity === 0) return false;
        if (art === 'titel') return /^(H2)$/.test(e.tagName) && hell(e);
        if (art === 'titel-hell') return /^(H2)$/.test(e.tagName) && hell(e) && !/^Willkommen/.test(t);
        if (art === 'lauf' || art === 'lauf-hell') return e.tagName === 'P' && (art === 'lauf' || t.length >= 120) && !/\d/.test(t) && r.width < 760 && (art === 'lauf' || hell(e)) && !e.closest('nav,header');
        if (art === 'klein') return s.textTransform === 'uppercase' && hell(e) && r.height < 40 && r.width > 150 && r.width / r.height > 4 && !e.closest('svg,[style*=rotate]');
        return true;
      });
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return art === 'papier' ? { x: 0, y: Math.max(0, r.top), width: Math.min(innerWidth, 1440), height: Math.min(r.height, 520) }
        : { x: Math.max(0, r.left - 28), y: Math.max(0, r.top - 22), width: Math.min(r.width + 56, innerWidth - Math.max(0, r.left - 28)), height: r.height + 44 };
    }, [schrift, art]);
    if (box) break;
    }
    if (!box) { console.log('nicht gefunden', name); continue; }
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(ZIEL, name + '.png'), clip: box });
    console.log('ok', name);
  }
  await b.close();
})();
