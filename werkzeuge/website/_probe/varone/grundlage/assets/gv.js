/* Restaurant Gilles Varone · Designstudie Tasty Studios
   Erster Blick komplett, Auftritte deckend von unten, Titel aus dem Schlitz, Leiste kommt und geht,
   Wahl des Auftakts, Werte zum Antippen, Filmstreifen der Teller, Zähler. Nativer Scroll, nur transform. */
(function () {
  var html = document.documentElement;
  var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]nomotion/.test(location.search);
  if (ruhig) html.classList.add('ruhig');

  /* ---------- Kopf 45: Varianten zur Wahl (Robert wählt per Nummer), html[data-v] ---------- */
  var NAMEN = {0: 'Aujourd’hui', 1: 'Blanc pur', 2: 'Image noir et blanc', 3: 'Nom en or', 4: 'Tablette de nuit', 5: 'Carte claire', 6: 'Duotone de la maison',
    7: 'Trait plus fort', 8: 'Passe-partout', 9: 'Contraste plein', 10: 'Filets d’or', 11: 'Bandeau de nuit', 12: 'Noir et blanc, nom en or'};
  var REIHE = Object.keys(NAMEN).map(Number);
  var wahl = document.querySelector('.wahl'), held = document.querySelector('.held');
  function setzeFassung(n) {
    if (REIHE.indexOf(n) < 0) n = REIHE[0];
    html.setAttribute('data-v', n);
    try { localStorage.setItem('gv-v', n); } catch (e) {}
    if (wahl) wahl.querySelector('span').textContent = n + ' · ' + NAMEN[n];
    var u = new URL(location.href); u.searchParams.set('v', n); history.replaceState(null, '', u);
    return n;
  }
  if (wahl) {
    setzeFassung(+html.dataset.v || 0);
    var wechsel = function (n) {
      setzeFassung(n);
      if (!held) return;
      held.querySelectorAll('h1').forEach(function (h) { delete h.dataset.zeilen; zeilen(h); });
      held.classList.remove('spiel'); void held.offsetWidth; held.classList.add('spiel');
    };
    wahl.querySelector('[data-w="-"]').addEventListener('click', function () { var i = REIHE.indexOf(+html.dataset.v); wechsel(REIHE[(i - 1 + REIHE.length) % REIHE.length]); });
    wahl.querySelector('[data-w="+"]').addEventListener('click', function () { var i = REIHE.indexOf(+html.dataset.v); wechsel(REIHE[(i + 1) % REIHE.length]); });
  }


  /* ---------- Übergang Fenster → Geste: Varianten zur Wahl (html[data-g]) ---------- */
  (function () {
    var w = document.querySelector('.wahl-g'); if (!w) return;
    var N = {1: 'Le grand titre', 2: 'Le panorama', 3: 'Le texte dans le mur', 4: 'Le chef au milieu', 5: 'Les deux murs', 6: 'Les fenêtres', 7: 'L’escalier', 8: 'La citation en tête', 9: 'Le passe-partout', 10: 'La planche', 11: 'Le mur qui reste', 12: 'Le magazine', 13: 'La colonne', 14: 'Le journal', 15: 'Salle et cuisine'};
    function setze(n) { n = ((((n - 1) % 15) + 15) % 15) + 1; html.setAttribute('data-g', n); try { localStorage.setItem('gv-a', n); } catch (e) {} w.querySelector('span').textContent = n + ' · ' + N[n]; var u = new URL(location.href); u.searchParams.set('g', n); history.replaceState(null, '', u);
      document.querySelectorAll('.acc img').forEach(function (i) { laden(i); }); }
    setze(+html.dataset.g || 1);
    w.querySelector('[data-w="-"]').addEventListener('click', function () { setze(+html.dataset.g - 1); });
    w.querySelector('[data-w="+"]').addEventListener('click', function () { setze(+html.dataset.g + 1); });
    /* Die Wahl erscheint nur, solange der Übergang im Bild ist; der Link springt direkt dorthin */
    var ziel = function () { return document.querySelector('.acc'); };
    var teile = [document.querySelector('.acc')].filter(Boolean), sichtbar = new Set();
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) sichtbar.add(e.target); else sichtbar.delete(e.target); }); w.classList.toggle('an', sichtbar.size > 0); }, { threshold: 0.15 });
    teile.forEach(function (t) { io.observe(t); });
    /* Pfeiltasten links/rechts wechseln die Fassung, ohne zu klicken */
    addEventListener('keydown', function (e) {
      if (e.altKey || e.metaKey || e.ctrlKey || /input|textarea|select/i.test((e.target.tagName || ''))) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setze(+html.dataset.g + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setze(+html.dataset.g - 1); }
    });
    if (location.hash === '#restaurant') {
      history.scrollRestoration = 'manual';
      var spring = function () { var z = ziel(); if (z) scrollTo(0, z.getBoundingClientRect().top + scrollY - 70); };
      spring(); addEventListener('load', spring); setTimeout(spring, 400);
    }
  })();

  /* ---------- Filme im Kopf: nur der sichtbare lädt und läuft, ohne Ton, in Schleife ---------- */
  function filme() {
    if (!held) return;
    var handy = matchMedia('(max-width:860px)').matches;
    held.querySelectorAll('.held__film').forEach(function (f) {
      var v = f.querySelector('video'), sicht = !!f.getClientRects().length && getComputedStyle(f).display !== 'none';
      if (sicht && !ruhig) {
        if (!v.getAttribute('src')) { var pi = f.querySelector('img'); if (pi && pi.currentSrc) v.poster = pi.currentSrc; v.src = handy ? v.dataset.srcM : v.dataset.src; }
        v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {});
      } else if (!v.paused) v.pause();
    });
  }

  /* ---------- Bilder: erst das erste Bild, dann der Rest in Reihenfolge ---------- */
  /* Ein Bild zeigt sich erst, wenn es ganz geladen und dekodiert ist: nie halb gezeichnet, bis dahin steht die Grundfarbe des Rahmens */
  function deckend(img) {
    function auf() { img.classList.remove('laedt'); }
    function da() { if (img.decode) img.decode().then(auf, auf); else auf(); }
    if (img.complete && img.naturalWidth) return;
    img.classList.add('laedt');
    img.addEventListener('load', da, { once: true }); img.addEventListener('error', auf, { once: true });
  }
  function laden(img, vorne) {
    if (vorne && 'fetchPriority' in img) img.fetchPriority = 'high';
    if (img.dataset.src) { if (img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); } img.src = img.dataset.src; img.removeAttribute('data-src'); deckend(img); }
  }
  function sichtbarImErsten(img) {
    if (!img.getClientRects().length) return false;
    var r = img.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }
  var erste = [].slice.call(document.querySelectorAll('img')).filter(sichtbarImErsten);
  erste.forEach(function (i) { i.decoding = 'sync'; i.loading = 'eager'; laden(i, true); });
  /* der erste Blick wartet, bis jedes Bild darin geladen und dekodiert ist (auch auf langsamer Leitung) */
  var warten = erste.map(function (i) {
    return new Promise(function (ok) {
      function fertig() { if (i.decode) i.decode().then(ok, ok); else ok(); }
      if (i.complete && i.naturalWidth) return fertig();
      i.addEventListener('load', fertig, { once: true }); i.addEventListener('error', ok, { once: true });
    });
  });
  if (document.fonts && document.fonts.ready) warten.push(document.fonts.ready);
  /* der nächste Abschnitt lädt gleich mit, ohne dass der erste Blick darauf wartet */
  [].forEach.call(document.querySelectorAll('img[data-src]'), function (i) {
    if (!i.getClientRects().length) return;
    var r = i.getBoundingClientRect();
    if (r.top < innerHeight * 2.2) laden(i);
  });
  /* Notbremse nur für eine abgerissene Leitung; die CSS-Notbremse in gv.css greift erst danach */
  var zeit = new Promise(function (ok) { setTimeout(ok, 20000); });
  Promise.race([Promise.all(warten), zeit]).then(zeigen);

  function rest() {
    var alle = [].slice.call(document.querySelectorAll('img[data-src]'));
    /* was in die Nähe des Blicks kommt, lädt sofort, vor der Reihe */
    if ('IntersectionObserver' in window) {
      var nah = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { laden(e.target, true); nah.unobserve(e.target); } });
      }, { rootMargin: '180% 0px 180% 0px' });
      alle.forEach(function (im) { var z = im.closest('figure,.vue__b') || im; if (z.getClientRects().length) nah.observe(im); });
    }
    var i = 0, laufend = 0;
    function weiter() {
      while (laufend < 4 && i < alle.length) {
        var im = alle[i++];
        if (!im.dataset.src) continue;
        laufend++;
        im.addEventListener('load', fertig, { once: true }); im.addEventListener('error', fertig, { once: true });
        if ('fetchPriority' in im) im.fetchPriority = 'low';
        laden(im);
      }
    }
    function fertig() { laufend--; weiter(); }
    weiter();
  }

  /* ---------- Titel in Zeilen für den Schlitz ---------- */
  function zeilen(el) {
    if (el.dataset.zeilen) return;
    el.dataset.zeilen = '1';
    if (!el.dataset.text) el.dataset.text = el.textContent.trim();
    var woerter = el.dataset.text.split(/[ \t\n\r]+/);
    el.innerHTML = woerter.map(function (w) { return '<span class="w" style="white-space:nowrap">' + w + '</span>'; }).join(' ');
    var reihen = [], top = null;
    [].forEach.call(el.querySelectorAll('.w'), function (s) {
      var t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { reihen.push([]); top = t; }
      reihen[reihen.length - 1].push(s.textContent);
    });
    el.innerHTML = reihen.map(function (r, k) { return '<span class="zeile" style="--z:' + k + '"><span>' + r.join(' ') + '</span></span>'; }).join('');
  }

  function zeigen() {
    if (html.classList.contains('auf')) return;
    document.querySelectorAll('.held h1').forEach(zeilen); if (held) held.classList.add('spiel');
    if (!ruhig) document.querySelectorAll('main h2:not([data-ohne]), .vue__satz').forEach(function (h) {
      zeilen(h); if (!h.closest('[data-r]')) h.setAttribute('data-r', 'z');
    });
    /* Lauftexte rollen wie die Überschriften zeilenweise aus dem Schlitz (nur reine Textabsätze, sichtbar, ohne eigenen Auftritt darüber) */
    if (!ruhig) document.querySelectorAll('main p').forEach(function (t) {
      if (t.children.length || !t.offsetParent || t.closest('.held,.leiste,figure,a,button,.menu,.streifen') || t.textContent.trim().length < 30) return;
      var o = t.parentElement && t.parentElement.closest('[data-r]'); if (o) return;
      zeilen(t); t.setAttribute('data-r', 'z');
    });
    html.classList.remove('vor');
    requestAnimationFrame(function () {
      html.classList.add('auf');
      beobachten();
      filme();
      setTimeout(function () { if (held) held.querySelectorAll('img').forEach(function (i) { laden(i); }); rest(); }, 60);
    });
  }

  /* ---------- Auftritte ---------- */
  function beobachten() {
    var stuecke = document.querySelectorAll('[data-r]');
    if (ruhig || !('IntersectionObserver' in window)) { stuecke.forEach(function (s) { s.classList.add('da'); }); document.querySelectorAll('.rahmen').forEach(function (f) { f.classList.add('zo'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) { e.target.classList.add('da'); io.unobserve(e.target); zaehlen(e.target); }
      });
    }, { rootMargin: '0px 0px 12% 0px', threshold: 0 });
    /* Zeilen und Fotos starten erst, wenn sie selbst ins Bild kommen: man sieht das Hereinrollen und das Heranzoomen */
    var spaet = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) { e.target.classList.add(e.target.matches('.rahmen') ? 'zo' : 'da'); spaet.unobserve(e.target); zaehlen(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    stuecke.forEach(function (s) { (s.getAttribute('data-r') === 'z' ? spaet : io).observe(s); });
    document.querySelectorAll('main .rahmen').forEach(function (f) { if (!f.closest('.held')) spaet.observe(f); });
  }
  /* Schlitz-Zeilen: die Zeilen selbst brauchen keinen Weg nach oben */
  var st = document.createElement('style');
  st.textContent = '[data-r="z"]{translate:none;scale:none}[data-r="z"].da{transition:none}';
  document.head.appendChild(st);

  /* ---------- Zähler ---------- */
  function zaehlen(root) {
    var z = root.matches && root.matches('[data-zahl]') ? [root] : [].slice.call(root.querySelectorAll ? root.querySelectorAll('[data-zahl]') : []);
    z.forEach(function (el) {
      var ziel = +el.dataset.zahl, t0 = null, start = Math.max(0, ziel - 12);
      if (ruhig) { el.textContent = ziel; return; }
      function schritt(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / 1500), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(start + (ziel - start) * e);
        if (p < 1) requestAnimationFrame(schritt);
      }
      requestAnimationFrame(schritt);
    });
  }

  /* ---------- Leiste: verschwindet beim Hinunterscrollen, kommt beim Hinaufscrollen ---------- */
  var leiste = document.querySelector('.leiste');
  var oben = document.querySelector('.held');
  var letzte = scrollY, tick = false;
  function leisteStand() {
    tick = false;
    var y = scrollY, grenze = oben ? oben.offsetHeight - 90 : 40;
    leiste.classList.toggle('fest', y > grenze);
    if (y > letzte + 6 && y > 120) leiste.classList.add('weg');
    else if (y < letzte - 6 || y < 120) leiste.classList.remove('weg');
    letzte = y;
  }
  if (leiste) { addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(leisteStand); } }, { passive: true }); leisteStand(); }

  /* ---------- Menü am Handy ---------- */
  var mv = document.querySelector('.menu-voll');
  document.querySelectorAll('[data-menu]').forEach(function (b) {
    b.addEventListener('click', function () { var auf = mv.classList.toggle('auf'); document.body.style.overflow = auf ? 'hidden' : ''; });
  });

  /* ---------- Werte: antippen tauscht das Bild ---------- */
  var werte = document.querySelectorAll('.wert');
  werte.forEach(function (w) {
    function an() {
      var k = w.dataset.k;
      werte.forEach(function (x) { x.setAttribute('aria-selected', x === w ? 'true' : 'false'); });
      document.querySelectorAll('.werte__bilder figure, .wert__texte p').forEach(function (f) { f.classList.toggle('an', f.dataset.k === k); });
    }
    w.addEventListener('click', an);
    w.addEventListener('mouseenter', function () { if (matchMedia('(hover:hover)').matches) an(); });
    w.addEventListener('focus', an);
  });

  /* ---------- Filmstreifen: läuft weiter, waagerechtes Wischen oder Mausrad seitwärts schiebt an ---------- */
  document.querySelectorAll('.streifen').forEach(function (s) {
    var spur = s.querySelector('.streifen__spur');
    spur.innerHTML += spur.innerHTML;
    spur.querySelectorAll('img[data-src]').forEach(function () {});
    var x = 0, schub = 0, sicht = false, last = 0, breite = 0;
    function mass() { breite = spur.scrollWidth / 2; }
    addEventListener('load', mass); addEventListener('resize', mass); mass();
    new IntersectionObserver(function (e) { sicht = e[0].isIntersecting; if (sicht) { last = 0; requestAnimationFrame(lauf); } }).observe(s);
    s.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { schub += e.deltaX * 0.9; } }, { passive: true });
    var tx = null;
    s.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    s.addEventListener('touchmove', function (e) { if (tx === null) return; var nx = e.touches[0].clientX; schub += (tx - nx) * 1.2; tx = nx; }, { passive: true });
    s.addEventListener('touchend', function () { tx = null; }, { passive: true });
    function lauf(t) {
      if (!sicht) return;
      if (!last) last = t;
      var dt = Math.min(48, t - last); last = t;
      if (!breite) mass();
      var v = ruhig ? 0 : 0.032 * dt;
      var s2 = schub * 0.12; schub -= s2;
      x += v + s2;
      if (breite) { x = ((x % breite) + breite) % breite; }
      spur.style.transform = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
      requestAnimationFrame(lauf);
    }
  });
  /* ---------- Gleiten: das Foto wandert beim Scrollen sacht in seinem Rahmen (höchstens 2 % der Rahmenhöhe) ---------- */
  if (!ruhig && 'IntersectionObserver' in window) {
    var gl = [], vh = innerHeight, offen = 0;
    document.querySelectorAll('main .rahmen').forEach(function (f) { var im = f.querySelectorAll('img'); if (im.length === 1) gl.push({ f: f, im: im[0], da: false }); });
    var gio = new IntersectionObserver(function (es) { es.forEach(function (e) { for (var i = 0; i < gl.length; i++) if (gl[i].f === e.target) gl[i].da = e.isIntersecting; }); }, { rootMargin: '10% 0px 10% 0px' });
    /* Wo der Browser es kann, gleitet das Foto auf der Scroll-Zeitachse (gv.css «Gleiten»): läuft im Takt des Scrollens, auch in Safari mit 120 Hz.
       Das Skript setzte translate nur mit dem Bildtakt des Hauptfadens (Safari 60 Hz) und liess die Fotos beim Hereinzoomen im Rahmen zittern. */
    if (window.CSS && CSS.supports('animation-timeline: view()')) { gl.forEach(function (g) { g.f.classList.add('gl'); }); gl = []; }
    gl.forEach(function (g) { gio.observe(g.f); });
    var gleite = function () {
      offen = 0;
      for (var i = 0; i < gl.length; i++) {
        var g = gl[i]; if (!g.da) continue;
        var r = g.f.getBoundingClientRect(), q = ((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2);
        q = q < -1 ? -1 : q > 1 ? 1 : q;
        g.im.style.translate = '0 ' + (q * r.height * .02).toFixed(1) + 'px';
      }
    };
    addEventListener('scroll', function () { if (!offen) offen = requestAnimationFrame(gleite); }, { passive: true });
    addEventListener('resize', function () { vh = innerHeight; gleite(); }, { passive: true });
    gleite();
  }
})();
