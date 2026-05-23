/**
 * Hypodermical Benelux — collection hub renderer.
 *
 * Each collection page declares its config on window before this script runs:
 *
 *   window.HYPO_COLLECTION_CONFIG = {
 *     systemSku:       'HY-EYE-001',       // optional — pulls system_products as protocol strip
 *     skus:            ['HY-…','HY-…'],    // optional — explicit product list (alternative to systemSku)
 *     title:           'iLLUMiNEYE',
 *     titleItalic:     'Eye Zone',         // optional italic part of the title
 *     description:     '…',
 *     protocol: {
 *       sessions:  6,
 *       frequency: 'Every 10 days',
 *       duration:  '30–45 min',
 *       proOnly:   true
 *     }
 *   };
 *
 * The renderer fills in #collection-hero, #collection-overview,
 * #collection-grid, and #collection-description.
 */
(function () {
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function priceLabel(p) {
    if (p.professional_use_only || !p.price) return 'Request Pricing';
    return '€' + (p.price / 100).toFixed(2).replace('.', ',');
  }

  function productCard(p) {
    const isPro = p.professional_use_only;
    const subcat = p.subcategory || p.category;
    const detailHref = `/shop/${p.category}/${p.slug}.html`;

    const badge = isPro
      ? `<span class="bubble-tag pro product-card__badge">Pro Only</span>`
      : `<span class="bubble-tag product-card__badge">Available Online</span>`;

    const action = isPro
      ? `<a href="${detailHref}" class="product-card__action pro" aria-label="View ${esc(p.short_name)}">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
         </a>`
      : `<button class="product-card__action" data-add-to-cart data-sku="${esc(p.sku)}" aria-label="Add ${esc(p.short_name)} to cart">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
         </button>`;

    return `
      <a class="product-card" href="${detailHref}" role="listitem" data-sku="${esc(p.sku)}">
        <div class="product-card__img-wrap">
          ${badge}
          <img src="${esc(p.image)}" alt="${esc(p.name)}" class="product-card__img" loading="lazy" />
          ${isPro ? `<div class="product-card__pro-overlay"><span class="product-card__pro-overlay-text">Professional Access Required</span></div>` : ''}
        </div>
        <div class="product-card__body">
          <span class="product-card__subcat">${esc(subcat)}</span>
          <h3 class="product-card__name">${esc(p.short_name || p.name)}</h3>
          <span class="product-card__size">${esc(p.size || '')}</span>
          <div class="product-card__footer" onclick="event.stopPropagation()">
            <span class="product-card__price ${isPro ? 'pro' : ''}">${esc(priceLabel(p))}</span>
            ${action}
          </div>
        </div>
      </a>
    `;
  }

  function renderHero(cfg) {
    const el = document.getElementById('collection-hero');
    if (!el) return;
    const breadcrumb = `
      <nav class="product-breadcrumb" aria-label="Breadcrumb" style="color:rgba(255,255,255,0.6);">
        <a href="/" style="color:inherit;">Home</a><span class="sep">/</span>
        <a href="/shop/" style="color:inherit;">Shop</a><span class="sep">/</span>
        <span class="current" style="color:rgba(255,255,255,0.85);">${esc(cfg.title)}</span>
      </nav>
    `;
    el.innerHTML = `
      <span class="bubble-float" style="width:380px;height:380px;top:-90px;right:-110px;" aria-hidden="true"></span>
      <span class="bubble-float" style="width:200px;height:200px;bottom:40px;left:-60px;" aria-hidden="true"></span>
      <div class="container collection-hero__inner">
        ${breadcrumb}
        <span class="bubble-tag white" style="margin-top:24px;">${esc(cfg.tagline || 'Collection')}</span>
        <h1 class="collection-hero__title">
          ${esc(cfg.title)}${cfg.titleItalic ? `<br><em>${esc(cfg.titleItalic)}</em>` : ''}
        </h1>
        <p class="collection-hero__sub">${esc(cfg.description)}</p>
      </div>
    `;
  }

  function renderOverview(cfg, products, systemProduct) {
    const el = document.getElementById('collection-overview');
    if (!el) return;
    let steps;
    if (systemProduct && systemProduct.system_products) {
      steps = systemProduct.system_products.map(sp => {
        const sib = products.find(pp => pp.sku === sp.sku);
        const href = sib
          ? `/shop/${sib.category}/${sib.slug}.html`
          : `/shop/product.html?slug=${encodeURIComponent(sp.sku)}`;
        return { step: sp.step, name: sp.name, href };
      });
    } else if (cfg.skus) {
      steps = cfg.skus.map((sku, i) => {
        const sib = products.find(pp => pp.sku === sku);
        if (!sib) return null;
        return {
          step: 'Step ' + (i + 1),
          name: sib.short_name || sib.name,
          href: `/shop/${sib.category}/${sib.slug}.html`
        };
      }).filter(Boolean);
    } else {
      steps = [];
    }
    if (!steps.length) { el.style.display = 'none'; return; }

    const items = steps.map(s => `
      <a class="collection-step" href="${s.href}">
        <span class="collection-step__num">${esc(s.step)}</span>
        <span class="collection-step__name">${esc(s.name)}</span>
      </a>
    `).join('<span class="collection-step__dot" aria-hidden="true"></span>');

    el.innerHTML = `
      <div class="container">
        <div class="collection-overview__heading">
          <h2 class="collection-overview__title">Protocol overview</h2>
          <span class="product-section__label">${esc(steps.length)} Steps</span>
        </div>
        <div class="collection-overview__track">${items}</div>
      </div>
    `;
  }

  function renderGrid(cfg, products, systemProduct) {
    const el = document.getElementById('collection-grid');
    if (!el) return;
    let skus;
    if (systemProduct && systemProduct.system_products) {
      skus = systemProduct.system_products.map(sp => sp.sku);
      if (cfg.includeSystemProduct !== false) skus = [systemProduct.sku, ...skus];
    } else {
      skus = cfg.skus || [];
    }
    const cards = skus
      .map(sku => products.find(p => p.sku === sku))
      .filter(Boolean)
      .map(productCard)
      .join('');
    el.innerHTML = cards || '<p class="no-results">No products available for this collection yet.</p>';
  }

  function renderDescription(cfg) {
    const el = document.getElementById('collection-description');
    if (!el) return;
    const protocol = cfg.protocol || {};
    const rows = [
      protocol.sessions   ? { label: 'Sessions',  value: protocol.sessions }   : null,
      protocol.frequency  ? { label: 'Frequency', value: protocol.frequency }  : null,
      protocol.duration   ? { label: 'Duration',  value: protocol.duration }   : null,
      protocol.network    ? { label: 'Network',   value: protocol.network }    : null
    ].filter(Boolean);
    const rowsHtml = rows.map(r => `
      <div class="protocol-info-box__row">
        <span class="protocol-info-box__label">${esc(r.label)}</span>
        <span class="protocol-info-box__value">${esc(r.value)}</span>
      </div>
    `).join('');

    const proWarn = protocol.proOnly
      ? `<div class="protocol-info-box__row">
           <span class="protocol-info-box__label">Use</span>
           <span class="protocol-info-box__value protocol-info-box__warn">Professional use only ⚠</span>
         </div>`
      : '';

    el.innerHTML = `
      <div class="container">
        <div class="collection-description__layout">
          <div class="collection-description__body">
            <span class="product-section__label">About this collection</span>
            <h2 class="product-section__title">${esc(cfg.descriptionTitle || cfg.title)}</h2>
            ${(cfg.descriptionLong || cfg.description).split('\n\n').map(p =>
              `<p>${esc(p)}</p>`
            ).join('')}
          </div>
          <aside class="protocol-info-box" aria-label="Protocol info">
            <span class="protocol-info-box__title">Protocol info</span>
            ${rowsHtml}
            ${proWarn}
          </aside>
        </div>
      </div>
    `;
  }

  async function init() {
    const cfg = window.HYPO_COLLECTION_CONFIG;
    if (!cfg) {
      console.warn('collection-page.js: HYPO_COLLECTION_CONFIG missing');
      return;
    }
    if (cfg.title) document.title = cfg.title + ' — Hypodermical Benelux';
    try {
      const products = await window.HypoProducts.all();
      const systemProduct = cfg.systemSku
        ? products.find(p => p.sku === cfg.systemSku)
        : null;
      renderHero(cfg);
      renderOverview(cfg, products, systemProduct);
      renderGrid(cfg, products, systemProduct);
      renderDescription(cfg);
    } catch (err) {
      console.error('Failed to load collection:', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
