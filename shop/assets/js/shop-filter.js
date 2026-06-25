/**
 * Hypodermical — Shop filter, search, and product grid renderer.
 * Reads from window.HypoProducts (defined in cart.js) and renders into
 * #product-grid. Filter buttons by category (data-filter) and by type
 * (data-type: retail | professional). Search box filters by name,
 * short_name, subcategory, tags, and ingredient string.
 */
const ShopFilter = (() => {
  let state = {
    category: 'all',
    type: null,        // null | 'retail' | 'professional'
    query: ''
  };
  let allProducts = [];
  let pricingCtx = { tier: 'retail', prices: {} };

  /** Resolve a price descriptor for a product given the pricing context. */
  function priceFor(p) {
    if (window.HypoPricing) return window.HypoPricing.resolve(p, pricingCtx);
    if (p.professional_use_only || p.price == null) {
      return { label: 'Request Pricing', purchasable: false, proGated: !!p.professional_use_only, isTrade: false };
    }
    return { label: '€' + (p.price / 100).toFixed(2).replace('.', ','), purchasable: true, proGated: false, isTrade: false };
  }

  function productCard(p) {
    const isPro = p.professional_use_only;
    const subcat = p.subcategory || p.category;
    const detailHref = `/shop/${p.category}/${p.slug}.html`;
    const price = priceFor(p);

    const badge = price.isTrade
      ? `<span class="bubble-tag trade product-card__badge">Trade Price</span>`
      : isPro
        ? `<span class="bubble-tag pro product-card__badge">Pro Only</span>`
        : `<span class="bubble-tag product-card__badge">Retail</span>`;

    const action = price.purchasable
      ? `<button class="product-card__action" data-add-to-cart data-sku="${p.sku}" aria-label="Add ${p.short_name} to cart">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
         </button>`
      : `<a href="${detailHref}" class="product-card__action pro" aria-label="View ${p.short_name}">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
         </a>`;

    const showOverlay = isPro && !price.purchasable;

    return `
      <a class="product-card" href="${detailHref}" role="listitem" data-sku="${p.sku}">
        <div class="product-card__img-wrap">
          ${badge}
          <img src="${p.image}" alt="${escapeHtml(p.name)}" class="product-card__img" loading="lazy" />
          ${showOverlay ? `<div class="product-card__pro-overlay"><span class="product-card__pro-overlay-text">Professional Access Required</span></div>` : ''}
        </div>
        <div class="product-card__body">
          <span class="product-card__subcat">${escapeHtml(subcat)}</span>
          <h3 class="product-card__name">${escapeHtml(p.short_name || p.name)}</h3>
          <span class="product-card__size">${escapeHtml(p.size || '')}</span>
          <div class="product-card__footer" onclick="event.stopPropagation()">
            <span class="product-card__price ${price.isTrade ? 'trade' : (price.purchasable ? '' : 'pro')}">${price.label}</span>
            ${action}
          </div>
        </div>
      </a>
    `;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function filterProducts() {
    return allProducts.filter(p => {
      if (state.category === 'sun-care') {
        if ((p.subcategory || '').toLowerCase() !== 'sun care') return false;
      } else if (state.category !== 'all' && p.category !== state.category) {
        return false;
      }
      if (state.type === 'retail' && p.professional_use_only) return false;
      if (state.type === 'professional' && !p.professional_use_only) return false;
      if (state.query) {
        const q = state.query.toLowerCase();
        const haystack = [
          p.name, p.short_name, p.subcategory, p.ingredients,
          (p.tags || []).join(' '), (p.indications || []).join(' ')
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  function render() {
    const grid = document.getElementById('product-grid');
    const empty = document.getElementById('no-results');
    const counter = document.querySelector('.search-result-count');
    if (!grid) return;

    const filtered = filterProducts();
    if (counter) counter.textContent = filtered.length + (filtered.length === 1 ? ' product' : ' products');

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    grid.innerHTML = filtered.map(productCard).join('');
  }

  function renderRetailSpotlight(targetId, limit = 4) {
    const el = document.getElementById(targetId);
    if (!el) return;
    const retail = allProducts.filter(p => !p.professional_use_only).slice(0, limit);
    el.innerHTML = retail.map(productCard).join('');
  }

  function bindFilters() {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        state.category = btn.dataset.filter;
        render();
      });
    });

    document.querySelectorAll('.filter-type-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wasActive = btn.classList.contains('active');
        document.querySelectorAll('.filter-type-btn').forEach(b => b.classList.remove('active'));
        if (wasActive) {
          state.type = null;
        } else {
          btn.classList.add('active');
          state.type = btn.dataset.type;
        }
        render();
      });
    });

    const search = document.querySelector('.shop-search-input');
    if (search) {
      let debounce;
      search.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          state.query = e.target.value.trim();
          render();
        }, 150);
      });
    }
  }

  function reset() {
    state = { category: 'all', type: null, query: '' };
    document.querySelectorAll('.filter-btn').forEach(b => {
      const isAll = b.dataset.filter === 'all';
      b.classList.toggle('active', isAll);
      b.setAttribute('aria-selected', isAll ? 'true' : 'false');
    });
    document.querySelectorAll('.filter-type-btn').forEach(b => b.classList.remove('active'));
    const search = document.querySelector('.shop-search-input');
    if (search) search.value = '';
    render();
  }

  async function init() {
    try {
      allProducts = await window.HypoProducts.all();
      bindFilters();
      render();
      renderRetailSpotlight('retail-spotlight', 4);
      // Overlay trade pricing once (and if) it resolves for approved B2B users.
      if (window.HypoPricing) {
        window.HypoPricing.ready().then(ctx => {
          if (ctx && ctx.tier === 'trade') {
            pricingCtx = ctx;
            render();
            renderRetailSpotlight('retail-spotlight', 4);
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to initialize shop:', err);
      const grid = document.getElementById('product-grid');
      if (grid) grid.innerHTML = '<p class="no-results">Unable to load products. Please refresh the page.</p>';
    }
  }

  return { init, reset, render };
})();

window.ShopFilter = ShopFilter;

document.addEventListener('DOMContentLoaded', () => ShopFilter.init());
