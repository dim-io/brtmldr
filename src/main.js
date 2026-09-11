// De enige JavaScript op de site: mobiel menu, header-lijntje bij scrollen, fotoviewer, prefetch.
(function () {
  // Mobiel menu
  var btn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    if (!btn) return;
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  }
  if (btn && nav) {
    btn.addEventListener('click', function () { setMenu(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  }

  // Dun lijntje onder de vastgezette header zodra de pagina scrolt
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Fotoviewer
  var zooms = Array.prototype.slice.call(document.querySelectorAll('.rows .zoom'));
  var lb = null, lbImg = null, lbCount = null, current = 0, opening = false;
  var titleEl = document.querySelector('.project h1 strong');
  var titleText = titleEl ? titleEl.textContent : '';
  function icon(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; }
  function buildLightbox() {
    lb = document.createElement('dialog');
    lb.className = 'lightbox';
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<div class="stage" tabindex="-1" autofocus><img alt=""></div>' +
      '<button type="button" class="close" aria-label="Close">' + icon('M6 6l12 12M18 6L6 18') + '</button>' +
      '<button type="button" class="prev" aria-label="Previous photo">' + icon('M15 5l-7 7 7 7') + '</button>' +
      '<button type="button" class="next" aria-label="Next photo">' + icon('M9 5l7 7-7 7') + '</button>' +
      '<div class="bar" aria-live="polite"><strong></strong><span class="count"></span></div>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector('img'); lbCount = lb.querySelector('.count');
    lb.querySelector('.bar strong').textContent = titleText;
    lb.querySelector('.close').addEventListener('click', closeLb);
    lb.querySelector('.prev').addEventListener('click', function () { show(current - 1); });
    lb.querySelector('.next').addEventListener('click', function () { show(current + 1); });
    // Klik op de foto: rechterhelft is volgende, linkerhelft is vorige. Klik ernaast sluit.
    lbImg.addEventListener('click', function (e) { var r = lbImg.getBoundingClientRect(); show(current + (e.clientX - r.left > r.width / 2 ? 1 : -1)); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('stage')) closeLb(); });
    lb.addEventListener('close', function () {
      document.body.classList.remove('lightbox-open');
      if (location.hash.indexOf('#photo-') === 0) history.back();
    });
    lb.addEventListener('cancel', function (e) { e.preventDefault(); closeLb(); });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    });
  }
  function show(i) {
    current = (i + zooms.length) % zooms.length;
    var a = zooms[current], img = a.querySelector('img');
    lbImg.classList.remove('is-ready');
    lbImg.onload = function () { lbImg.classList.add('is-ready'); };
    lbImg.src = a.href; lbImg.alt = img ? img.alt : '';
    if (lbImg.complete && lbImg.naturalWidth) lbImg.classList.add('is-ready');
    lbCount.textContent = (current + 1) + ' / ' + zooms.length;
    if (lb.open && location.hash !== '#photo-' + (current + 1)) history.replaceState(null, '', '#photo-' + (current + 1));
    [current + 1, current - 1].forEach(function (k) { var n = zooms[(k + zooms.length) % zooms.length]; if (n) { var p = new Image(); p.src = n.href; } });
  }
  function openLb(i, fromHash) {
    if (!lb) buildLightbox();
    document.body.classList.add('lightbox-open');
    if (lb.showModal) { if (!lb.open) lb.showModal(); } else lb.setAttribute('open', '');
    if (!fromHash) history.pushState(null, '', '#photo-' + (i + 1)); // terugknop sluit de viewer
    show(i);
  }
  function closeLb() {
    if (!lb) return;
    if (lb.open) lb.close();
    else if (lb.hasAttribute('open')) { lb.removeAttribute('open'); document.body.classList.remove('lightbox-open'); if (location.hash.indexOf('#photo-') === 0) history.back(); }
  }
  zooms.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); openLb(i); }); });
  function fromHash() {
    var m = location.hash.match(/^#photo-(\d+)$/);
    if (m && zooms.length) { var i = Math.min(zooms.length, Math.max(1, Number(m[1]))) - 1; openLb(i, true); }
    else if (lb && (lb.open || lb.hasAttribute('open'))) { if (lb.open) lb.close(); else { lb.removeAttribute('open'); document.body.classList.remove('lightbox-open'); } }
  }
  window.addEventListener('popstate', fromHash);
  if (zooms.length) fromHash(); // deeplink zoals /madeira/#photo-4

  // Pijltjestoetsen werken alleen in de viewer.
  document.addEventListener('keydown', function (e) {
    if (!lb || !(lb.open || lb.hasAttribute('open'))) return;
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'Escape') closeLb();
  });

  // Volgende pagina alvast laden zodra iemand een link aanraakt.
  var seen = {};
  document.addEventListener('mouseover', function (e) {
    var a = e.target.closest('a[href^="/"]');
    if (!a || a.classList.contains('zoom') || seen[a.href] || a.href === location.href) return;
    seen[a.href] = true;
    var l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
  }, { passive: true });
})();
