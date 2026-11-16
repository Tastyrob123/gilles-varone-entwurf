// Karten & Preislisten · Restaurant Gilles Varone — Bedienungsprobe (09.11.2026, umgekleidet aus der Vorlage Wirtschaft am Schlössli, dort aus der Tafel des Gasterntal):
// öffnet das Werkzeug wie ein Mensch und drückt jeden Knopf der Funktionsliste.
//   node _werkzeuge/carte/pruef/lauf.js [chromium|webkit|firefox] [breite] [hoehe]      (Standard chromium 1440 900)
// Eigener Server auf dem Prüfport 19713 (ausserhalb der Häuser-Ports, 9719 nutzt ein anderer Chat; das Werkzeug selbst läuft auf 9713 und bleibt unberührt; fremde Prozesse werden nie beendet) mit Wegwerf-Daten (CARTE_DATEN = temporärer Ordner, frisch eingelesen), danach beendet und gelöscht.
// Das Werkzeug des Hauses (_daten/) und die Website bleiben unberührt (Anschluss an die Website bleibt aus; geprüft wird er in anschluss.js an
// einer APFS-Kopie). Jede Zeile: «ok» oder «FEHLER» mit Nummer der Funktionsliste. Ausgang 1, sobald etwas rot ist. Belege: pruef/aus/lauf-<browser>-<breite>/.
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const { chromium, webkit, firefox } = require(path.join(process.env.HOME, 'Desktop/Apps & Tools/Tasty Website Builder/node_modules/playwright'));
const HIER = path.join(__dirname, '..');
const BROWSER = ['chromium', 'webkit', 'firefox'].includes(process.argv[2]) ? process.argv[2] : 'chromium';
const W = +(process.argv[3] || 1440), H = +(process.argv[4] || 900), HANDY = W < 901;
const PORT = +(process.env.LAUF_PORT || 19713), BASIS = `http://127.0.0.1:${PORT}`;   // Prüfport (das Werkzeug selbst läuft auf 9713 und bleibt unberührt)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'carte-lauf-'));
const BELEG = path.join(HIER, 'pruef', 'aus', `lauf-${BROWSER}-${W}`);
fs.mkdirSync(BELEG, { recursive: true });
let rot = 0, nr = 0, srv = null, OFFLINE = false;
const ergebnis = [];
const ok = (id, n, b, mehr = '') => { nr++; if (!b) rot++; const z = `${b ? 'ok    ' : 'FEHLER'} ${id.padEnd(5)} ${n}${mehr ? ' · ' + mehr : ''}`; console.log(z); ergebnis.push({ id, n, ok: !!b, mehr }); return b; };
const warte = ms => new Promise(r => setTimeout(r, ms));
const hdr = (rolle, wer = 'Probe') => ({ 'X-Carte-Rolle': rolle, 'X-Carte-Wer': encodeURIComponent(wer), 'Content-Type': 'application/json', Origin: BASIS });
async function api(was, daten, rolle = 'direktion', extra = {}) {
  const r = await fetch(`${BASIS}/_werkzeuge/carte/api/${was}`, daten === undefined ? { headers: hdr(rolle) } : { method: 'POST', headers: { ...hdr(rolle), ...extra }, body: typeof daten === 'string' ? daten : JSON.stringify(daten) });
  return { s: r.status, j: await r.json().catch(() => ({})), h: r.headers };
}

(async () => {
  cp.execFileSync('python3', [path.join(HIER, 'einlesen.py')], { env: { ...process.env, CARTE_DATEN: TMP }, stdio: 'ignore' });
  try { cp.execSync(`lsof -tiTCP:${PORT} -sTCP:LISTEN`); console.error(`Port ${PORT} ist belegt. Erst den eigenen Server von «Karten & Preislisten» beenden (nie fremde).`); process.exit(3); } catch (e) { /* frei */ }
  srv = cp.spawn('python3', [path.join(HIER, 'serve.py'), String(PORT)], { env: { ...process.env, CARTE_DATEN: TMP }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { await fetch(BASIS + '/_werkzeuge/carte/api/gesund'); break; } catch (e) { await warte(150); } }
  cp.execFileSync('python3', [path.join(HIER, 'einlesen.py'), '--pdf'], { env: { ...process.env, CARTE_DATEN: TMP, CARTE_PORT: String(PORT) }, stdio: 'ignore' });   // erste veröffentlichte PDF je Karte (wie beim Werkzeug des Hauses)
  const B = { chromium, webkit, firefox }[BROWSER];
  const br = await B.launch();
  const fehlerKonsole = [], fehlerNetz = [];
  const ctx = await br.newContext({ viewport: { width: W, height: H }, acceptDownloads: true });
  await ctx.addInitScript(() => { try { if (!localStorage.getItem('lc-wer')) { localStorage.setItem('lc-wer', 'Probe Direktion'); localStorage.setItem('lc-rolle', 'direktion'); } localStorage.setItem('rundgang-varone-carte', '1'); } catch (e) { /* egal */ } });
  await ctx.route(/^(mailto|tel):/, rt => rt.abort());   // Prüf-Chats öffnen nie ein Mailprogramm (Master Website-Bau 1, 17.10.2026)
  const p = await ctx.newPage();
  const horch = (pg) => {
    pg.on('pageerror', e => fehlerKonsole.push('Skript: ' + String(e).slice(0, 200)));
    pg.on('console', m => { if (m.type() === 'error' && !OFFLINE && !/Failed to load resource.*(429|403|413|415|409|400)|net::ERR_INTERNET_DISCONNECTED|NetworkError|Load failed|ERR_FAILED|status of 4/.test(m.text())) fehlerKonsole.push('Konsole: ' + m.text().slice(0, 200)); });
    pg.on('response', r => { let fr = ''; try { fr = r.request().frame().url(); } catch (e) { /* weg */ } if (r.status() >= 400 && !/\/(experiences|index|restaurant|infos)\.html|api\/webseite/.test(fr) && !/\/api\/(pdf|entwurf|veroeffentlichen|zurueckholen|einstellungen|reparatur|probe)/.test(r.url()) && !r.url().includes('favicon')) fehlerNetz.push(r.status() + ' ' + r.url().replace(BASIS, '')); });
  };
  horch(p);
  const rahmen = () => p.frame({ url: /satz\/blatt\.html(?!\?mini)/ });
  const gesetzt = async () => { await p.waitForFunction(() => /Seite/.test(document.querySelector('#v-zahl')?.textContent || ''), null, { timeout: 30000 }); await warte(450); };
  const fenster = () => p.$('#fenster:not([hidden]) .fenster__k');
  const zu = async () => { if (await fenster()) { await p.keyboard.press('Escape'); await warte(250); } };
  const quit = async (re, t = 8000) => { try { await p.waitForFunction((r) => [...document.querySelectorAll('#meldung .quit')].some(q => new RegExp(r).test(q.textContent)), re.source, { timeout: t }); return true; } catch (e) { return false; } };
  const karte = async (z) => {
    if (HANDY && !(await p.evaluate(() => document.documentElement.classList.contains('wo-rand-auf')))) { await p.click('.wo-kopf__ber'); await warte(250); }
    await p.evaluate((z) => { const v = document.querySelector('#v-zahl'), k = document.querySelector(`.kw[data-z="${z}"]`); if (v && k && k.getAttribute('aria-current') !== 'true') v.textContent = '…'; }, z);   // sonst gilt die Zeile der vorigen Karte als «gesetzt»
    await p.click(`.kw[data-z="${z}"]`); await gesetzt();
  };
  const zeile = (text) => p.locator('#liste .r', { hasText: text }).first();
  const imRahmen = async (text) => (await rahmen().evaluate(() => document.getElementById('seiten').textContent)).toLowerCase().includes(text.toLowerCase());
  const knopf = async (r, akt) => { await r.scrollIntoViewIfNeeded(); if (!(await r.evaluate(e => e.classList.contains('gewaehlt')))) { await r.locator('.r__t').click({ position: { x: 14, y: 10 } }); await warte(500); } await r.locator(`[data-akt="${akt}"]`).scrollIntoViewIfNeeded(); await r.locator(`[data-akt="${akt}"]`).click(); await warte(300); };   // Robert 20.10.2026: die Knöpfe einer Zeile stehen unter dem gewählten Eintrag
  const breit = () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  // Element im Rahmen in die Mitte des Fensters holen (die feste Leiste unten deckt sonst den Klick ab, Carlton-Falle 5) und seine Lage liefern
  // am Handy oben ins Viertel: die Seitenleiste «Gestalten» liegt dort unten als Platte über der Vorschau
  const mitte = async (h) => { await h.evaluate(e => e.scrollIntoView({ block: 'center' })); await warte(150); let b = await h.boundingBox(); await p.evaluate(dy => window.scrollBy(0, dy), b.y + b.height / 2 - (HANDY ? H * 0.28 : H / 2 - 40)); await warte(250); b = await h.boundingBox(); return b; };
  const bild = async (n) => { try { await p.screenshot({ path: path.join(BELEG, n + '.png') }); } catch (e) { /* egal */ } };

  // ---------------------------------------------------------------- A Laden, Rahmen (R01–R06, R15, C01, C13)
  for (const url of ['/_werkzeuge/carte/', '/_werkzeuge/carte/satz/blatt.html', '/_werkzeuge/carte/anleitung.html', '/_werkzeuge/carte/pruefung.html']) for (let i = 1; i <= 2; i++) {
    const t0 = Date.now(); const r = await p.goto(BASIS + url, { waitUntil: 'load' }); await warte(500);
    ok('A01', `Laden ${url} (${i}. Mal)`, [200, 304].includes(r.status()), `${r.status()} · ${Date.now() - t0} ms`);
  }
  await p.goto(BASIS + '/_werkzeuge/carte/#experiences', { waitUntil: 'load' }); await gesetzt();
  ok('R01', 'Aufbau: Kopfleiste, Rand, Hauptfläche, Leiste, Fenster, Quittung mit aria-live (Oberfläche der Häuser, Rahmen «Die Bühne»)', await p.evaluate(() => ['#oben.wo-kopf', '#rand.wo-rand', '.haupt.wo-raum', '#leiste.wo-leiste', '#fenster', '#meldung[aria-live]'].every(s => document.querySelector(s)) && document.documentElement.dataset.woHaus === 'varone' && document.documentElement.dataset.woRahmen === 'buehne'));
  ok('R05', 'Kopfleiste: Zeichen, «Karten & Preislisten» (Name aus dem Kleid), Haus, Titel der Karte, runde Knöpfe, Website ansehen; keine Abfrage «Wer arbeitet hier?» (Robert 20.10.2026)', await p.evaluate(() => {
    const o = document.querySelector('#oben'); return !!o.querySelector('.wo-marke-w .wo-zeichen') && /Karten & Preislisten/.test(o.textContent) && /Gilles Varone/i.test(o.textContent) && /Les expériences/.test(o.querySelector('.wo-kopf__mitte').textContent) && o.querySelectorAll('.wo-kn--rund').length >= 4 && /Gilles%20Varone%20Savi%C3%A8se\/experiences\.html$/.test(o.querySelector('.wo-kopf__r a.wo-kn--gold').href) && !o.querySelector('.wer, [data-akt="wer"]'); }));
  ok('R05', 'Knöpfe des Kopfs führen zum Kontrollpanel (Kontrollpanel, 9711), Prüfung, Anleitung; Website bearbeiten (9712) steht im Rand', await p.evaluate(() => { const h = [...document.querySelectorAll('#oben a.wo-kn--rund')].map(a => a.getAttribute('href')); return h.some(x => /:9711\/_werkzeuge\/maison\/$/.test(x)) && h.some(x => /anleitung\.html$/.test(x)) && h.some(x => /pruefung\.html$/.test(x)) && !!document.querySelector('#rand a[href$=":9712/_werkzeuge/bureau/"]'); }));
  ok('F10a', 'Kein Fenster «Wer arbeitet hier?» beim Öffnen', !(await p.$('#fenster:not([hidden]) #w-n')) && !/Wer arbeitet hier/.test(await p.textContent('body')));
  ok('F10a', 'Untere Leiste: Titel einzeilig, Satz ganz (ohne «…»), Kopf und Leiste im selben Zustand', await p.evaluate(() => { const l = document.querySelector('#leiste'), b = l.querySelector('.wo-leiste__t b'), sm = l.querySelector('.wo-leiste__t small'); const kopf = document.querySelector('.wo-kopf__mitte').textContent; return b.getBoundingClientRect().height < 30 && (!sm || getComputedStyle(sm).display === 'none' || sm.scrollWidth <= sm.clientWidth + 1) && !(/Noch keine PDF/.test(kopf) && /Alles veröffentlicht/.test(l.textContent)); }));
  const karten = await p.$$eval('.kw', e => e.map(x => x.dataset.z));
  ok('C01', 'Die drei Karten des Hauses als Fotokacheln mit Gruppe und Seitenzahl (keine Weinkarte, kein Mittagsmenü, kein Bankett)', karten.join() === 'experiences,chasse,accords' && await p.evaluate(() => [...document.querySelectorAll('.kw')].every(k => /url\(/.test(k.querySelector('.wo-rk__b').style.backgroundImage) && /\d+ Seiten?/.test(k.textContent))), karten.join(', '));
  ok('C13', 'Wege: Frühere Fassungen, Veröffentlichte PDF, Zur Werkbank, Expériences auf der Website, Website bearbeiten, Anschluss, Rundgang', await p.evaluate(() => { const t = document.querySelector('#rand .wege').textContent; return ['Frühere Fassungen', 'Veröffentlichte PDF', 'Werkbank', 'Expériences auf der Website', 'Website bearbeiten', 'Anschluss', 'Kurzer Rundgang'].every(x => t.includes(x)); }));
  const tot = []; for (const a of await p.$$eval('#oben a[href], #rand a[href]', e => e.map(x => x.href))) { if (!/^https?:/.test(a)) continue; const u = a.replace(/:(971[124567])\//, ':' + PORT + '/'); if (/:(971[124567])\//.test(a)) continue; try { const s = (await fetch(u, { redirect: 'follow' })).status; if (s >= 400) tot.push(s + ' ' + a); } catch (e) { tot.push('weg ' + a); } }
  ok('C13', 'Jeder Link in Kopf und Rand antwortet (Website über den Kette-Server, PDF, Anleitung, Prüfung)', !tot.length, tot.join(' | '));
  for (const k of karten) {
    await karte(k);
    const w = await p.$('#v-warn:not([hidden])');
    ok('C07', `Karte ${k}: Vorschau gesetzt, nichts läuft über`, !w, w ? await w.textContent() : '');
    ok('R16', `Karte ${k}: Startbild mit Foto, Zeichen und Titel (Bühne)`, await p.evaluate(() => !!document.querySelector('#kopf .wo-sb--buehne .wo-sb__foto img') && !!document.querySelector('#kopf .wo-sb__zier .wo-zeichen') && document.querySelector('#kopf .wo-sb__h').textContent.trim().length > 3));
    ok('R07', `Karte ${k}: kein seitliches Verrutschen (${W} px)`, (await breit()) <= 0 && await p.evaluate(() => document.body.scrollWidth <= innerWidth), String(await breit()));
  }
  // Vorschau = Seitenzahl der PDF, Seite x von y
  await karte('experiences');
  ok('C07', 'Vorschau «1 Seite, wie in der PDF», die Seite trägt «Seite 1 von 1»', /1 Seite/.test(await p.textContent('#v-zahl')) && (await rahmen().$$eval('.nr-zeile', e => e.filter(x => / von 1/.test(x.textContent)).length)) === 1);
  ok('C07', 'Vorschau verkleinert per transform, nie per zoom', await rahmen().evaluate(() => { const b = document.querySelector('.blatt'); return /scale\(/.test(b.style.transform) && !b.style.zoom; }));
  const z0 = await rahmen().evaluate(() => document.querySelector('.blatt').getBoundingClientRect().width);
  await p.click('[data-zoom="1"]'); await warte(400);
  const z1 = await rahmen().evaluate(() => document.querySelector('.blatt').getBoundingClientRect().width);
  ok('C07', 'Zoom + vergrössert die Vorschau (auch über die Breite hinaus, dann seitlich schieben)', z1 > z0 + 5, `${Math.round(z0)} → ${Math.round(z1)} px`);
  await p.click('[data-zoom="-1"]'); await warte(300);
  // R15: letzte Ansicht gemerkt, aus der Stube die Übersicht
  await p.goto(BASIS + '/_werkzeuge/carte/', { waitUntil: 'load' }); await gesetzt();
  ok('R15', 'Ohne Adresse öffnet die zuletzt gewählte Karte', /Les expériences/.test(await p.textContent('#kopf .wo-sb__h')));
  await p.goto('about:blank'); await p.goto(BASIS + '/_werkzeuge/carte/', { waitUntil: 'load', referer: '/_werkzeuge/maison/' }); await gesetzt();
  ok('R15', 'Aus dem Kontrollpanel geöffnet: die erste Karte', /Les expériences/.test(await p.textContent('#kopf .wo-sb__h')));
  // C01 Modus gemerkt
  if (HANDY) { await p.click('.wo-kopf__ber'); await warte(250); }
  await p.click('.modus [data-m="frei"]'); await gesetzt();
  await p.reload({ waitUntil: 'load' }); await gesetzt();
  ok('C01', 'Modus Fortgeschritten mit Satz, nach Neuladen gemerkt (R15)', /gestalten direkt in der Karte/.test(await p.textContent('.modus__t')) && await p.$('.modus [data-m="frei"][aria-pressed="true"]'));
  if (HANDY) { await p.click('.wo-kopf__ber'); await warte(250); }
  await p.click('.modus [data-m="einfach"]'); await gesetzt();
  ok('C01', 'Modus Einfach mit Satz', /in einer Liste/.test(await p.textContent('.modus__t')));
  if (HANDY) {
    ok('R07', 'Handy: der Rand liegt hinter dem Knopf «Bereiche», zu bis man ihn drückt', await p.evaluate(() => getComputedStyle(document.querySelector('#rand')).display === 'none'));
    await p.click('.wo-kopf__ber'); await warte(200);
    ok('R07', 'Handy: «Bereiche» öffnet den Rand mit der Karte und den Wegen', await p.evaluate(() => getComputedStyle(document.querySelector('#rand')).display !== 'none'));
    await p.click('.kw[data-z="experiences"]'); await warte(400);
    ok('R07', 'Handy: nach der Wahl schliesst sich der Rand', await p.evaluate(() => getComputedStyle(document.querySelector('#rand')).display === 'none'));
  }
  await bild('01-start');

  // ---------------------------------------------------------------- B Einfach (C02, C03, C04, C09, R09–R11) · Les expériences
  const ES = 'experiences';
  const eintragHat = (name, text) => rahmen().evaluate(([n, t]) => [...document.querySelectorAll('.sb-g, .sb-m, .sb-wein, .po, .re')].some(e => e.textContent.toLowerCase().includes(n.toLowerCase()) && e.textContent.includes(t)), [name, text]);
  await karte(ES);
  const ein = zeile('L’expérience en 6 services');
  await ein.scrollIntoViewIfNeeded(); await ein.locator('.r__t').click({ position: { x: 14, y: 10 } }); await warte(900);   // links auf den Namen: rechts liegen beim Darüberfahren die Knöpfe der Zeile
  const blitzR = await rahmen().evaluate(() => [...document.querySelectorAll('.blitz')].map(x => x.textContent).join(''));
  ok('C04', 'Klick links: rechts blinkt der Eintrag', /expérience en 6 services/.test(blitzR), blitzR.slice(0, 50));
  const hoehe = await p.evaluate(() => { const r = document.querySelector('#liste .r.gewaehlt').getBoundingClientRect(); const f = document.getElementById('vf'), fr = f.getBoundingClientRect(); const e = f.contentDocument.querySelector('.blitz'); const q = e.getBoundingClientRect(); return [r.top + r.height / 2, fr.top + q.top + q.height / 2]; });
  ok('C04', 'Klick links: links und rechts auf derselben Höhe (± 60 px)', HANDY || Math.abs(hoehe[0] - hoehe[1]) < 60, hoehe.map(Math.round).join(' / '));
  ok('F10a', 'Knöpfe der gewählten Zeile: eigene Zeile, nie über Bild oder Text, keine Fläche dahinter', await p.evaluate(() => { const r = document.querySelector('#liste .r.gewaehlt'); if (!r) return false; const k = r.querySelector('.r__k'), kb = k.getBoundingClientRect(), ue = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; const t = r.querySelector('.r__t').getBoundingClientRect(), bi = r.querySelector('.r__b'); return getComputedStyle(k).display !== 'none' && !ue(kb, t) && !(bi && ue(kb, bi.getBoundingClientRect())) && getComputedStyle(k).backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(k).backgroundColor); }));
  ok('F10a', 'Plus-Knöpfe sind Knöpfe des Rahmens mit Körper und Knauf (Eintrag am Ende, Neue Rubrik)', await p.evaluate(() => { const k = [...document.querySelectorAll('#liste .neu-zeile .wo-kn')]; return k.length >= 2 && k.every(b => getComputedStyle(b).backgroundImage !== 'none' && !!b.querySelector('i')); }));
  const ziel = await rahmen().$('k-t:text-is("Uniquement durant le mois d’octobre, selon les disponibilités")');
  // Gilles Varone: die Karte ist mittig gesetzt, ein Text über zwei Zeilen beginnt nicht links: auf die Mitte der ersten Zeile zielen
  const ersteZeile = async (h) => { await mitte(h); const q = await h.evaluate(e => { const r = e.getClientRects()[0]; return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }); const fb = await (await p.$('#vf')).boundingBox(); return { x: fb.x + q.x, y: fb.y + q.y }; };
  if (ziel) { const bz = await ersteZeile(ziel); await p.mouse.click(bz.x, bz.y); await warte(900); }
  ok('C04', 'Klick rechts: Zeile links gewählt und blinkt', /chasse locale/.test(await p.evaluate(() => (document.querySelector('#liste .r.gewaehlt') || {}).textContent || '')));
  if (ziel) { const bz = await ersteZeile(ziel); await p.mouse.dblclick(bz.x, bz.y); await warte(600); }
  ok('C04', 'Doppelklick in der Vorschau öffnet den Eintrag', !!(await fenster()) && /bearbeiten/.test(await p.textContent('#fenster h2')));
  await zu();
  await zeile('L’expérience en 7 services').locator('.r__t').dblclick({ position: { x: 14, y: 10 } }); await warte(500);
  const felder0 = await p.$$eval('#fenster .felder .feld > span', e => e.map(x => x.textContent));
  ok('C02', 'Expérience: Felder Name, Preis, Zusatz (CHF) und jeder Gang als eigenes Feld (Gang 1 … Gang 7)', ['Name', 'Preis', 'Zusatz', 'Gang 1', 'Gang 7'].every(f => felder0.includes(f)) && !felder0.includes('Gang 8'), felder0.join(', '));
  await zu();
  await ein.locator('.r__t').dblclick({ position: { x: 14, y: 10 } }); await warte(500);
  ok('C02', 'Doppelklick auf die Zeile öffnet das Fenster mit allen Feldern', !!(await fenster()) && (await p.$$('#fenster .felder .feld')).length >= 3);
  ok('C02', 'Fenster zeigt «So steht es auf der Karte»', !!(await p.$('#f-mini')));
  const preisFeld = await p.$('#fenster .felder .feld:has(> span:text-is("Preis")) input');
  await preisFeld.fill('12,5'); await warte(500);
  const mini = p.frame({ url: /mini=1/ });
  ok('C02', 'Vorschau im Fenster folgt beim Tippen', mini && /12,5/.test(await mini.evaluate(() => document.body.textContent)));
  await p.click('#f-ok'); await warte(300);
  ok('R11', 'Quittung nach dem Speichern mit «Rückgängig» und «Vorher / nachher»', await quit(/gespeichert/) && await p.evaluate(() => /Rückgängig/.test(document.querySelector('#meldung').textContent) && /Vorher/.test(document.querySelector('#meldung').textContent)));
  await gesetzt();
  ok('C03', 'Preis in der Schreibweise der Karte: «12,5» wird «12.50»', await eintragHat('expérience en 6 services', '12.50'));
  ok('R08', 'Leiste: «Entwurf: 1 Änderung wartet», Marke «Entwurf»', /Entwurf: 1 Änderung/.test(await p.textContent('#leiste')) && !!(await p.$('#leiste .wo-marke')));
  ok('R09', 'Speichern-Knopf grün «Gespeichert» nach dem Speichern', /Gespeichert/.test(await p.textContent('#leiste [data-akt="speichern"]')) && !!(await p.$('#leiste .wo-kn--fertig')));
  ok('C01', 'Kachel trägt die Marke «Entwurf»', /Entwurf/.test(await p.textContent(`.kw[data-z="${ES}"]`)));
  await p.reload({ waitUntil: 'load' }); await gesetzt();
  ok('C09', 'Neu laden: der Entwurf ist noch da', await eintragHat('expérience en 6 services', '12.50') && /Entwurf/.test(await p.textContent('#leiste')));
  // Rückgängig über die Quittung
  await zeile('L’expérience en 6 services').locator('.r__t').dblclick({ position: { x: 14, y: 10 } }); await warte(400);
  await (await p.$('#fenster .felder .feld:has(> span:text-is("Preis")) input')).fill('15'); await p.click('#f-ok'); await quit(/gespeichert/); await gesetzt();
  ok('C09', 'Zweite Änderung gespeichert (15)', await eintragHat('expérience en 6 services', '15'));
  await p.click('#meldung .quit:last-child button:text("Rückgängig")'); await warte(400); await gesetzt();
  ok('R11', '«Rückgängig» in der Quittung holt den Stand davor (12.50)', await eintragHat('expérience en 6 services', '12.50') && !(await eintragHat('expérience en 6 services', '15')));
  // Nichts geändert
  await zeile('L’expérience en 6 services').locator('.r__t').dblclick({ position: { x: 14, y: 10 } }); await warte(400); await p.click('#f-ok');
  ok('R10', '«Nichts geändert, nichts gespeichert.»', await quit(/Nichts geändert/));
  // Gänge als eigene Felder, Wortlaut des Hauses
  await zeile('L’expérience en 7 services').locator('.r__t').dblclick({ position: { x: 14, y: 10 } }); await warte(400);
  const gang = async n => p.$eval(`#fenster .felder .feld:has(> span:text-is("${n}")) textarea, #fenster .felder .feld:has(> span:text-is("${n}")) input`, i => i.value).catch(() => '');
  ok('C02', 'Gänge im Wortlaut der Website: Gang 1 «Amuse-Bouche», Gang 4 «Poisson», Gang 7 «Dessert», Preis 259', (await gang('Gang 1')) === 'Amuse-Bouche' && (await gang('Gang 4')) === 'Poisson' && (await gang('Gang 7')) === 'Dessert' && (await gang('Preis')) === '259');
  await zu();
  // Neuer Eintrag an der Rubrik (Pflichtfeld Name)
  const rub = zeile('En cinq, six ou sept services.');
  await knopf(rub, 'neu-hier'); await warte(400);
  ok('C02', '«Eintrag hinzufügen» an der Rubrik: Fenster «Neuer Eintrag» (Kopie im Format der Nachbarn)', /Neuer/.test(await p.textContent('#fenster h2')));
  await (await p.$('#fenster .felder .feld:has(> span:text-is("Name")) input')).fill('');
  await p.click('#f-ok'); await warte(300);
  ok('C02', 'Ohne Namen: «Bitte einen Namen eintragen.»', /Namen/.test(await p.textContent('#f-fehler')));
  await (await p.$('#fenster .felder .feld:has(> span:text-is("Name")) input')).fill('Prüfmenü Saison');
  await (await p.$('#fenster .felder .feld:has(> span:text-is("Preis")) input')).fill('19');
  const fF = async (n, v) => { const x = await p.$(`#fenster .felder .feld:has(> span:text-is("${n}")) textarea, #fenster .felder .feld:has(> span:text-is("${n}")) input`); if (x) await x.fill(v); return !!x; };
  await fF('Übersetzung', '');
  await p.click('#f-ok'); await quit(/auf der Karte/); await gesetzt();
  ok('C02', 'Neuer Eintrag steht in der Karte, Preis «19» (Schreibweise der Karte)', await eintragHat('Prüfmenü Saison', '19'));
  ok('C02', 'Neue Expérience im Format der Nachbarn: eigene Menükarte mit Gängen und Zierde dazwischen', await rahmen().evaluate(() => { const h = [...document.querySelectorAll('.sb-g.gv-menu')].find(x => /Prüfmenü Saison/.test(x.textContent)); return !!h && h.querySelectorAll('.gv-gang').length === 7; }));
  ok('C09', 'Marke «Neu» an der Zeile', /Neu/.test(await zeile('Prüfmenü Saison').textContent()));
  // Kopieren, Abbrechen
  const nAlt = await p.$$eval('#liste .r', e => e.length);
  await knopf(zeile('Prüfmenü Saison'), 'kopie'); await warte(300);
  ok('C02', 'Kopieren öffnet die Kopie als neuen Eintrag', /Neuer/.test(await p.textContent('#fenster h2')));
  await p.click('#fenster [data-zu].kn'); await warte(400);
  ok('C02', 'Abbrechen nimmt die Kopie wieder weg', (await p.$$eval('#liste .r', e => e.length)) === nAlt);
  // Ausblenden
  await knopf(zeile('Prüfmenü Saison'), 'aus'); await quit(/Ausgeblendet/); await gesetzt();
  ok('C02', 'Ausblenden: Marke «Ausgeblendet», nicht mehr in der Karte', /Ausgeblendet/.test(await zeile('Prüfmenü Saison').textContent()) && !(await imRahmen('Prüfmenü Saison')));
  await knopf(zeile('Prüfmenü Saison'), 'aus'); await quit(/Wieder auf der Karte/); await gesetzt();
  ok('C02', 'Wieder zeigen', await imRahmen('Prüfmenü Saison'));
  // Verschieben
  const reihe = async () => p.$$eval('#liste .r', e => e.map(x => x.querySelector('.r__t b').textContent));
  const r0 = await reihe(), i0 = r0.indexOf('Prüfmenü Saison');
  await knopf(zeile('Prüfmenü Saison'), 'hoch'); await quit(/Reihenfolge/); await gesetzt();
  const r1 = await reihe();
  ok('C02', 'Nach oben verschieben', r1.indexOf('Prüfmenü Saison') === i0 - 1, `${i0} → ${r1.indexOf('Prüfmenü Saison')}`);
  await knopf(zeile('Prüfmenü Saison'), 'runter'); await quit(/Reihenfolge/); await gesetzt();
  ok('C02', 'Nach unten verschieben', (await reihe()).indexOf('Prüfmenü Saison') === i0);
  // Rubrik verschieben: die Karte hat eine Rubrik, sie bleibt in ihrem Abschnitt
  const rr0 = (await reihe()).join('|');
  await knopf(zeile('En cinq, six ou sept services.'), 'hoch');
  ok('C02', 'Einzige Rubrik nach oben: «Diese Rubrik steht schon zuoberst.», nichts verschoben', await quit(/schon zuoberst/) && (await reihe()).join('|') === rr0);
  // Neue Rubrik
  const seite2 = await p.$('#liste .teil[data-teil="0"]');
  await (await seite2.$('[data-akt="rubrik-neu"]')).scrollIntoViewIfNeeded(); await (await seite2.$('[data-akt="rubrik-neu"]')).click(); await warte(400);
  await (await p.$('#fenster .felder .feld input')).fill('Prüfrubrik'); await p.click('#f-ok'); await quit(/Rubrik auf der Karte/); await gesetzt();
  ok('C02', 'Neue Rubrik steht in der Karte', await imRahmen('Prüfrubrik'));
  await knopf(zeile('Prüfrubrik'), 'weg'); await warte(300);
  ok('C02', 'Entfernen fragt nach', /entfernen|nehmen/.test(await p.textContent('#fenster h2')));
  await p.click('#ja'); await quit(/entfernt|genommen/); await gesetzt();
  ok('C02', 'Entfernen nimmt die Rubrik weg', !(await imRahmen('Prüfrubrik')));
  // Seite ausblenden: die einzige Seite bleibt (die Karten des Hauses haben je eine Seite)
  await (await p.$('#liste .teil[data-teil="0"] [data-akt="s-aus"]')).click();
  ok('C02', 'Einzige Seite ausblenden: «Die einzige Seite bleibt auf der Karte.», Karte unverändert', await quit(/einzige Seite bleibt/) && (await rahmen().$$eval('.blatt', e => e.length)) === 1);
  await (await p.$('#liste .teil[data-teil="0"] [data-akt="s-hoch"]')).click(); await warte(300);
  ok('C02', 'Einzige Seite nach vorn: nichts geschieht, kein Fehler', (await rahmen().$$eval('.blatt', e => e.length)) === 1 && /Les expériences/.test(await rahmen().evaluate(() => document.querySelectorAll('.blatt')[0].textContent)));
  // Neuer Eintrag über das Startbild (Rubrik wählen)
  await p.click('#kopf [data-akt="neu"]'); await warte(300);
  ok('C02', '«Neuer Eintrag» fragt nach der Rubrik (mit Bild)', (await p.$$('#g-r button')).length >= 1 && /En cinq/.test(await p.textContent('#g-r')) && !!(await p.$('#g-r .g-b')));
  await zu();
  // Vorher / nachher
  await p.click('#leiste [data-akt="vgl"]'); await warte(400);
  const vgl = await p.textContent('#fenster');
  ok('C09', 'Vorher / nachher: Neu und Geändert', /Neu/.test(vgl) && /Geändert/.test(vgl) && /prüfmenü saison/i.test(vgl), (vgl.match(/\d+ Stellen?/) || [''])[0]);
  await bild('02-vergleich');
  await zu();
  // Probe-PDF
  await p.click('#leiste [data-akt="probe"]');
  ok('C10', 'Probe-PDF gedruckt, Quittung mit «Probe öffnen»', await quit(/Probe-PDF fertig/, 120000));
  const prL = await p.$eval('#meldung a', a => a.getAttribute('href')).catch(() => '');
  const prR = await fetch(new URL(prL, BASIS)); const prB = Buffer.from(await prR.arrayBuffer());
  fs.writeFileSync(path.join(BELEG, 'probe.pdf'), prB);
  const prT = cp.execFileSync('pdftotext', [path.join(BELEG, 'probe.pdf'), '-']).toString();
  ok('C10', 'Probe-PDF enthält den Entwurf (Prüfmenü, 12.50)', prR.headers.get('content-type') === 'application/pdf' && prT.replace(/\s+/g, '').toLowerCase().includes('prüfmenüsaison') && /12\.50/.test(prT));
  // Veröffentlichen
  await p.click('#leiste [data-akt="veroeffentlichen"]'); await warte(400);
  ok('R12', 'Veröffentlichen öffnet zuerst «Vorher und nachher»', /Vorher/.test(await p.textContent('#fenster h2')));
  await p.click('#v-ok'); await warte(500);
  ok('R12', 'Fortschritt mit Schritten', (await p.$$('#l-s li')).length === 4);
  await p.waitForFunction(() => /Veröffentlicht|Nicht veröffentlicht/.test(document.querySelector('#fenster')?.textContent + document.querySelector('#meldung')?.textContent), null, { timeout: 180000 });
  ok('C11', 'Veröffentlicht: «Die neue Fassung steht», Wörter geprüft', /Die neue Fassung steht/.test(await p.textContent('#fenster')) && /Wörter geprüft/.test(await p.textContent('#fenster')), (await p.textContent('#fenster .satz').catch(() => '')).slice(0, 90) || (await p.textContent('#meldung')).slice(0, 160));
  await bild('03-veroeffentlicht');
  await zu();
  const live = await fetch(BASIS + `/_werkzeuge/carte/api/pdf?z=${ES}&q=live`); fs.writeFileSync(path.join(BELEG, 'live.pdf'), Buffer.from(await live.arrayBuffer()));
  ok('C11', 'Veröffentlichte PDF = Daten (Prüfmenü, 12.50)', cp.execFileSync('pdftotext', [path.join(BELEG, 'live.pdf'), '-']).toString().replace(/\s+/g, '').toLowerCase().includes('prüfmenüsaison'));
  ok('R08', 'Leiste danach: «Alles veröffentlicht»', /Alles veröffentlicht/.test(await p.textContent('#leiste')));
  ok('R12', 'Ohne Entwurf steht kein Knopf «Veröffentlichen» und keiner «Vorher, nachher» (keine ausgegrauten Knöpfe, Robert 20.10.2026)', !(await p.$('#leiste [data-akt="veroeffentlichen"]')) && !(await p.$('#leiste [data-akt="vgl"]')));
  // Frühere Fassungen: Ursprünglicher Stand in den Entwurf, dann verwerfen
  if (!HANDY) await p.click('#rand [data-akt="verlauf"]'); else { await p.click('.wo-kopf__ber'); await warte(250); await p.click('#rand [data-akt="verlauf"]'); }
  await warte(600);
  const vl = await p.textContent('#fenster');
  ok('C12', 'Frühere Fassungen: «Ursprünglicher Stand» und die eben veröffentlichte Fassung', /Ursprünglicher Stand/.test(vl) && /Veröffentlicht/.test(vl));
  await p.click('#fenster [data-d="grundstand"]'); await quit(/Fassung im Entwurf/); await gesetzt();
  ok('C12', '«In den Entwurf holen»: Entwurf ohne Prüfmenü, PDF bleibt', !(await imRahmen('Prüfmenü Saison')) && /Entwurf/.test(await p.textContent('#leiste')));
  await p.click('#leiste [data-akt="verwerfen"]'); await warte(300); await p.click('#ja'); await quit(/verworfen/); await gesetzt();
  ok('C09', 'Entwurf verwerfen: wieder wie veröffentlicht', await imRahmen('Prüfmenü Saison'));
  const vl2 = (await api(`verlauf?z=${ES}`)).j.liste || [];
  ok('C09', 'Der verworfene Entwurf bleibt im Verlauf', vl2.some(x => x.art === 'verworfen'));

  // ---------------------------------------------------------------- C Fortgeschritten (C05, C06)
  if (HANDY) { await p.click('.wo-kopf__ber'); await warte(250); }
  await p.click('.modus [data-m="frei"]'); await gesetzt();
  const rf = rahmen();
  const el0 = await rf.$('[data-n] k-t:text-is("Un menu unique, changeant au gré de la qualité et de la saisonnalité des produits.")');
  const n0 = await el0.evaluate(e => e.closest('[data-n]').dataset.n);
  const box0 = await mitte(el0);
  await p.mouse.click(box0.x + box0.width / 2, box0.y + box0.height / 2); await warte(400);
  ok('C05', 'Klick wählt ein Element (Rahmen mit Griffen)', await rf.evaluate(() => !document.getElementById('anr').hidden && document.querySelectorAll('#anr .anr__g').length === 6));
  ok('C05', 'Seitenleiste «Gestalten» geht auf', HANDY || await p.evaluate(() => !document.getElementById('gst').hidden && /Gestalten/.test(document.getElementById('gst').textContent)));
  const boxZ = await mitte(await rf.$(`[data-n="${n0}"] k-t`));   // «Gestalten» ist aufgegangen, die Karte ist schmaler geworden: neu messen (Gasterntal 17.10.2026)
  await p.mouse.move(boxZ.x + boxZ.width / 2, boxZ.y + boxZ.height / 2); await p.mouse.down(); await p.mouse.move(boxZ.x + boxZ.width / 2 + 30, boxZ.y + boxZ.height / 2 + 20, { steps: 8 });
  const mass = await rf.evaluate(() => document.querySelector('.anr__m').textContent);
  await p.mouse.up(); await warte(400);
  ok('C05', 'Ziehen zeigt das Mass «+x · +y mm» und verschiebt', /mm/.test(mass) && await rf.evaluate((n) => /translate/.test(document.querySelector(`[data-n="${n}"]`).style.transform), n0), mass);
  ok('R08', 'Nach dem Ziehen: Eingaben warten gelb («Speichern»)', /Speichern/.test(await p.textContent('#leiste [data-akt="speichern"]')) && await p.$('#leiste .wo-kn--wartet'));
  await p.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z'); await warte(500);
  ok('C05', '⌘Z nimmt das Ziehen zurück', await rf.evaluate((n) => !(document.querySelector(`[data-n="${n}"]`).style.transform || '').includes('translate'), n0));
  await p.keyboard.press(process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+Shift+z'); await warte(500);
  ok('C05', '⌘⇧Z wiederholt', await rf.evaluate((n) => /translate/.test(document.querySelector(`[data-n="${n}"]`).style.transform || ''), n0));
  // Pfeile im Rahmen (erst zurück an den Platz: verschoben liegt das Element am Handy halb unter dem nächsten Eintrag, der Klick träfe diesen)
  await p.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z'); await warte(500);
  await rf.evaluate(() => document.body.focus());
  const vorP = await rf.evaluate((n) => document.querySelector(`[data-n="${n}"]`).style.transform, n0);
  const bxP = await mitte(await rf.$(`[data-n="${n0}"] k-t`));
  await p.mouse.click(bxP.x + bxP.width / 2, bxP.y + bxP.height / 2); await warte(300);
  await p.keyboard.press('ArrowRight'); await warte(500);
  const nachP = await rf.evaluate((n) => document.querySelector(`[data-n="${n}"]`).style.transform, n0);
  ok('C05', 'Pfeiltaste schiebt 0,5 mm', vorP !== nachP, `${vorP} → ${nachP}`);
  // Gestalten: Schriftart, Grösse, Farbe
  if (!HANDY) {
    await p.click('#gst [data-feld="f"][data-wert="caviar"]'); await warte(700);
    ok('C05', 'Gestalten: Schriftart Caviar Dreams (Schrift des Hauses)', await rf.evaluate((n) => document.querySelector(`[data-n="${n}"]`).hasAttribute('data-gf'), n0));
    await p.click('#gst [data-schritt="pt"][data-r="1"]'); await warte(700);
    ok('C05', 'Gestalten: Schriftgrösse +', await rf.evaluate((n) => document.querySelector(`[data-n="${n}"]`).hasAttribute('data-gt'), n0));
    await p.click('#gst [data-feld="c"][data-wert="gold"]'); await warte(700);
    ok('C05', 'Gestalten: Farbe Gold', await rf.evaluate((n) => document.querySelector(`[data-n="${n}"]`).hasAttribute('data-gc'), n0));
    await p.click('#gst [data-feld="c"][data-wert="gold"]'); await warte(700);
    ok('C05', 'Zweiter Klick auf denselben Wert schaltet ihn ab', await rf.evaluate((n) => !document.querySelector(`[data-n="${n}"]`).hasAttribute('data-gc'), n0));
    await p.click('#gst [data-tu="vorlage"]'); await warte(700);
    ok('C05', '«Teil zurücksetzen»: wie in der Vorlage', await rf.evaluate((n) => { const e = document.querySelector(`[data-n="${n}"]`); return !e.hasAttribute('data-gf') && !/translate/.test(e.style.transform || ''); }, n0));
  }
  // Doppelklick schreibt
  if (HANDY) {   // Platte «Gestalten» schliessen, dann vergrössern
    if (await p.$('#gst:not([hidden]) [data-tu="zu"]')) { await p.click('#gst [data-tu="zu"]'); await warte(300); }
    for (let i = 0; i < 5; i++) { await p.locator('[data-zoom="1"]').scrollIntoViewIfNeeded(); await p.click('[data-zoom="1"]'); await warte(250); } await warte(600);
  }   // am Handy zum Schreiben erst vergrössern (wie ein Mensch, die Schrift wäre sonst 4 px hoch)
  // «Anordnung zurücksetzen» unter der Seite: das oben verschobene Gericht liegt sonst (am Handy) über der nächsten Zeile
  if (!(await rf.$('.anr-zu'))) {   // nichts mehr verschoben (am Rechner hat «Teil zurücksetzen» schon aufgeräumt): einmal mit den Pfeilen verschieben
    const bt = await mitte(await rf.$(`[data-n="${n0}"] k-t`)); await p.mouse.click(bt.x + 3, bt.y + bt.height / 2); await warte(400);
    for (let i = 0; i < 4; i++) { await p.keyboard.press('ArrowDown'); await warte(150); } await warte(500);
  }
  const zr = await rf.$('.anr-zu'); if (zr) { await zr.evaluate(e => e.scrollIntoView({ block: 'center' })); await zr.click(); await warte(900); }
  ok('C05', '«Anordnung zurücksetzen» stellt die Seite wie gesetzt', !!zr && await rf.evaluate((n) => !/translate/.test((document.querySelector(`[data-n="${n}"]`) || {}).style?.transform || ''), n0));
  // genau auf das Wortende zielen: Stelle im Rahmen messen und prüfen, dass dort wirklich «Pour les groupes» liegt (am Handy liegen die Zeilen eng)
  const zielen = async () => { const k = await rf.$('k-t:text-is("Pour les groupes")'); await mitte(k); await k.evaluate(e => e.scrollIntoView({ block: 'nearest', inline: 'center' })); await warte(250);
    const r = await k.evaluate(e => { const q = e.getClientRects()[0], x = q.x + q.width - 3, y = q.y + q.height / 2, t = document.elementFromPoint(x, y); return { x, y, treffer: !!t && e.contains(t) }; });
    const fb = await (await p.$('#vf')).boundingBox(); return { x: fb.x + r.x, y: fb.y + r.y, treffer: r.treffer }; };
  let bb = await zielen();
  await p.mouse.click(bb.x, bb.y); await warte(900); bb = await zielen();   // erst wählen («Gestalten» geht auf, die Vorschau rückt), dann neu zielen
  await p.mouse.dblclick(bb.x, bb.y); await warte(400);
  await rf.evaluate(() => { const a = document.activeElement; if (!a || !a.isContentEditable) return; const r = document.createRange(); r.selectNodeContents(a); r.collapse(false); const g = getSelection(); g.removeAllRanges(); g.addRange(r); });   // Zeiger ans Ende (Taste «Ende» bewegt im Safari-Kern am Mac den Zeiger nicht)
  await p.keyboard.type(' Probe');   // Zeiger ans Ende (am Handy ist die Schrift so klein, dass der Doppelklick vor dem letzten Buchstaben landet)
  await p.keyboard.press('Enter'); await warte(500);
  if (!ok('C05', 'Doppelklick schreibt direkt in die Karte', /groupes\s+Probe/.test(await rf.evaluate(() => document.getElementById('seiten').textContent)), await rf.evaluate(() => { const t = document.getElementById('seiten').textContent, i = t.indexOf('Pour les groupes'); return t.slice(i, i + 60); }))) await bild('fehler-c05');
  await p.keyboard.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s');
  ok('R09', '⌘S speichert (auch aus der Vorschau)', await quit(/Im Entwurf gespeichert|gespeichert/));
  await gesetzt();
  // Daten der Karte als Text
  if (await p.$('#gst:not([hidden]) [data-tu="zu"]')) { await p.click('#gst [data-tu="zu"]'); await warte(300); }
  await p.locator('#kopf [data-akt="daten"]').scrollIntoViewIfNeeded(); await p.click('#kopf [data-akt="daten"]'); await warte(400);
  await p.fill('#j-t', '{ kaputt'); await p.click('#j-ok'); await warte(200);
  ok('C06', 'Daten als Text: Ungültiges wird abgewiesen', /kein gültiges Format/.test(await p.textContent('#j-f')));
  const j = JSON.parse(await p.evaluate(() => document.getElementById('j-t').defaultValue));
  ok('C06', 'Daten als Text enthalten die Seite der Karte', Array.isArray(j) && j.length === 1);
  await zu();
  const bst = (await api(`karte?z=${ES}`)).j.stand;
  const sch = await api('entwurf', { z: ES, daten: { ...bst, seiten: [{ fn: 'seite', a: [bst.seiten[0].a[0], { fn: 'el', a: ['p', ' class="x" data-y="1"', 'x'] }] }] }, was: 'Probe' });
  ok('C06', 'Server weist fremdes HTML ab (neues Merkmal)', sch.s === 400 && sch.j.stichwort === 'PRUEF', sch.j.fehler);
  await bild('04-fortgeschritten');
  if (HANDY) { await p.click('.wo-kopf__ber'); await warte(250); }
  await p.click('.modus [data-m="einfach"]'); await gesetzt();

  // ---------------------------------------------------------------- D Ansicht Website (C07): Expériences, Startseite, Restaurant, Infos
  await p.click('.ansicht [data-ansicht="website"]'); await warte(3000);
  const webOrt = () => p.evaluate(() => { try { return document.getElementById('web-f').contentWindow.location.pathname; } catch (e) { return ''; } });
  ok('C07', 'Ansicht Website: «Expériences» (experiences.html), die Menükarten der Website blinken (so, wie sie heute ist)', /experiences\.html/.test(await webOrt()) && /Expériences/.test(await p.textContent('#v-zahl')) && !(await p.$eval('#webwahl', e => e.hidden)) && await p.evaluate(() => { try { return !!document.getElementById('web-f').contentDocument.querySelector('.menus'); } catch (e) { return false; } }), await p.textContent('#v-zahl'));
  for (const [s, n] of [['index.html', 'Startseite'], ['restaurant.html', 'Restaurant'], ['infos.html', 'Infos']]) {
    await p.click(`#webwahl [data-webseite="${s}"]`); await warte(2500);
    ok('C07', `Ansicht Website: «${n}» (${s})`, new RegExp(s.replace('.', '\\.')).test(await webOrt()) && new RegExp(n).test(await p.textContent('#v-zahl')), await p.textContent('#v-zahl'));
  }
  await p.click('#webwahl [data-webseite="experiences.html"]'); await warte(800);
  await p.click('.ansicht [data-ansicht="karte"]'); await gesetzt();
  ok('C07', 'Zurück zur Karte', !(await p.$eval('#vf', f => f.hidden)) && await p.$eval('#webwahl', e => e.hidden));

  // ---------------------------------------------------------------- E Die anderen Karten des Hauses: Chasse locale (Tischkarte A5) und Les accords (A5)
  await karte('chasse');
  ok('C02', 'Chasse locale: eine Seite A5 mit der Expérience (299 CHF) und den Hinweisen des Hauses', /A5/.test(await p.textContent('#kopf')) && await rahmen().evaluate(() => { const b = document.querySelector('.blatt'); return !!b && /299/.test(b.textContent) && /identique pour tous les convives/.test(b.textContent) && /allergies/.test(b.textContent); }));
  await zeile('L’expérience chasse locale').locator('.r__t').dblclick({ position: { x: 14, y: 10 } }); await warte(500);
  const fc = await p.$$eval('#fenster .felder .feld > span', e => e.map(x => x.textContent));
  ok('C02', 'Chasse locale: Felder Name, Preis, Zusatz, Beschreibung', ['Name', 'Preis', 'Zusatz', 'Beschreibung'].every(f => fc.includes(f)), fc.join(', '));
  await (await p.$('#fenster .felder .feld:has(> span:text-is("Beschreibung")) textarea')).fill('Uniquement durant le mois d’octobre');
  await p.click('#f-ok'); await quit(/gespeichert/); await gesetzt();
  ok('C02', 'Chasse locale: Beschreibung geändert steht in der Tischkarte, Seite bleibt gefüllt (nichts läuft über)', await imRahmen('Uniquement durant le mois d’octobre') && !(await imRahmen('selon les disponibilités')) && !(await p.$('#v-warn:not([hidden])')));
  await p.click('#leiste [data-akt="verwerfen"]'); await warte(300); await p.click('#ja'); await quit(/verworfen/); await gesetzt();
  ok('C09', 'Chasse locale: verworfen, wieder im Wortlaut der Website', await imRahmen('selon les disponibilités'));
  await karte('accords');
  ok('C02', 'Les accords: Satz der Cheffe sommelière und «La carte des vins est régulièrement sujette à modifications.», keine erfundene Weinkarte', await rahmen().evaluate(() => { const t = document.querySelector('.blatt').textContent; return /Lise Donier-Meroz/.test(t) && /sujette à modifications/.test(t) && !/\d{2,3}\s*CHF/.test(t); }));
  const za = await zeile('Lise Donier-Meroz').textContent();
  ok('R20', 'Les accords: Zeile mit Foto des Hauses und dem Satz darunter', /J’aime mettre en avant/.test(za) && !!(await zeile('Lise Donier-Meroz').locator('.r__b').count()));
  await karte(ES);

  // ---------------------------------------------------------------- F Rollen und Sicherheit (5.2)
  const gk = (await api(`karte?z=${ES}`)).j.stand;
  ok('S01', 'Ohne Rolle: 403 ROLLE', (await api('entwurf', { z: ES, daten: gk, was: 'x' }, '')).s === 403);
  ok('S01', 'Unbekannte Rolle (Spa gibt es bei Gilles Varone nicht, C19 betrifft nicht): 403 ROLLE', (await api('probe', { z: ES }, 'spa')).j.stichwort === 'ROLLE');
  ok('S01', 'Küche druckt eine Probe der Karte', (await api('probe', { z: ES }, 'kueche')).s === 200);
  ok('S01', 'Küche veröffentlicht nicht: 403', (await api('veroeffentlichen', { z: ES }, 'kueche')).j.stichwort === 'RECHT');
  ok('S01', 'Service veröffentlicht nicht: 403', (await api('veroeffentlichen', { z: ES }, 'service')).s === 403);
  ok('S01', 'Zurückholen nur Direktion', (await api('zurueckholen', { z: ES, datei: 'grundstand' }, 'service')).s === 403);
  ok('S01', 'Anschluss an die Website nur Direktion', (await api('einstellungen', { anschluss_pdf: true }, 'service')).s === 403);
  ok('S01', 'Daten mit falscher Art (Mittagsmenü für die Satz-Karte): 400 PRUEF', (await api('entwurf', { z: ES, daten: { ziel: ES, art: 'mittag', woche: { ab: '2026-10-12', tage: [{}] } }, was: 'x' })).j.stichwort === 'PRUEF');
  ok('S02', 'Fremde Herkunft: 403 HERKUNFT', (await api('entwurf', { z: ES, daten: gk }, 'direktion', { Origin: 'https://boese.example' })).j.stichwort === 'HERKUNFT');
  ok('S02', 'Nur JSON: 415', (await fetch(BASIS + '/_werkzeuge/carte/api/entwurf', { method: 'POST', headers: { 'Content-Type': 'text/plain', Origin: BASIS }, body: 'x' })).status === 415);
  ok('S02', 'Über 3 MB: 413', await new Promise(r => { const q = require('http').request({ host: '127.0.0.1', port: PORT, path: '/_werkzeuge/carte/api/entwurf', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': 3100000, Origin: BASIS, 'X-Carte-Rolle': 'direktion' } }, res => r(res.statusCode === 413)); q.on('error', () => r(false)); q.write('{}'); }));
  ok('S02', 'Falscher Host: 421', await new Promise(r => { require('http').get({ host: '127.0.0.1', port: PORT, path: '/_werkzeuge/carte/api/status', headers: { Host: 'boese.example' } }, res => r(res.statusCode === 421)).on('error', () => r(false)); }));
  ok('S02', 'Gesperrte Pfade (_daten, .py) nicht ausgeliefert', (await fetch(BASIS + '/_werkzeuge/carte/_daten/stand/experiences.json')).status === 404 && (await fetch(BASIS + '/_werkzeuge/carte/satz_bau.py')).status === 404 && (await fetch(BASIS + '/_werkzeuge/carte/carte.py')).status === 404 && (await fetch(BASIS + '/bau.py')).status === 404 && (await fetch(BASIS + '/inhalt/haus.json')).status === 404);
  const csp = (await fetch(BASIS + '/_werkzeuge/carte/')).headers.get('content-security-policy') || '';
  ok('S02', 'Sicherheitskopfzeilen (CSP, frame-ancestors)', /default-src 'self'/.test(csp) && /frame-ancestors 'self'/.test(csp));
  const sk = { ...gk, seiten: JSON.parse(JSON.stringify(gk.seiten)) };
  sk.seiten[0].a.push('<script>alert(1)</script>');
  ok('S02', 'Programmcode im Text: 400 PRUEF', (await api('entwurf', { z: ES, daten: sk, was: 'x' })).j.stichwort === 'PRUEF');

  // ---------------------------------------------------------------- G Prüfseite, Export, Fehlermelder, Startfehler, Rundgang, Zur Werkbank (C14, C15, R03, R04, R18, R19, R23)
  const pr = await ctx.newPage(); horch(pr); await pr.bringToFront();
  await pr.goto(BASIS + '/_werkzeuge/carte/pruefung.html', { waitUntil: 'load' }); await warte(1500);
  const prt = await pr.textContent('body');
  ok('C14', 'Prüfseite: Browser, Server, Karten, Druck, Sicherungen, Fehler', ['Les expériences', 'Chasse locale', 'Les accords', 'Sicherung', 'Druck'].every(x => prt.includes(x)), prt.slice(0, 80).replace(/\s+/g, ' '));
  const [dl] = await Promise.all([pr.waitForEvent('download', { timeout: 15000 }).catch(() => null), pr.click('a[href*="api/export"]').catch(() => null)]);
  let exp = null; if (dl) { const f = path.join(BELEG, 'export.json'); await dl.saveAs(f); exp = JSON.parse(fs.readFileSync(f, 'utf8')); }
  ok('C15', 'Alle Daten herunterladen: jede Karte mit Stand, Ursprung, Verlauf und Protokoll', exp && Object.keys(exp.karten).length === 3 && exp.karten[ES].ursprung && Object.keys(exp.karten[ES].verlauf).length >= 1 && exp.protokoll.length > 3);
  await p.bringToFront(); await p.evaluate(() => setTimeout(() => { throw new Error('Prüffehler Tal'); }, 0)); await warte(800);
  const bf = (await api('gesund')).j.browserfehler || [];
  ok('R03', 'Fehlermelder: Skriptfehler kommt im Server an', bf.some(x => /Prüffehler Tal/.test(x.text)));
  fehlerKonsole.splice(0, fehlerKonsole.length, ...fehlerKonsole.filter(x => !/Prüffehler Tal/.test(x)));
  const st = await ctx.newPage();
  await st.route('**/api/status', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"fehler":"Probe","stichwort":"SERVER"}' }));
  await st.goto(BASIS + '/_werkzeuge/carte/', { waitUntil: 'load' }); await st.waitForFunction(() => /startet nicht/.test(document.body.textContent), null, { timeout: 15000 }).catch(() => {});   // drei stille Versuche (1,2 s + 3 s), dann die Tür
  ok('R04', 'Startfehler-Tür «Karten & Preislisten starten nicht.» mit «Prüfung öffnen»', /Karten & Preislisten starten nicht/.test(await st.textContent('body')) && !!(await st.$('a[href*="pruefung.html"]')));
  await st.close(); await p.bringToFront();
  const rg = await br.newContext({ viewport: { width: W, height: H } }); await rg.addInitScript(() => { localStorage.setItem('lc-wer', 'Probe'); localStorage.setItem('lc-rolle', 'direktion'); }); const rp = await rg.newPage();
  await rp.goto(BASIS + '/_werkzeuge/carte/?rundgang', { waitUntil: 'load' }); await rp.waitForSelector('.rdg-kegel', { timeout: 12000 }).catch(() => {}); await warte(600);
  ok('R18', 'Rundgang (?rundgang): Lichtkegel und Karte mit Text', !!(await rp.$('.rdg-kegel')) && /Speisekarten/.test(await rp.textContent('.rdg-karte')));
  await rg.close();
  await p.bringToFront(); await p.goto(BASIS + '/_werkzeuge/carte/?wb=de.werkzeuge#experiences', { waitUntil: 'load' }); await gesetzt(); await warte(800);
  ok('R19', '«Zur Werkbank» erscheint, wenn aus der Werkbank geöffnet', await p.evaluate(() => !!document.querySelector('[data-zw], .zw-knopf, a[href*="werkbank"]')));

  // ---------------------------------------------------------------- H Zwei Fenster, Netz weg, Verlassen (Abschnitt 8) · Deckel und Kasten der Karte
  const oeffne = async (pg, text) => { await pg.locator('#liste .r', { hasText: text }).first().locator('.r__t').evaluate(e => { e.scrollIntoView({ block: 'center' }); e.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); }); await warte(400); };
  const erstes = (pg) => pg.$('#fenster .felder input, #fenster .felder textarea');
  await p.goto('about:blank'); await p.goto(BASIS + '/_werkzeuge/carte/#experiences', { waitUntil: 'load' }); await gesetzt();
  if (await p.$('.modus [data-m="einfach"][aria-pressed="false"]')) { if (HANDY) { await p.click('.wo-kopf__ber'); await warte(250); } await p.click('.modus [data-m="einfach"]'); await gesetzt(); }
  const p2 = await ctx.newPage(); horch(p2);
  await p2.goto(BASIS + '/_werkzeuge/carte/#experiences', { waitUntil: 'load' }); await p2.waitForFunction(() => /Seite/.test(document.querySelector('#v-zahl')?.textContent || ''));
  await p.bringToFront(); await bild('05-vor-zwei-fenster'); await oeffne(p, 'Veuillez noter');
  await (await erstes(p)).fill('Veuillez noter A'); await p.click('#f-ok'); await quit(/gespeichert/);
  await p2.bringToFront(); await oeffne(p2, 'Je vous propose');
  await (await erstes(p2)).fill('Je vous propose B'); await p2.click('#f-ok'); await warte(800);
  ok('A08', 'Zwei Fenster: das zweite bekommt KONFLIKT, nichts überschrieben', /KONFLIKT|Inzwischen hat/.test(await p2.textContent('#meldung')) && /Veuillez noter A/.test(JSON.stringify((await api(`karte?z=${ES}`)).j.entwurf)) && !/Je vous propose B/.test(JSON.stringify((await api(`karte?z=${ES}`)).j.entwurf)));
  await p2.close(); await p.bringToFront();
  await oeffne(p, 'Veuillez noter A');
  await (await erstes(p)).fill('Veuillez noter C'); OFFLINE = true; await ctx.setOffline(true); await p.click('#f-ok'); await warte(800);
  ok('A08', 'Netz weg beim Speichern: Meldung VERBINDUNG', /VERBINDUNG|Keine Verbindung/.test(await p.textContent('#meldung')));
  await ctx.setOffline(false); await warte(1000); OFFLINE = false;   // Meldungen des Browsers während «Netz weg» gehören zur Probe (WebKit: «internal error»)
  // Ungewöhnliche Eingaben
  await oeffne(p, 'Merci de nous signaler');
  const lang = 'Seeufer'.repeat(715);
  await (await erstes(p)).fill(lang); await p.click('#f-ok'); await warte(1200);
  ok('A08', '5\'000 Zeichen ohne Leerzeichen: abgewiesen «Der Text ist zu lang», Eingabe bleibt gelb, kein Verrutschen', /zu lang/.test(await p.textContent('#meldung')) && /Speichern/.test(await p.textContent('#leiste [data-akt="speichern"]')) && (await breit()) <= 0 && await p.evaluate(() => { const r = [...document.querySelectorAll('#liste .r')].find(x => /Seeufer/.test(x.textContent)); return !!r && r.scrollWidth <= r.clientWidth + 1; }));
  await p.click('#leiste [data-akt="verwerfen"]').catch(() => {}); await warte(300); if (await p.$('#ja')) { await p.click('#ja'); await quit(/verworfen/); } await gesetzt();
  await oeffne(p, 'Merci de nous signaler');
  await (await erstes(p)).fill('Seeufer'.repeat(557)); await p.click('#f-ok'); await quit(/gespeichert/); await gesetzt();
  ok('A08', '3\'900 Zeichen ohne Leerzeichen: gespeichert, bricht in der Liste um', /Seeufer/.test(JSON.stringify((await api(`karte?z=${ES}`)).j.entwurf || {})) && (await breit()) <= 0 && await p.evaluate(() => { const r = [...document.querySelectorAll('#liste .r')].find(x => /Seeufer/.test(x.textContent)); return !!r && r.scrollWidth <= r.clientWidth + 1; }));
  await oeffne(p, 'Je vous propose');
  await (await erstes(p)).fill('Gäste ⛵ am See: «Ä Ö Ü» <script>alert(1)</script>'); await p.click('#f-ok'); await warte(900);
  ok('A08', '<script> im Text: abgewiesen mit Meldung, Eingabe bleibt gelb', /Programmcode|PRUEF/.test(await p.textContent('#meldung')) && /Speichern/.test(await p.textContent('#leiste [data-akt="speichern"]')));
  await oeffne(p, 'Gäste ⛵');
  await (await erstes(p)).fill('Gäste ⛵ am See: «Ä Ö Ü»'); await p.click('#f-ok'); await quit(/gespeichert/); await gesetzt();
  ok('A08', 'Emoji und Umlaute stehen in der Karte', await imRahmen('Gäste ⛵ am See: «Ä Ö Ü»'));
  // Verlassen mit ungespeicherten Eingaben (R13)
  if (HANDY) { await p.click('.wo-kopf__ber'); await warte(250); }
  await p.click('.modus [data-m="frei"]'); await gesetzt();
  const kt2 = await rahmen().$('k-t:text("Gäste ⛵")'); await kt2.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' })); await warte(200); const b2 = await mitte(kt2);   // am Handy ist die Vorschau aus Abschnitt C noch vergrössert: seitlich zur Stelle
  await p.mouse.click(b2.x + 4, b2.y + b2.height / 2); await warte(400); for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowDown'); await warte(150); } await warte(400);   // verschieben: Eingabe wartet ungespeichert
  if (!ok('R13', 'Ungespeicherte Verschiebung: Leiste gelb', /Speichern/.test(await p.textContent('#leiste [data-akt="speichern"]')), JSON.stringify(b2))) await bild('fehler-r13');
  let dialog = false; p.once('dialog', d => { dialog = true; d.accept().catch(() => {}); });
  await p.goto('about:blank').catch(() => {}); await warte(500);
  ok('R13', 'Verlassen mit ungespeicherten Eingaben: der Browser fragt', dialog || BROWSER === 'webkit', BROWSER === 'webkit' ? 'Safari-Kern zeigt beforeunload in Playwright nicht (Ereignis gesetzt)' : '');

  // ---------------------------------------------------------------- Abschluss
  const fk = fehlerKonsole.filter(x => !/favicon/.test(x));
  ok('A99', 'Keine Skriptfehler auf allen Seiten', !fk.length, fk.slice(0, 3).join(' | '));
  const fn = fehlerNetz.filter(x => !/api\/(karte|status|webseite|verlauf)/.test(x));
  ok('A99', 'Keine toten Adressen', !fn.length, fn.slice(0, 4).join(' | '));
  fs.writeFileSync(path.join(BELEG, 'ergebnis.json'), JSON.stringify({ browser: BROWSER, breite: W, hoehe: H, gruen: nr - rot, gesamt: nr, zeilen: ergebnis }, null, 1));
  console.log(`\n${BROWSER} ${W}×${H}: ${nr - rot} von ${nr} grün`);
  await br.close(); srv.kill();
  fs.rmSync(TMP, { recursive: true, force: true });
  process.exit(rot ? 1 : 0);
})().catch(e => { console.error('ABBRUCH', e); if (srv) srv.kill(); process.exit(2); });
