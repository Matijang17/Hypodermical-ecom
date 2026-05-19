/**
 * Hypodermical Benelux — Cart state.
 * Stores cart in localStorage, exposes a global `HypoCart` object,
 * keeps every `.cart-badge` in sync, and emits `hypo:cart-updated`
 * on every mutation.
 */
const HypoCart = {
  key: 'hypo_benelux_cart_v1',

  /** @returns {Array<CartItem>} */
  get() {
    try { return JSON.parse(localStorage.getItem(this.key)) || []; }
    catch { return []; }
  },

  save(cart) {
    localStorage.setItem(this.key, JSON.stringify(cart));
    this._emit();
    this._updateBadge();
  },

  /**
   * Add a product to the cart.
   * Pro-only products redirect to the professionals access flow instead.
   */
  add(product, qty = 1) {
    if (product.professional_use_only) {
      window.location.href = '/pages/professionals.html?ref=' + encodeURIComponent(product.sku);
      return;
    }
    const cart = this.get();
    const existing = cart.find(i => i.sku === product.sku);
    if (existing) existing.qty += qty;
    else cart.push({
      sku: product.sku,
      name: product.name,
      short_name: product.short_name,
      price: product.price,
      size: product.size,
      stripe_price_id: product.stripe_price_id,
      image: product.image,
      qty
    });
    this.save(cart);
    this._toast(product.short_name || product.name);
  },

  remove(sku) {
    this.save(this.get().filter(i => i.sku !== sku));
  },

  setQty(sku, qty) {
    const cart = this.get();
    const item = cart.find(i => i.sku === sku);
    if (!item) return;
    const next = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    item.qty = next;
    this.save(cart);
  },

  /** @returns {number} total in cents */
  total() {
    return this.get().reduce((s, i) => s + i.price * i.qty, 0);
  },

  count() {
    return this.get().reduce((s, i) => s + i.qty, 0);
  },

  clear() {
    localStorage.removeItem(this.key);
    this._emit();
    this._updateBadge();
  },

  /** Format a cents value as a €‑prefixed string. */
  formatPrice(cents) {
    return '€' + (cents / 100).toFixed(2).replace('.', ',');
  },

  _emit() {
    document.dispatchEvent(new CustomEvent('hypo:cart-updated', {
      detail: { cart: this.get(), total: this.total(), count: this.count() }
    }));
  },

  _updateBadge() {
    const count = this.count();
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  _toast(name) {
    const id = 'hypo-toast';
    let toast = document.getElementById(id);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = id;
      toast.innerHTML = `
        <span class="toast-msg"></span>
        <a href="/shop/cart.html" class="toast-link">View Cart →</a>
        <button class="toast-close" aria-label="Dismiss notification">×</button>
      `;
      toast.querySelector('.toast-close').addEventListener('click',
        () => toast.classList.remove('visible'));
      document.body.appendChild(toast);
    }
    toast.querySelector('.toast-msg').textContent = `"${name}" added to cart`;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 4000);
  }
};

// Expose globally
window.HypoCart = HypoCart;

/* ============================================================
   Auto-binding
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  HypoCart._updateBadge();

  // [data-add-to-cart][data-sku]
  document.body.addEventListener('click', async (e) => {
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      e.preventDefault();
      const sku = addBtn.dataset.sku;
      try {
        const products = await window.HypoProducts.all();
        const product = products.find(p => p.sku === sku);
        if (product) HypoCart.add(product);
      } catch (err) {
        console.error('Add to cart failed:', err);
      }
      return;
    }

    const buyBtn = e.target.closest('[data-buy-now]');
    if (buyBtn) {
      e.preventDefault();
      if (typeof buyNow === 'function') buyNow(buyBtn.dataset.sku);
      return;
    }
  });
});

/* ============================================================
   Product catalogue loader (cached promise — fetched once per page)
   ============================================================ */
window.HypoProducts = (() => {
  let cache = null;
  return {
    all() {
      if (!cache) {
        cache = fetch('/shop/assets/data/products.json')
          .then(r => {
            if (!r.ok) throw new Error('Failed to load products.json: ' + r.status);
            return r.json();
          })
          .catch(err => { cache = null; throw err; });
      }
      return cache;
    }
  };
})();
