/**
 * Hypodermical Benelux — header auth UI.
 *
 * Enhances the existing site header on every page: injects a
 * "Trade Login" / "My Account" link into `.header-actions` and reflects
 * the signed-in professional's state. Also provides a route guard for
 * pages that require an authenticated (and optionally approved) account.
 *
 * Pages opt into a guard with a body attribute:
 *   <body data-require-auth>           → must be signed in
 *   <body data-require-auth="approved"> → must be an approved B2B account
 */
(function () {
  function injectAccountLink(state) {
    const actions = document.querySelector('.header-actions');
    if (!actions) return;
    let link = document.getElementById('header-account-link');
    if (!link) {
      link = document.createElement('a');
      link.id = 'header-account-link';
      link.className = 'header-account-link';
      // Insert before the cart button so it reads: [Account] [Cart] [CTA]
      const cart = actions.querySelector('.header-cart-btn');
      actions.insertBefore(link, cart || actions.firstChild);
    }
    if (state.signedIn) {
      link.href = '/pages/account/';
      link.textContent = 'My Account';
      link.setAttribute('aria-label', 'Your trade account');
    } else {
      link.href = '/pages/professionals.html';
      link.textContent = 'Trade Login';
      link.setAttribute('aria-label', 'Professional trade login');
    }
  }

  async function refresh() {
    if (!window.HypoAuth || !HypoAuth.isConfigured()) {
      injectAccountLink({ signedIn: false });
      return;
    }
    try {
      const user = await HypoAuth.getUser();
      injectAccountLink({ signedIn: !!user });
    } catch {
      injectAccountLink({ signedIn: false });
    }
  }

  async function guard() {
    const required = document.body.getAttribute('data-require-auth');
    if (required === null) return;
    const here = encodeURIComponent(window.location.pathname);
    if (!window.HypoAuth || !HypoAuth.isConfigured()) {
      window.location.replace('/pages/professionals.html?next=' + here);
      return;
    }
    const user = await HypoAuth.getUser();
    if (!user) {
      window.location.replace('/pages/professionals.html?next=' + here);
      return;
    }
    if (required === 'approved') {
      const approved = await HypoAuth.isApproved();
      // Not approved yet is allowed onto the account page (it shows a
      // pending banner); other 'approved'-gated pages bounce to account.
      if (!approved && !document.body.hasAttribute('data-allow-pending')) {
        window.location.replace('/pages/account/');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    guard();
    if (window.HypoAuth && HypoAuth.isConfigured()) {
      HypoAuth.onChange(() => refresh());
    }
  });
})();
