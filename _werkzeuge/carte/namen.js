/* Namen der Werkzeuge aus der einen Stelle (kleid/varone.js, WO_HAUS.namen; aus der Vorlage Wirtschaft am Schlössli, 19.10.2026). Jedes Element mit data-wo-name="<schlüssel>"
   bekommt den Namen; im HTML steht derselbe Name als Ersatz, falls das Kleid nicht lädt. data-wo-name-klein setzt den Artikel klein, data-wo-name-ohne lässt ihn weg («zu den Speisekarten»). */
(function () {
  var N = (window.WO_HAUS && window.WO_HAUS.namen) || {};
  function setze() {
    [].forEach.call(document.querySelectorAll('[data-wo-name]'), function (el) {
      var n = N[el.getAttribute('data-wo-name')]; if (!n) return;
      if (el.hasAttribute('data-wo-name-ohne')) n = n.replace(/^(Das|Die|Der) /, '');
      else if (el.hasAttribute('data-wo-name-klein')) n = n.charAt(0).toLowerCase() + n.slice(1);
      el.textContent = n;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setze); else setze();
})();
