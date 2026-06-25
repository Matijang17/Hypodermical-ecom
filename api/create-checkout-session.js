/**
 * Hypodermical Benelux — Stripe Checkout session (server-side).
 *
 * SECURITY: prices are NEVER taken from the client. The client sends only
 * { sku, quantity } pairs (plus an optional Supabase access token). This
 * function recomputes authoritative unit prices:
 *   • approved B2B account  → trade_prices table (gated by approval check)
 *   • everyone else         → retail price from products.json
 * Professional-only products are refused unless the buyer is an approved
 * B2B account with a trade price.
 *
 * Env required: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
const fs = require('fs');
const path = require('path');

let _products = null;
function loadProducts() {
  if (_products) return _products;
  const file = path.join(process.cwd(), 'shop', 'assets', 'data', 'products.json');
  _products = JSON.parse(fs.readFileSync(file, 'utf8'));
  return _products;
}

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || secret.includes('xxx') || secret.includes('REPLACE')) {
    return res.status(500).json({ error: 'Stripe is not configured on the server.' });
  }

  const Stripe = require('stripe');
  const stripe = new Stripe(secret);

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { items, success_url, cancel_url, access_token } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided.' });
    }

    // ── Resolve buyer tier from the Supabase session, if any ──
    const sb = getSupabase();
    let tier = 'retail';
    let userId = null;
    let userEmail = null;
    let tradePrices = {};

    if (access_token && sb) {
      const { data: userData } = await sb.auth.getUser(access_token);
      const user = userData && userData.user;
      if (user) {
        userId = user.id;
        userEmail = user.email;
        const { data: profile } = await sb
          .from('b2b_profiles').select('status').eq('id', user.id).maybeSingle();
        if (profile && profile.status === 'approved') {
          tier = 'trade';
          const { data: tp } = await sb
            .from('trade_prices').select('sku, price_cents, stripe_price_id');
          (tp || []).forEach(r => { tradePrices[r.sku] = r; });
        }
      }
    }

    // ── Build authoritative line items ──
    const catalogue = loadProducts();
    const lineItems = [];
    const orderItems = [];

    for (const raw of items) {
      const sku = raw.sku;
      const qty = Math.max(1, Math.min(99, parseInt(raw.quantity || raw.qty, 10) || 1));
      const product = catalogue.find(p => p.sku === sku);
      if (!product) return res.status(400).json({ error: `Unknown product: ${sku}` });

      const trade = tier === 'trade' && tradePrices[sku];

      // Determine unit price + name from the trusted source.
      let unitAmount, stripePriceId, name;
      if (trade) {
        unitAmount = trade.price_cents;
        stripePriceId = trade.stripe_price_id || null;
        name = (product.short_name || product.name) + ' — Trade';
      } else {
        if (product.professional_use_only) {
          return res.status(403).json({ error: `${product.short_name || sku} requires an approved trade account.` });
        }
        if (product.price == null) {
          return res.status(400).json({ error: `${product.short_name || sku} is not available for direct purchase.` });
        }
        unitAmount = product.price;
        stripePriceId = (product.stripe_price_id && !String(product.stripe_price_id).includes('REPLACE'))
          ? product.stripe_price_id : null;
        name = product.short_name || product.name;
      }

      if (stripePriceId) {
        lineItems.push({ price: stripePriceId, quantity: qty });
      } else {
        lineItems.push({
          quantity: qty,
          price_data: {
            currency: (product.currency || 'eur'),
            unit_amount: unitAmount,
            product_data: { name }
          }
        });
      }
      orderItems.push({ sku, qty, unit_amount: unitAmount, tier });
    }

    const origin = req.headers.origin || ('https://' + (req.headers.host || ''));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: success_url || (origin + '/shop/checkout-success.html'),
      cancel_url: cancel_url || (origin + '/shop/checkout-cancel.html'),
      customer_email: userEmail || undefined,
      billing_address_collection: 'required',
      shipping_address_collection: { allowed_countries: ['BE', 'NL', 'LU', 'FR', 'DE'] },
      metadata: { tier, user_id: userId || '' }
    });

    // Best-effort order log (never blocks checkout).
    if (sb) {
      sb.from('orders').insert({
        user_id: userId,
        email: userEmail,
        stripe_session_id: session.id,
        amount_total: session.amount_total,
        currency: 'eur',
        status: 'pending',
        tier,
        items: orderItems
      }).then(() => {}, () => {});
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Could not create checkout session.' });
  }
};
