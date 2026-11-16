/* Besucher · Restaurant Gilles Varone: Zählung auf der Website (Tasty Studios 09.11.2026). VORSCHLAG, NICHT EINGEBAUT: die Website
   (Stamm des Projekts, bau.py) ändert nur der Website-Chat bzw. der Haupt-Chat auf Roberts Wort; hochgeladen wird nichts.
   Ziel beim Einbau: assets/js/messung.js der Website, auf jeder der fünf Seiten vor </body> als <script src="assets/js/messung.js?v=…" defer></script> nach gv.js
   (in bau.py dort, wo gv.js eingebunden wird). Kopie der messung.js der Vorlage (Wirtschaft am Schlössli, dort aus dem Gasterntal), Wege von Gilles Varone.

   Je Seite geht eine Zeile an /api/registre (lokal der Server der Besucher, online die Funktion api/registre.py, gleiche Adresse):
       r1 <seitenaufruf> <datei> <sprache> <geraet> <sekunden> <ereignisse|-> <herkunft|->
   einmal beim Öffnen (0 Sekunden), bei jedem gezählten Klick und beim Verlassen (Sekunden, in denen die Seite sichtbar war).
   Ohne Cookies und ohne Kennung im Gerät: «seitenaufruf» ist eine Zufallsfolge, die nur in dieser Variablen lebt und mit der Seite endet.
   Dass die Seiten eines Besuchs zusammenfinden, Land und Ort bestimmt der Server aus der Verbindung (registre.py); die Adresse speichert er nicht.
   «herkunft» ist nur der Name der Website, von der der Gast kam (zum Beispiel guide.michelin.com), nie die ganze Adresse.
   «sprache» ist die Sprache des Browsers (die Website spricht Französisch), sonst «xx».
   Nicht gezählt: automatische Browser (Prüfläufe), Seiten im Rahmen, die Werkzeuge und Beigaben des Hauses (_werkzeuge, werkbank …), Varianten- und
   Studienseiten und Geräte mit der Marke «varone-nicht-zaehlen» im localStorage (das Einzige, was je im Gerät steht).

   Ereignisse (Schlüssel wie in allen Häusern, Bedeutung bei Gilles Varone; die Website hat kein eigenes Fenster und kein Formular):
     booking  «Réserver une table» / «Réserver» angeklickt (Link zu bookings.zenchef.com, Restaurant 360467)
     tisch    «Bon cadeau» angeklickt (Link zum Shop von e-guma, shop.e-guma.ch/gillesvarone)
     anruf    Telefonnummer des Hauses angeklickt (027 565 89 20, tel:+41275658920)
     mail     Mail-Adresse angeklickt (mailto:info@gillesvarone.ch; die Bewerbung an restaurantgillesvarone@gmail.com zählt nicht)
     chat     Instagram oder Facebook des Hauses geöffnet (instagram.com/gillesvarone, facebook.com/restaurantgillesvarone)
     route    «Itinéraire» geöffnet (Link zu Google Maps auf infos.html)
   fenster, buchung und anfrage bleiben Schlüssel wie in den anderen Häusern, kommen hier aber nicht vor. */
(function () {
  'use strict';
  var n = navigator, d = document, w = window;
  if (w.__registre || !n.sendBeacon || n.webdriver || w.self !== w.top) return;
  try { if (w.localStorage.getItem('varone-nicht-zaehlen') === '1') return; } catch (e) { /* privat: zählt normal */ }
  var teile = location.pathname.split('/'), datei = teile.pop() || 'index.html';
  if (teile.length > 2 || /^(studio|_werkzeuge|werkzeuge|werkbank|_werkbank|maison|marke|reception|registre|imprimerie|unterlagen|drucksachen|feed|material|bearbeitet)$/.test(teile[1] || '')) return;
  if (!/^[a-z0-9-]{1,60}\.html$/.test(datei) || /varianten|^konzept|^bildauswahl|^vorschau|^404/.test(datei)) return;
  w.__registre = 1;
  var SPRACHEN = ' de en fr it nl es pt zh ja ko ar ';
  var sp = String(n.language || 'de').slice(0, 2).toLowerCase();
  if (SPRACHEN.indexOf(' ' + sp + ' ') < 0) sp = 'xx';
  var breit = function (px) { return !!(w.matchMedia && w.matchMedia('(max-width:' + px + 'px)').matches); };
  var geraet = breit(700) ? 'handy' : breit(1060) ? 'tablet' : 'rechner';
  var her = '-';
  try { var r = d.referrer ? new URL(d.referrer).hostname.toLowerCase() : ''; if (r && r !== location.hostname && /^[a-z0-9.-]{3,60}$/.test(r)) her = r; } catch (e) {}
  var HAUS_TEL = /^tel:\+?(41275658920|0275658920)$/;
  var pv, war, liste, sichtbar, seit, gesendet;
  function neu() {
    pv = (Math.random().toString(36) + '000000').slice(2, 8);
    war = {}; liste = []; sichtbar = 0; gesendet = '';
    seit = d.visibilityState === 'hidden' ? 0 : Date.now();
    sende();
  }
  function sek() { return Math.min(1800, Math.round((sichtbar + (seit ? Date.now() - seit : 0)) / 1000)); }
  function sende() {
    var zeile = 'r1 ' + pv + ' ' + datei + ' ' + sp + ' ' + geraet + ' ' + sek() + ' ' + (liste.length ? liste.join(',') : '-') + ' ' + her;
    if (zeile === gesendet) return;
    gesendet = zeile;
    try { n.sendBeacon('/api/registre', zeile); } catch (e) {}   /* wartet auf keine Antwort */
  }
  function zaehle(was) {
    if (war[was]) return;
    war[was] = 1; liste.push(was);
    sende();
  }
  function weg() { if (seit) { sichtbar += Date.now() - seit; seit = 0; } sende(); }
  neu();
  d.addEventListener('visibilitychange', function () { if (d.visibilityState === 'hidden') weg(); else if (!seit) seit = Date.now(); });
  w.addEventListener('pagehide', weg);
  w.addEventListener('pageshow', function (e) { if (e.persisted) neu(); });   /* zurück aus dem Seitenspeicher des Browsers: neuer Aufruf */

  d.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var a = t.closest('a[href]'); if (!a) return;
    var h = (a.getAttribute('href') || '').replace(/\s/g, ''), host = (a.hostname || '').toLowerCase();
    if (/(^|\.)zenchef\.com$/.test(host)) zaehle('booking');
    else if (/(^|\.)e-guma\.ch$/.test(host)) zaehle('tisch');
    else if (/^tel:/i.test(h)) { if (HAUS_TEL.test(h)) zaehle('anruf'); }
    else if (/^mailto:info@gillesvarone\.ch/i.test(h)) zaehle('mail');
    else if (/(^|\.)instagram\.com$|(^|\.)facebook\.com$/.test(host)) zaehle('chat');
    else if (/(^|\.)maps\.app\.goo\.gl$|(^|\.)google\.[a-z.]+$/.test(host) && /maps|^\/[A-Za-z0-9]+$/.test((a.hostname || '') + (a.pathname || ''))) zaehle('route');
  }, true);
})();
