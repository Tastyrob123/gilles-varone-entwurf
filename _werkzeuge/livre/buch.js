/* Markenbuch · Restaurant Gilles Varone (Kopie aus dem Markenbuch des Bildarchivs der Wirtschaft am Schlössli, dort nur gelesen).
   «Als PDF sichern» öffnet das Druckfenster des Browsers (je Kapitel eine A4-Seite quer, buch.css @media print).
   Fotos laden zuerst nur im Blick (lazy); kurz nach dem Laden und vor jedem Druck werden alle geholt, damit im PDF keines fehlt. */
'use strict';
(function () {
  const alle = () => Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.complete ? 0 : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }); }));   /* addEventListener statt onload: ein zweiter Aufruf (nach dem Laden) überschrieb sonst den ersten, der Druck kam nie (Demo-Check 21.10.2026) */
  const b = document.getElementById('bu-pdf');
  if (b) b.addEventListener('click', () => alle().then(() => window.print()));
  addEventListener('beforeprint', () => { [...document.images].forEach(i => { i.loading = 'eager'; }); });
  addEventListener('load', () => setTimeout(alle, 1200));
})();

/* Auftritte (Robert 18.10.2026 und 09.11.2026: «diese Animationen, dieses luxuriöse, edle, überall … zum Hochscrollen»).
   Jeder Block [data-a] schwebt 40 px von unten an seinen Platz, sobald ein Fünftel im Bild ist (Staffel höchstens vier), einmal, kein Rücksprung.
   Was beim Öffnen im ersten Bild steht, kommt sofort der Reihe nach. Fotos und Zeichen zoomen in ihren Rahmen, Farbfelder und abgeleitete Töne füllen sich
   von links. Nur transform und clip-path: alles ist von Anfang an deckend. «Weniger Bewegung»: alles steht sofort. */
(function () {
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bloecke = [...document.querySelectorAll('[data-a]')];
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  if (!location.hash) scrollTo(0, 0);
  if (ruhig || !('IntersectionObserver' in window)) { bloecke.forEach(x => x.classList.add('da')); return; }
  const ez = 'cubic-bezier(.16,1,.3,1)', st = document.createElement('style');
  st.textContent = '@media screen{'
    + `html.bu5 .fz__b,html.bu5 .bild,html.bu5 .bl figure,html.bu5 .wz__b,html.bu5 .zg__gross,html.bu5 .rf__b{overflow:hidden}`
    + `html.bu5 [data-a] .fz__b>img,html.bu5 [data-a] .bild img,html.bu5 .bl [data-a] img,html.bu5 [data-a].wz .wz__b img,html.bu5 .zg__gross svg,html.bu5 [data-a] .rf__b img,html.bu5 [data-a].eh .eh__b img{scale:1.08;transition:scale 1.7s ${ez} .12s}`
    + `html.bu5 [data-a].da .fz__b>img,html.bu5 [data-a].da .bild img,html.bu5 .bl [data-a].da img,html.bu5 [data-a].wz.da .wz__b img,html.bu5 .zg__gross.da svg,html.bu5 [data-a].da .rf__b img,html.bu5 [data-a].eh.da .eh__b img{scale:1}`
    + `html.bu5 .fz__f{clip-path:inset(0 100% 0 0);transition:clip-path 1s ${ez} .35s}html.bu5 .fz.da .fz__f{clip-path:inset(0)}`
    + `html.bu5 .fz__s span{clip-path:inset(0 100% 0 0);transition:clip-path .8s ${ez};transition-delay:calc(.55s + var(--i,0) * 90ms)}html.bu5 .fz.da .fz__s span{clip-path:inset(0)}`
    + `html.bu5 .tp{background-position:0 24px;transition:background-position 1.6s ${ez}}html.bu5 .tp.da{background-position:0 0}`
    + '}@media print{html.bu5 [data-a] img,html.bu5 .fz__f,html.bu5 .fz__s span{scale:1!important;clip-path:none!important}}';
  document.head.appendChild(st);
  document.querySelectorAll('.fz__s').forEach(g => [...g.children].forEach((s, i) => s.style.setProperty('--i', i)));
  document.documentElement.classList.add('bu5');
  const H = innerHeight; let n = 0;
  const io = new IntersectionObserver(es => { let k = 0; es.forEach(x => { if (x.isIntersecting && (x.intersectionRatio >= 0.2 || x.intersectionRect.height >= innerHeight * 0.2)) { x.target.style.setProperty('--bw-i', Math.min(k++, 3)); x.target.classList.add('da'); io.unobserve(x.target); } }); },
    { threshold: [0, 0.05, 0.1, 0.15, 0.2] });
  bloecke.forEach(x => { const r = x.getBoundingClientRect(); if (r.top < H && r.bottom > 0) { x.style.setProperty('--bw-i', Math.min(n++, 3)); requestAnimationFrame(() => requestAnimationFrame(() => x.classList.add('da'))); } else io.observe(x); });
  addEventListener('beforeprint', () => bloecke.forEach(x => x.classList.add('da')));
})();
