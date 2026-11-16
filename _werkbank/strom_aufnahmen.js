// Aufnahmen der Werkbank-Kapitel für die Geräte im Wegweiser und im Fuss (Gilles Varone, 09.11.2026): ansichten/Strom/<name>-rechner.jpg (1440 × 900 @2x).
//   node _werkbank/strom_aufnahmen.js     Nur ansehen.
const path = require('path'), fs = require('fs');
const { chromium } = require(path.join(process.env.HOME, 'Desktop/Apps & Tools/Tasty Website Builder/node_modules/playwright'));
const Z = path.join(__dirname, 'ansichten', 'Strom'); fs.mkdirSync(Z, { recursive: true });
const B = 'http://127.0.0.1:9718/';
const STELLEN = [['analyse', 'werkbank/index.html', '#k1 .sbf-buehne, #k1 .sbf, #k1'], ['geprueft', 'werkbank/index.html', '#geprueft .gb-blatt, #geprueft'],
                 ['angebot', 'werkbank/index.html', '#k8 .mn, #k8'], ['feed', 'feed/index.html', null]];
(async () => {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }); const p = await c.newPage();
  for (const [n, s, wahl] of STELLEN) {
    await p.goto(B + s, { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(60); }
    if (wahl) await p.evaluate(w => { const e = w.split(',').map(x => document.querySelector(x.trim())).find(Boolean); if (e) scrollTo(0, e.getBoundingClientRect().top + scrollY - 60); }, wahl);
    else await p.evaluate(() => scrollTo(0, 0));
    await p.waitForTimeout(1800);
    await p.screenshot({ path: path.join(Z, n + '-rechner.jpg'), quality: 86, timeout: 120000 });
    console.log('aufgenommen', n);
  }
  await b.close();
})();
