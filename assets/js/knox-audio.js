/* knox-audio.js — one rule for the whole site: only one voice at a time,
   and silence when you leave. Muted ambience (hero films, motion loops)
   is untouched; anything with an audible track yields.

   The catch this file exists for: the site's narration pills build their
   sound with `new Audio(...)` and never attach it to the DOM, so a naive
   querySelectorAll sweep cannot see the loudest thing on the page. The
   Audio constructor is therefore wrapped to register every instance it
   creates — load this file before anyone clicks anything and the registry
   is complete, because the pills only construct on click. */
(function () {
  var registry = [];

  function audible(m) { return !m.muted && m.volume > 0; }
  function each(fn) {
    var seen = [];
    document.querySelectorAll('audio,video').forEach(function (m) { seen.push(m); fn(m); });
    registry.forEach(function (m) { if (seen.indexOf(m) === -1) fn(m); });
  }
  function stopAll(except) {
    each(function (m) {
      if (m === except) return;
      if (!m.paused && audible(m)) { try { m.pause(); } catch (e) {} }
    });
  }

  /* Register every constructed Audio, and give it the same one-voice rule. */
  if (window.Audio) {
    var OrigAudio = window.Audio;
    var Wrapped = function (src) {
      var el = src === undefined ? new OrigAudio() : new OrigAudio(src);
      registry.push(el);
      el.addEventListener('play', function () { if (audible(el)) stopAll(el); });
      return el;
    };
    Wrapped.prototype = OrigAudio.prototype;
    window.Audio = Wrapped;
  }

  /* A new audible play silences every other audible source. */
  document.addEventListener('play', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'AUDIO' || t.tagName === 'VIDEO') && audible(t)) stopAll(t);
  }, true);

  /* Leaving the page — through a vault door, a link, or a tab switch —
     always cuts the sound. */
  window.addEventListener('pagehide', function () { stopAll(null); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopAll(null);
  });

  window.KnoxStopAudio = stopAll;
})();
