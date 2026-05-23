/**
 * Hypodermical — Header scroll behaviour.
 * Toggles `.header--scrolled` after the user scrolls past 80px on pages
 * that opt into the transparent variant via `.header--transparent`.
 * Pages without `.header--transparent` keep their opaque default.
 */
(function () {
  const header = document.getElementById('site-header');
  if (!header) return;

  const SCROLL_THRESHOLD = 80;
  const isTransparentVariant = header.classList.contains('header--transparent');

  function update() {
    if (!isTransparentVariant) return;
    if (window.scrollY > SCROLL_THRESHOLD) {
      header.classList.remove('header--transparent');
      header.classList.add('header--scrolled');
    } else {
      header.classList.add('header--transparent');
      header.classList.remove('header--scrolled');
    }
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { update(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  update();

  // Mobile nav toggle (if present)
  const toggle = document.querySelector('.header-nav-toggle');
  const nav = document.querySelector('.header-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('is-open'));
  }

  /* Hydrate every <img class="logo-mark"> into inline SVG so the
     SMIL <animate> elements run AND `currentColor` inherits the
     local text color (white over dark hero, black over white). */
  const BUBBLES_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 48" class="logo-mark" role="img" aria-label="Hypodermical bubbles mark" focusable="false">'
    + '<g fill="none" stroke="currentColor" stroke-width="1.5">'
    + '<circle cx="14" cy="24" r="9"><animate attributeName="r" values="9;8;9" dur="3s" repeatCount="indefinite"/></circle>'
    + '<circle cx="32" cy="14" r="5"><animate attributeName="cy" values="14;12;14" dur="3.2s" repeatCount="indefinite"/></circle>'
    + '<circle cx="40" cy="30" r="7"><animate attributeName="r" values="7;6.5;7" dur="3.5s" repeatCount="indefinite"/></circle>'
    + '<circle cx="46" cy="14" r="3" fill="currentColor" stroke="none"><animate attributeName="cy" values="14;12;14" dur="2.6s" repeatCount="indefinite"/></circle>'
    + '</g></svg>';

  document.querySelectorAll('img.logo-mark').forEach(img => {
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    const tmp = document.createElement('div');
    tmp.innerHTML = BUBBLES_SVG;
    const svg = tmp.firstChild;
    if (w) svg.setAttribute('width', w);
    if (h) svg.setAttribute('height', h);
    img.replaceWith(svg);
  });
})();
