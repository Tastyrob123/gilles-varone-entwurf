// Prüfaufnahmen der Werkbank Gilles Varone: je Abschnitt ein Bildschirm (1440 × 900 oder 390 × 844), dazu eine Bildtafel.   node _werkbank/wb_blick.js [breite] [seite]
// Nur ansehen. Ablage _werkbank/_pruefung-wb/<breite>/<nr>-<id>.jpg
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(process.env.HOME, 'Desktop/Apps & Tools/Tasty Website Builder/node_modules/playwright'));
const B = +(process.argv[2] || 1440), SEITE = process.argv[3] || 'werkbank/index.html';
const Z = path.join(__dirname, '_pruefung-wb', String(B)); fs.mkdirSync(Z, { recursive: true });
(async () => {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({ viewport: { width: B, height: B < 700 ? 844 : 900 }, deviceScaleFactor: 1, ...(B < 700 ? { isMobile: true, hasTouch: true } : {}) });
  const p = await c.newPage(); const fehler = [];
  p.on('pageerror', e => fehler.push(String(e))); p.on('response', r => { if (r.status() >= 400) fehler.push(r.status() + ' ' + r.url()); });
  await p.goto('http://127.0.0.1:9718/' + SEITE, { waitUntil: 'load' }); await p.waitForTimeout(3000);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 400) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(120); }
  const ids = await p.evaluate(() => [...document.querySelectorAll('main > section, body > section, main > div > section')].map(s => [s.id || s.className.split(' ')[0], Math.round(s.getBoundingClientRect().top + scrollY), Math.round(s.offsetHeight)]));
  let n = 0;
  for (const [id, top, hh] of ids) {
    for (let o = 0; o < Math.max(hh, 1); o += (B < 700 ? 844 : 900)) {
      await p.evaluate(v => scrollTo(0, v), top + o); await p.waitForTimeout(900);
      await p.screenshot({ path: path.join(Z, String(++n).padStart(3, '0') + '-' + id + '.jpg'), quality: 70, timeout: 120000 }).catch(e => fehler.push('Aufnahme ' + id));
      if (o > 4 * 900) break;
    }
  }
  console.log(JSON.stringify({ abschnitte: ids.length, bilder: n, sw: await p.evaluate(() => document.documentElement.scrollWidth), fehler: [...new Set(fehler)].slice(0, 20) }));
  await b.close();
})();
