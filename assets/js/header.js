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
})();
