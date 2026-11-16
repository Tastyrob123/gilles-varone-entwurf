// Gilles Varone (09.11.2026, Bauart wie die Vorlage): Sticker als Bild (sticker/img/sNN.webp über PNG) und als Druckbogen A3 (sticker/pdf/…), headless, eine Instanz.  node _werkbank/sticker/aufnahme.js
const path = require('path'), fs = require('fs');
const { chromium } = require('/Users/robertreff/Desktop/Website-Projekte/_Befund-Vorschlaege/node_modules/playwright');
const ROOT = path.join(__dirname, '..', '..'), B = 'http://127.0.0.1:' + (process.env.WB_PORT || 9718) + '/';
const liste = JSON.parse(fs.readFileSync(path.join(__dirname, 'liste.json'), 'utf8'));
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  await p.goto(B + '_werkbank/sticker/satz.html', { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const roh = path.join(__dirname, 'roh'); fs.mkdirSync(roh, { recursive: true });
  for (const [id] of liste) await (await p.$('#' + id + ' svg')).screenshot({ path: path.join(roh, id + '.png'), omitBackground: true });
  // Druckbogen A3: jeder Sticker in seiner Grösse (mm aus der Liste), Schnittlinie in Magenta
  const mm = m => { const z = m.match(/(\d+)(?: × (\d+))?/); return [+z[1], +(z[2] || z[1])]; };
  const satz = fs.readFileSync(path.join(__dirname, 'satz.html'), 'utf8');
  const svgs = {}; for (const m of satz.matchAll(/<div class="st" id="(s\d+)">(<svg[\s\S]*?<\/svg>)<\/div>/g)) svgs[m[1]] = m[2];
  const teile = liste.map(([id, , , m]) => { const [w, h] = mm(m); return `<div class="t" style="width:${w}mm;height:${h * (/Schild/.test(m) ? 1.025 : 1)}mm">${svgs[id].replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"').replace(/href="\.\.\/\.\.\//g, 'href="' + B)}</div>`; }).join('');
  const bogen = `<!doctype html><html><head><meta charset="utf-8"><style>${satz.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/url\(\.\.\/\.\.\//g, 'url(' + B)}
    @page{size:297mm 420mm;margin:12mm}body{margin:0}.bg{display:flex;flex-wrap:wrap;gap:7mm;align-content:flex-start}.t{outline:.2mm solid #e5007d;outline-offset:1.5mm}.t svg{display:block}</style></head><body><div class="bg">${teile}</div></body></html>`;
  const q = await b.newPage(); await q.goto(B + '_werkbank/sticker/satz.html', { waitUntil: 'load' });   // gleiche Herkunft wie der Server, sonst lädt die Schrift nicht (CORS)
  await q.setContent(bogen, { waitUntil: 'load' }); await q.evaluate(() => document.fonts.ready); await q.waitForTimeout(400);
  fs.mkdirSync(path.join(ROOT, 'sticker', 'pdf'), { recursive: true });
  await q.pdf({ path: path.join(ROOT, 'sticker', 'pdf', 'gilles-varone-sticker-druckbogen-a3.pdf'), width: '297mm', height: '420mm', printBackground: true });
  await b.close(); console.log(liste.length, 'Sticker aufgenommen, Druckbogen A3');
})();
