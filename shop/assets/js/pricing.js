/**
 * Hypodermical Benelux — pricing tier overlay.
 *
 * Resolves whether the current visitor sees RETAIL or TRADE pricing and,
 * for approved B2B accounts, fetches the wholesale price list (gated by
 * Supabase RLS — anonymous visitors physically cannot read it).
 *
 * `window.HypoPricing.ready()` resolves once, returning:
 *   { tier: 'retail' | 'trade', prices: { [sku]: {price_cents, stripe_price_id, min_qty} } }
 *
 * `HypoPricing.resolve(product)` returns a uniform price descriptor that
 * the catalogue + product renderers use, falling back gracefully to the
 * retail price (or "Request Pricing" for professional-only items).
 */
window.HypoPricing = (() => {
  let promise = null;

  async function load() {
    const base = { tier: 'retail', prices: {} };
    if (!window.HypoAuth || !HypoAuth.isConfigured()) return base;
    try {
      const approved = await HypoAuth.isApproved();
      if (!approved) return base;
      const sb = await HypoAuth.client();
      const { data, error } = await sb
        .from('trade_prices')
        .select('sku, price_cents, stripe_price_id, min_qty');
      if (error) { console.warn('trade_prices load failed:', error.message); return base; }
      const prices = {};
      (data || []).forEach(r => { prices[r.sku] = r; });
      return { tier: 'trade', prices };
    } catch (e) {
      console.warn('Pricing tier resolve failed:', e.message);
      return base;
    }
  }

  function fmt(cents) {
    return '€' + (cents / 100).toFixed(2).replace('.', ',');
  }

  return {
    ready() {
      if (!promise) promise = load();
      return promise;
    },

    /** Force re-evaluation (e.g. after sign in/out). */
    reset() { promise = null; },

    fmt,

    /**
     * @param {object} product
     * @param {{tier:string, prices:object}} ctx — result of ready()
     * @returns {{tier, cents:number|null, label:string, note:string,
     *            stripe_price_id:string|null, purchasable:boolean,
     *            proGated:boolean, isTrade:boolean}}
     */
    resolve(product, ctx) {
      const trade = ctx && ctx.tier === 'trade' && ctx.prices[product.sku];

      if (trade) {
        return {
          tier: 'trade',
          cents: trade.price_cents,
          label: fmt(trade.price_cents),
          note: 'Trade price · ex VAT' + (trade.min_qty > 1 ? ` · min ${trade.min_qty}` : ''),
          stripe_price_id: trade.stripe_price_id || product.stripe_price_id || null,
          purchasable: true,
          proGated: false,
          isTrade: true
        };
      }

      // Professional-only product, no trade access → gated.
      if (product.professional_use_only) {
        return {
          tier: 'retail', cents: null, label: 'Trade only',
          note: 'Professional account required',
          stripe_price_id: null, purchasable: false, proGated: true, isTrade: false
        };
      }

      // Public retail price.
      if (product.price == null) {
        return {
          tier: 'retail', cents: null, label: 'Price on request',
          note: 'Contact us to order',
          stripe_price_id: null, purchasable: false, proGated: false, isTrade: false
        };
      }

      return {
        tier: 'retail',
        cents: product.price,
        label: fmt(product.price),
        note: 'VAT included · Free shipping over €75',
        stripe_price_id: product.stripe_price_id || null,
        purchasable: true, proGated: false, isTrade: false
      };
    }
  };
})();
