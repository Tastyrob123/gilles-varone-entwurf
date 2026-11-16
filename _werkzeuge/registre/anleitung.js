/* Anleitung Besucher · Restaurant Gilles Varone: Bild gross mit Klick, Esc schliesst; das Zeichen des Hauses (das Monogramm GV, /assets/svg/zeichen.svg)
   (eigene Datei: online laufen eingebettete Skripte ohne Prüfsumme nicht). */
(function () {
  var g = document.getElementById('gross'), im = g.querySelector('img');
  function zu() { g.hidden = true; }
  document.addEventListener('click', function (e) { var b = e.target.closest('.bild'); if (b) { im.src = b.querySelector('img').src; im.alt = b.querySelector('img').alt; g.hidden = false; } else if (e.target.closest('#gross')) zu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') zu(); });
  /* Auftritte beim Scrollen (HAUS-GV.md): Themen und Kapitel unter dem ersten Bildschirm schweben herein, ihr Bild zoomt im Rahmen. Nur transform, deckend. */
  try {
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var io = new IntersectionObserver(function (l) { l.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('da'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('.thema, .kap, .fuss').forEach(function (el) { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('auf'); io.observe(el); } });
    }
  } catch (e) { /* ohne Auftritt steht alles sofort da */ }
  fetch('/assets/svg/zeichen.svg').then(function (r) { return r.text(); }).then(function (t) { var m = t.match(/<svg[^>]*>([\s\S]*)<\/svg>/); if (m) document.getElementById('zeichen').innerHTML = m[1].replace(/<defs>[\s\S]*?<\/defs>/g, '').replace(/ class="[^"]*"/g, ''); }).catch(function () {});
})();
