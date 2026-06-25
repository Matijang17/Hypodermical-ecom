/**
 * Hypodermical Benelux — shared footer.
 * Injects the standard footer into any <footer class="site-footer"></footer>
 * so the newer pages share one source of truth for footer links.
 */
(function () {
  const footer = document.querySelector('footer.site-footer');
  if (!footer) return;

  const year = (window.HYPO_YEAR || '2025');

  footer.setAttribute('style', 'background:var(--color-black);color:rgba(255,255,255,0.7);padding:64px 0 32px;');
  footer.innerHTML = `
    <div class="container" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:48px;margin-bottom:48px;">
      <div>
        <a href="/" class="logo" style="margin-bottom:18px;">
          <img src="/assets/images/hypodermical-bubbles-animated.svg" alt="" class="logo-mark" width="28" height="24" />
          <span class="logo-text" style="color:var(--color-white);">hypodermical<span class="logo-dot">.</span></span>
        </a>
        <p style="font-size:13px;line-height:1.6;margin-top:14px;color:rgba(255,255,255,0.55);">Professional aesthetic systems built on 16 biological markers of ageing. Benelux distribution.</p>
      </div>
      <div>
        <h4 style="color:var(--color-white);font-family:var(--font-primary);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:18px;">Shop</h4>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;font-size:13px;">
          <li><a href="/shop/" style="color:rgba(255,255,255,0.7);">All Products</a></li>
          <li><a href="/shop/?filter=home-care" style="color:rgba(255,255,255,0.7);">Home Care</a></li>
          <li><a href="/shop/cart.html" style="color:rgba(255,255,255,0.7);">Cart</a></li>
        </ul>
      </div>
      <div>
        <h4 style="color:var(--color-white);font-family:var(--font-primary);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:18px;">Company</h4>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;font-size:13px;">
          <li><a href="/pages/about.html" style="color:rgba(255,255,255,0.7);">About</a></li>
          <li><a href="/pages/professionals.html" style="color:rgba(255,255,255,0.7);">For Professionals</a></li>
          <li><a href="/pages/contact.html" style="color:rgba(255,255,255,0.7);">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 style="color:var(--color-white);font-family:var(--font-primary);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:18px;">Support</h4>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:10px;font-size:13px;">
          <li><a href="/pages/shipping.html" style="color:rgba(255,255,255,0.7);">Shipping</a></li>
          <li><a href="/pages/returns.html" style="color:rgba(255,255,255,0.7);">Returns</a></li>
          <li><a href="/pages/terms.html" style="color:rgba(255,255,255,0.7);">Terms</a></li>
          <li><a href="/pages/privacy.html" style="color:rgba(255,255,255,0.7);">Privacy</a></li>
        </ul>
      </div>
    </div>
    <div class="container" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.4);">
      <span>© Hypodermical Benelux ${year}</span>
      <span>Made with care</span>
    </div>
  `;
})();
