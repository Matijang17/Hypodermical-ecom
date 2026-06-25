/**
 * Hypodermical Benelux — Stripe checkout integration.
 *
 * Two flows:
 *   1) `buyNow(sku)` — single product → Stripe Payment Link (one URL per SKU)
 *   2) `checkoutCart(cartItems)` — multi-item → serverless `/api/create-checkout-session`
 *
 * Replace the placeholder values below with real Stripe credentials and
 * Payment Link URLs from dashboard.stripe.com before going live.
 */

/* ─── Stripe Publishable Key ────────────────────────────── */
const STRIPE_PUBLISHABLE_KEY = 'pk_live_REPLACE_WITH_YOUR_KEY';
// For testing use: 'pk_test_REPLACE_WITH_YOUR_KEY'

/* ─── Per-SKU Payment Link mapping ──────────────────────── */
/* Create these in Stripe Dashboard → Payment Links, then paste here. */
const STRIPE_PAYMENT_LINKS = {
  'HY-HC-GLYCO-001': 'https://buy.stripe.com/REPLACE',
  'HY-HC-CELL-001':  'https://buy.stripe.com/REPLACE',
  'HY-HC-LIPO-001':  'https://buy.stripe.com/REPLACE',
  'HY-HC-STR-001':   'https://buy.stripe.com/REPLACE',
  'HY-EYE-MPC-001':  'https://buy.stripe.com/REPLACE',
  'HY-SPF50-001':    'https://buy.stripe.com/REPLACE',
};

/* ─── Single-product buy now → Payment Link ─────────────── */
function buyNow(sku) {
  const link = STRIPE_PAYMENT_LINKS[sku];
  if (!link || link.endsWith('REPLACE')) {
    console.warn('No Stripe Payment Link configured for', sku);
    alert('Checkout is not yet configured for this product. Please contact us to order.');
    return;
  }
  window.location.href = link;
}

/* ─── Multi-product cart → Stripe Checkout Session ───────
   Requires the serverless function at /api/create-checkout-session
   (see /api/create-checkout-session.js).
─────────────────────────────────────────────────────────── */
async function checkoutCart(cartItems) {
  if (!cartItems || !cartItems.length) {
    alert('Your cart is empty.');
    return;
  }

  const btn = document.querySelector('[data-checkout-btn]');
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting…'; }

  try {
    // Authenticate the request so the server can apply trade pricing for
    // approved B2B accounts. Anonymous shoppers get retail pricing.
    let accessToken = null;
    if (window.HypoAuth && HypoAuth.isConfigured()) {
      try { accessToken = await HypoAuth.getAccessToken(); } catch { /* retail */ }
    }

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Send only SKU + quantity — the server recomputes prices.
        items: cartItems.map(item => ({ sku: item.sku, quantity: item.qty })),
        access_token: accessToken,
        success_url: window.location.origin + '/shop/checkout-success.html',
        cancel_url:  window.location.origin + '/shop/checkout-cancel.html'
      })
    });

    if (!res.ok) {
      let message = 'Checkout request failed (' + res.status + ').';
      try { const body = await res.json(); if (body && body.error) message = body.error; } catch {}
      throw new Error(message);
    }

    const { url } = await res.json();
    if (!url) throw new Error('No redirect URL returned from server');

    window.location.href = url;
  } catch (err) {
    console.error('Checkout error:', err);
    alert(err.message || 'Checkout failed. Please try again or contact us directly.');
    if (btn) { btn.disabled = false; btn.textContent = 'Checkout →'; }
  }
}

window.buyNow = buyNow;
window.checkoutCart = checkoutCart;
