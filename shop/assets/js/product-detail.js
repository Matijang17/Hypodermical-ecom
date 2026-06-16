/**
 * Hypodermical Benelux — product detail renderer.
 * Used by /shop/product.html and by every thin-wrapper per-product page
 * at /shop/<category>/<slug>.html. Resolves the slug from the URL
 * filename, fetches the catalogue, and renders the full detail layout.
 */
(function () {
  const CATEGORY_LABELS = {
    'home-care':    'Home Care',
    'face':         'Face Treatments',
    'mesococktail': 'Mesococktail',
    'body':         'Body'
  };

  const COLLECTION_LINKS = {
    'HY-EYE-001':         { slug: 'illumineye',         category: 'face', label: 'iLLUMiNEYE' },
    'HY-AC-F-001':        { slug: 'anti-couperose',    category: 'face', label: 'Anti-Couperose' },
    'HY-CO2-F-001':       { slug: 'carbo2xy-face',     category: 'face', label: 'CarbO2xy Face' },
    'HY-RP-SR-001':       { slug: 'retinol-peeling',   category: 'face', label: 'Retinol Peeling' },
    'HY-RP-SA-001':       { slug: 'retinol-peeling',   category: 'face', label: 'Retinol Peeling' },
    'HY-HBT-COLLECTION':  { slug: 'body',              category: 'home-care', label: 'Home Body Treatments' },
    'HY-SUN-SYSTEM':      { slug: 'sun-system',        category: 'home-care', label: 'Hypo Sun System' }
  };

  /* Biological-marker badge counts, looked up by parent-system SKU.
     These reflect the published marker coverage per Hypodermical's
     16-marker model. Mini section is only rendered when a count exists. */
  const SYSTEM_MARKER_COUNT = {
    'HY-EYE-001':  10,
    'HY-AC-F-001': 8,
    'HY-CO2-F-001': 12,
    'HY-RP-SR-001': 11,
    'HY-RP-SA-001': 9,
    'HY-HBT-COLLECTION': 6
  };

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function resolveSlug() {
    if (window.HYPO_PRODUCT_SLUG) return window.HYPO_PRODUCT_SLUG;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('slug') || params.get('sku');
    if (fromQuery) return fromQuery;
    const last = (window.location.pathname.split('/').filter(Boolean).pop() || '');
    if (last.endsWith('.html')) {
      const base = last.slice(0, -5);
      if (base && base !== 'product') return base;
    }
    return null;
  }

  function findProduct(products, slugOrSku) {
    return products.find(p => p.slug === slugOrSku)
        || products.find(p => p.sku === slugOrSku)
        || products.find(p => p.sku.toLowerCase() === String(slugOrSku).toLowerCase());
  }

  function findParentSystem(products, product) {
    if (!product.belongs_to_systems || !product.belongs_to_systems.length) return null;
    for (const ref of product.belongs_to_systems) {
      const sys = products.find(p => p.sku === ref.sku);
      if (sys) return sys;
    }
    return null;
  }

  function sectionShell(label, title, bodyHtml, extraClass = '') {
    return `
      <section class="product-section ${extraClass}">
        <span class="product-section__label">${esc(label)}</span>
        <h2 class="product-section__title">${esc(title)}</h2>
        ${bodyHtml}
      </section>
    `;
  }

  /* ───────────── Hero ───────────── */

  function priceMarkup(p) {
    if (p.professional_use_only) {
      return { cls: 'pro', text: 'Request Pricing', note: 'Professional access required' };
    }
    if (p.price == null) {
      return { cls: 'pro', text: 'Price on Request', note: 'Contact us to order' };
    }
    return {
      cls: '',
      text: '€' + (p.price / 100).toFixed(2).replace('.', ','),
      note: 'VAT included · Free shipping over €75'
    };
  }

  function actionsMarkup(p) {
    if (p.professional_use_only) {
      return `
        <div class="pro-gate" role="note">
          <div class="pro-gate__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="3" y="11" width="18" height="11"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <div class="pro-gate__body">
            <div class="pro-gate__title">Professional Access Required</div>
            <p class="pro-gate__copy">This product is reserved for certified Hypodermical partner centres. It cannot be purchased individually without professional training.</p>
            <div class="pro-gate__actions">
              <a href="/pages/professionals.html?ref=${encodeURIComponent(p.sku)}" class="btn-primary">Become a Partner</a>
              <a href="/pages/find-a-center.html" class="btn-secondary">Find a Centre</a>
            </div>
          </div>
        </div>
      `;
    }
    if (p.price == null) {
      return `
        <a href="/pages/contact.html?ref=${encodeURIComponent(p.sku)}" class="btn-primary" style="flex:1;">
          Contact to Order →
        </a>
      `;
    }
    return `
      <div class="product-hero__qty-control">
        <button type="button" data-qty-dec aria-label="Decrease quantity">−</button>
        <input type="number" min="1" max="99" value="1" id="product-qty" aria-label="Quantity" />
        <button type="button" data-qty-inc aria-label="Increase quantity">+</button>
      </div>
      <button type="button" class="btn-primary" data-add-to-cart-detail data-sku="${esc(p.sku)}">Add to Cart</button>
      <button type="button" class="btn-secondary" data-buy-now-detail data-sku="${esc(p.sku)}">Buy Now</button>
    `;
  }

  function badgeMarkup(p) {
    if (p.professional_use_only) {
      return `<span class="bubble-tag pro product-hero__badge">Pro Only</span>`;
    }
    return `<span class="bubble-tag product-hero__badge">Available Online</span>`;
  }

  function metaPills(p) {
    const pills = [];
    if (p.size) pills.push(p.size);
    if (p.concentration) pills.push(p.concentration);
    if (p.type) pills.push(p.type);
    if (p.natural_percentage) pills.push(p.natural_percentage + ' natural');
    if (p.protocol_step) pills.push(p.protocol_step);
    return pills.map(t => `<span>${esc(t)}</span>`).join('');
  }

  function heroMarkup(p) {
    const price = priceMarkup(p);
    return `
      <section class="product-hero">
        <div class="product-hero__media">
          <span class="bubble-ring bubble-ring--1" aria-hidden="true"></span>
          <span class="bubble-ring bubble-ring--2" aria-hidden="true"></span>
          <span class="bubble-ring bubble-ring--3" aria-hidden="true"></span>
          ${badgeMarkup(p)}
          <img src="${esc(p.image)}" alt="${esc(p.name)}" />
        </div>
        <div class="product-hero__details">
          <span class="product-hero__subcat">${esc(p.subcategory || p.category)}</span>
          <h1 class="product-hero__title">${esc(p.name)}</h1>
          <div class="product-hero__meta">${metaPills(p)}</div>
          <p class="product-hero__short">${esc(p.short_description)}</p>
          ${p.concern ? `<p class="product-hero__concern"><strong>Targets:</strong> ${esc(p.concern)}</p>` : ''}
          ${p.use_as ? `<p class="product-hero__use-as">${esc(p.use_as)}</p>` : ''}
          <div class="product-hero__price-row">
            <span class="product-hero__price ${price.cls}">${esc(price.text)}</span>
            <span class="product-hero__price-note">${esc(price.note)}</span>
          </div>
          <div class="product-hero__actions">${actionsMarkup(p)}</div>
          ${p.note ? `<p class="product-hero__note"><strong>Note:</strong> ${esc(p.note)}</p>` : ''}
        </div>
      </section>
    `;
  }

  /* ───────────── Protocol Step Strip ───────────── */

  function protocolStripSection(products, product, parentSystem) {
    if (!parentSystem || !parentSystem.system_products || !parentSystem.system_products.length) return '';
    const steps = parentSystem.system_products;
    const items = steps.map(s => {
      const isCurrent = s.sku === product.sku;
      const stepProduct = products.find(pp => pp.sku === s.sku);
      const href = stepProduct
        ? `/shop/${stepProduct.category}/${stepProduct.slug}.html`
        : `/shop/product.html?slug=${encodeURIComponent(s.sku)}`;
      return `
        <a class="step-strip__item ${isCurrent ? 'is-current' : ''}" href="${href}" aria-current="${isCurrent ? 'step' : 'false'}">
          <span class="step-strip__num">${esc(s.step)}</span>
          <span class="step-strip__name">${esc(s.name)}</span>
        </a>
      `;
    }).join('<span class="step-strip__dot" aria-hidden="true"></span>');
    const parentHref = (COLLECTION_LINKS[parentSystem.sku])
      ? `/shop/${COLLECTION_LINKS[parentSystem.sku].category}/${COLLECTION_LINKS[parentSystem.sku].slug}.html`
      : `/shop/${parentSystem.category}/${parentSystem.slug}.html`;
    return `
      <section class="step-strip" aria-label="Protocol steps">
        <div class="step-strip__heading">
          <span class="product-section__label">Protocol</span>
          <a href="${parentHref}" class="step-strip__system-link">${esc(parentSystem.short_name || parentSystem.name)} →</a>
        </div>
        <div class="step-strip__track">${items}</div>
      </section>
    `;
  }

  /* ───────────── Sections ───────────── */

  function fullDescriptionSection(p) {
    if (!p.full_description) return '';
    return sectionShell('About this product', 'In detail',
      `<div class="product-section__body"><p>${esc(p.full_description)}</p></div>`);
  }

  function benefitsSection(p) {
    if (!p.key_benefits || !p.key_benefits.length) return '';
    const cards = p.key_benefits.map((b, i) => `
      <div class="benefit-card">
        <span class="benefit-card__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="benefit-card__text">${esc(b)}</span>
      </div>
    `).join('');
    return sectionShell('Key Benefits', 'What this product does',
      `<div class="benefits-grid">${cards}</div>`);
  }

  function layersSection(p) {
    if (!p.layers || !p.layers.length) return '';
    const cards = p.layers.map((layer, i) => `
      <div class="layer-card">
        <div class="layer-card__head">
          <span class="layer-card__num">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="layer-card__name">${esc(layer.layer)}</h3>
        </div>
        <ul class="layer-card__ingredients">
          ${layer.ingredients.map(ing => `<li>${esc(ing)}</li>`).join('')}
        </ul>
      </div>
    `).join('');
    return sectionShell('Three-Layer Formula', 'The science of delivery',
      `<div class="layers-grid">${cards}</div>`);
  }

  function activeIngredientsSection(p) {
    if (!p.active_ingredients || !p.active_ingredients.length) return '';
    const rows = p.active_ingredients.map(a => `
      <div class="ingredient-row">
        <div class="ingredient-row__name">${esc(a.name)}</div>
        <div class="ingredient-row__action">${esc(a.action)}</div>
      </div>
    `).join('');
    return sectionShell('Active Ingredients', 'Active formulation',
      `<div class="ingredient-table">${rows}</div>`);
  }

  function indicationsSection(p) {
    if (!p.indications || !p.indications.length) return '';
    const chips = p.indications.map(i => `<span class="indication-chip">${esc(i)}</span>`).join('');
    return sectionShell('Indications', 'Best suited for',
      `<div class="indications-list">${chips}</div>`);
  }

  function systemProductsSection(p, products) {
    if (!p.system_products || !p.system_products.length) return '';
    const steps = p.system_products.map(sp => {
      const stepProduct = products && products.find(pp => pp.sku === sp.sku);
      const href = stepProduct
        ? `/shop/${stepProduct.category}/${stepProduct.slug}.html`
        : `/shop/product.html?slug=${encodeURIComponent(sp.sku)}`;
      return `
        <a class="system-step-card" href="${href}">
          <span class="system-step-card__num">${esc(sp.step)}</span>
          <div class="system-step-card__body">
            <div class="system-step-card__name">${esc(sp.name)}</div>
            ${sp.size ? `<div class="system-step-card__size">${esc(sp.size)}</div>` : ''}
            ${sp.description ? `<div class="system-step-card__desc">${esc(sp.description)}</div>` : ''}
          </div>
          <svg class="system-step-card__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      `;
    }).join('');
    return sectionShell('System Composition', 'Everything in this system',
      `<div class="system-steps-grid">${steps}</div>`);
  }

  function belongsToSection(p, products) {
    if (!p.belongs_to_systems || !p.belongs_to_systems.length) return '';
    const cards = p.belongs_to_systems.map(sys => {
      const known = COLLECTION_LINKS[sys.sku];
      const sysProduct = products.find(pp => pp.sku === sys.sku);
      const href = known
        ? `/shop/${known.category}/${known.slug}.html`
        : (sysProduct
          ? `/shop/${sysProduct.category}/${sysProduct.slug}.html`
          : `/shop/product.html?slug=${encodeURIComponent(sys.sku)}`);
      return `
        <a class="belongs-card" href="${href}">
          <div>
            <span class="belongs-card__label">Part of</span>
            <div class="belongs-card__name">${esc(sys.name)}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      `;
    }).join('');
    return sectionShell('System Membership', 'Used as part of these systems',
      `<div class="belongs-grid">${cards}</div>`);
  }

  function technologySection(p) {
    if (!p.technology) return '';
    return sectionShell('Technology', 'Application method',
      `<div class="product-section__body"><p>${esc(p.technology)}</p></div>`);
  }

  function protocolSection(p) {
    const parts = [];
    if (p.protocol_sessions) parts.push(`<strong>${p.protocol_sessions} sessions</strong>`);
    if (p.session_frequency) parts.push(esc(p.session_frequency));
    if (p.skin_type) parts.push('For ' + esc(p.skin_type));
    if (!parts.length) return '';
    return sectionShell('Protocol', 'Treatment plan',
      `<div class="product-section__body"><p>${parts.join(' · ')}</p></div>`);
  }

  function recoverySection(p) {
    if (!p.recovery) return '';
    return sectionShell('Recovery', 'After treatment',
      `<div class="product-section__body"><p>${esc(p.recovery)}</p></div>`);
  }

  function instructionsSection(p) {
    if (!p.instructions || !p.instructions.length) return '';
    const steps = p.instructions.map((s, i) => `
      <li class="instruction-step">
        <span class="instruction-step__num">${String(i + 1).padStart(2, '0')}</span>
        <span class="instruction-step__text">${esc(s)}</span>
      </li>
    `).join('');
    return sectionShell('Instructions', 'How to use',
      `<ol class="instructions-list">${steps}</ol>`);
  }

  function dualUseSection(p) {
    if (!p.professional_use && !p.home_use) return '';
    return sectionShell('Use', 'Professional & at home',
      `<div class="dual-use-grid">
        ${p.professional_use ? `<div class="dual-use-card">
          <span class="dual-use-card__label">In the clinic</span>
          <p>${esc(p.professional_use)}</p>
        </div>` : ''}
        ${p.home_use ? `<div class="dual-use-card">
          <span class="dual-use-card__label">At home</span>
          <p>${esc(p.home_use)}</p>
        </div>` : ''}
      </div>`);
  }

  /* ───────────── Biological Markers Mini ───────────── */

  function biologicalMarkersMini(product, parentSystem) {
    const key = (parentSystem && parentSystem.sku) || (product.belongs_to_systems && product.belongs_to_systems[0] && product.belongs_to_systems[0].sku);
    const count = key && SYSTEM_MARKER_COUNT[key];
    if (!count) return '';
    return `
      <section class="bio-markers-mini" aria-label="Biological markers">
        <div class="bio-markers-mini__inner">
          <span class="bubble-tag white">16 Markers Method</span>
          <p class="bio-markers-mini__copy">
            This product is part of a protocol that addresses
            <strong>${count} of the 16 biological markers</strong> of ageing.
          </p>
          <a href="/pages/method.html" class="bio-markers-mini__link">Discover the Method →</a>
        </div>
      </section>
    `;
  }

  /* ───────────── Complete the Protocol cross-sell ───────────── */

  function completeProtocolSection(products, product, parentSystem) {
    if (!parentSystem || !parentSystem.system_products) return '';
    const siblings = parentSystem.system_products
      .filter(sp => sp.sku !== product.sku)
      .map(sp => {
        const sib = products.find(pp => pp.sku === sp.sku);
        return sib ? { ...sib, step: sp.step } : null;
      })
      .filter(Boolean);
    if (!siblings.length) return '';
    const cards = siblings.map(s => `
      <a class="protocol-card" href="/shop/${esc(s.category)}/${esc(s.slug)}.html">
        <div class="protocol-card__img-wrap">
          <span class="protocol-card__step">${esc(s.step)}</span>
          <img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy" />
        </div>
        <div class="protocol-card__body">
          <span class="protocol-card__subcat">${esc(s.subcategory || s.category)}</span>
          <h3 class="protocol-card__name">${esc(s.short_name || s.name)}</h3>
          ${s.size ? `<div class="protocol-card__size">${esc(s.size)}</div>` : ''}
        </div>
      </a>
    `).join('');
    return `
      <section class="product-section product-section--cross-sell">
        <span class="product-section__label">Complete the Protocol</span>
        <h2 class="product-section__title">Other steps in this protocol</h2>
        <div class="protocol-scroll">${cards}</div>
      </section>
    `;
  }

  /* ───────────── Home Care Pairing (pro products only) ───────────── */

  function homeCarePairingSection(products, product) {
    if (!product.professional_use_only) return '';
    const pairings = products.filter(p =>
      !p.professional_use_only &&
      p.belongs_to_systems &&
      p.belongs_to_systems.some(s => s.sku === product.sku ||
        (product.belongs_to_systems || []).some(b => b.sku === s.sku))
    ).slice(0, 4);
    if (!pairings.length) return '';
    const cards = pairings.map(s => `
      <a class="protocol-card" href="/shop/${esc(s.category)}/${esc(s.slug)}.html">
        <div class="protocol-card__img-wrap">
          <img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy" />
        </div>
        <div class="protocol-card__body">
          <span class="protocol-card__subcat">${esc(s.subcategory || s.category)}</span>
          <h3 class="protocol-card__name">${esc(s.short_name || s.name)}</h3>
          ${s.size ? `<div class="protocol-card__size">${esc(s.size)}</div>` : ''}
        </div>
      </a>
    `).join('');
    return `
      <section class="product-section product-section--cross-sell">
        <span class="product-section__label">Home Care Pairing</span>
        <h2 class="product-section__title">Complete your results at home</h2>
        <div class="protocol-scroll">${cards}</div>
      </section>
    `;
  }

  /* ───────────── Find a Centre CTA ───────────── */

  function findACentreCta(p) {
    if (!p.professional_use_only) return '';
    return `
      <section class="find-a-centre">
        <div class="find-a-centre__inner">
          <span class="bubble-tag white">Treatment Network</span>
          <h2 class="find-a-centre__title">This product is used at certified Hypodermical partner centres.</h2>
          <p class="find-a-centre__copy">Book a consultation at a partner centre to experience the full protocol with trained professionals.</p>
          <a href="/pages/find-a-center.html" class="btn-ghost-light">Find a Centre →</a>
        </div>
      </section>
    `;
  }

  /* ───────────── Render ───────────── */

  function buildBreadcrumb(p, products) {
    const cat = CATEGORY_LABELS[p.category] || p.category;
    const parentSystem = findParentSystem(products, p);
    let collection = parentSystem && COLLECTION_LINKS[parentSystem.sku];
    if (!collection && p.belongs_to_systems) {
      for (const ref of p.belongs_to_systems) {
        if (COLLECTION_LINKS[ref.sku]) { collection = COLLECTION_LINKS[ref.sku]; break; }
      }
    }
    let collectionLink = '';
    if (collection) {
      collectionLink = `<a href="/shop/${esc(collection.category)}/${esc(collection.slug)}.html">${esc(collection.label)}</a><span class="sep">/</span>`;
    } else if (parentSystem) {
      collectionLink = `<a href="/shop/${esc(parentSystem.category)}/${esc(parentSystem.slug)}.html">${esc(parentSystem.short_name || parentSystem.name)}</a><span class="sep">/</span>`;
    }
    return `
      <nav class="product-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span class="sep">/</span>
        <a href="/shop/">Shop</a><span class="sep">/</span>
        <a href="/shop/?filter=${esc(p.category)}">${esc(cat)}</a><span class="sep">/</span>
        ${collectionLink}
        <span class="current">${esc(p.short_name || p.name)}</span>
      </nav>
    `;
  }

  function render(p, products) {
    const root = document.getElementById('product-root');
    const parentSystem = findParentSystem(products, p);

    const html = [
      buildBreadcrumb(p, products),
      heroMarkup(p),
      protocolStripSection(products, p, parentSystem),
      fullDescriptionSection(p),
      benefitsSection(p),
      layersSection(p),
      activeIngredientsSection(p),
      indicationsSection(p),
      systemProductsSection(p, products),
      belongsToSection(p, products),
      dualUseSection(p),
      technologySection(p),
      protocolSection(p),
      recoverySection(p),
      instructionsSection(p),
      biologicalMarkersMini(p, parentSystem),
      completeProtocolSection(products, p, parentSystem),
      homeCarePairingSection(products, p),
      findACentreCta(p)
    ].join('');

    root.innerHTML = html;

    document.title = p.name + ' — Hypodermical Benelux';
    const desc = document.querySelector('meta[name="description"]');
    if (desc && p.short_description) desc.content = p.short_description;

    wireDetailActions(p);
  }

  function renderError() {
    const root = document.getElementById('product-root');
    root.innerHTML = '';
    const tpl = document.getElementById('tpl-error');
    if (tpl) root.appendChild(tpl.content.cloneNode(true));
    else root.innerHTML = '<div class="product-error"><h1>Product not found</h1><p>Try the <a href="/shop/">shop</a>.</p></div>';
    document.title = 'Product Not Found — Hypodermical Benelux';
  }

  function wireDetailActions(p) {
    const qtyInput = document.getElementById('product-qty');
    if (!qtyInput) return;

    const dec = document.querySelector('[data-qty-dec]');
    const inc = document.querySelector('[data-qty-inc]');
    const addBtn = document.querySelector('[data-add-to-cart-detail]');
    const buyBtn = document.querySelector('[data-buy-now-detail]');

    const getQty = () => Math.max(1, Math.min(99, parseInt(qtyInput.value, 10) || 1));

    if (dec) dec.addEventListener('click', () => { qtyInput.value = Math.max(1, getQty() - 1); });
    if (inc) inc.addEventListener('click', () => { qtyInput.value = Math.min(99, getQty() + 1); });
    if (addBtn) addBtn.addEventListener('click', () => HypoCart.add(p, getQty()));
    if (buyBtn) buyBtn.addEventListener('click', () => {
      HypoCart.add(p, getQty());
      window.location.href = '/shop/cart.html';
    });
  }

  async function init() {
    const slug = resolveSlug();
    if (!slug) { renderError(); return; }
    try {
      const products = await window.HypoProducts.all();
      const product = findProduct(products, slug);
      if (!product) { renderError(); return; }
      render(product, products);
    } catch (err) {
      console.error('Failed to load product:', err);
      renderError();
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
