/* Anleitung Markenbuch · Bild gross: Klick macht das Bild gross, ein zweiter Klick oder Esc schliesst (eigene Datei, keine eingebetteten Skripte, Falle 9). */
'use strict';
(function () {
  var g = document.getElementById('gross'), im = g.querySelector('img');
  function zu() { g.hidden = true; }
  document.addEventListener('click', function (e) { var b = e.target.closest('.bild'); if (b) { im.src = b.querySelector('img').src; im.alt = b.querySelector('img').alt; g.hidden = false; } else if (e.target.closest('#gross')) zu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') zu(); });
})();

/* Auftritte (Robert 09.11.2026: «diese Animationen … überall»): was unter dem ersten Bildschirm steht, schwebt 40 px von unten an seinen Platz,
   sobald es auftaucht. Nur transform, deckend ab dem ersten Bild, einmal. «Weniger Bewegung»: alles steht. */
(function () {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var H = innerHeight, els = [].slice.call(document.querySelectorAll('.thema, .kap__t, .kap__b'));
  var io = new IntersectionObserver(function (es) { var k = 0; es.forEach(function (e) { if (e.isIntersecting) { e.target.style.setProperty('--i', Math.min(k++, 3)); e.target.classList.add('da'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
  els.forEach(function (el) { if (el.getBoundingClientRect().top >= H) { el.classList.add('auf'); io.observe(el); } });
})();
