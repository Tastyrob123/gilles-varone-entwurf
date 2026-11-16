// Unterlagen Gilles Varone · druckt die «Heute»-Seiten (quelle/<ziel>-heute.html) als PDF: node _werkbank/heute_druck.js <html> <pdf> <breite_mm> <hoehe_mm>
const path = require('path');
const { chromium } = require(path.join(process.env.HOME, 'Desktop/Apps & Tools/Tasty Website Builder/node_modules/playwright'));
const [html, pdf, b, h] = process.argv.slice(2);
(async () => {
  const br = await chromium.launch(); const p = await br.newPage();
  await p.goto('file://' + path.resolve(html), { waitUntil: 'load' }); await p.waitForTimeout(300);
  await p.pdf({ path: pdf, width: b + 'mm', height: h + 'mm', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
