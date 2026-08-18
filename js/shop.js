/**
 * Renders shop.html's product grid from the backend API (server/) instead
 * of hardcoded HTML, so prices/stock can be edited (Prisma Studio) without
 * redeploying the static site. See plan Part B5.
 */
(function () {
  'use strict';

  const API_BASE = window.ALHAH_SHOP_CONFIG?.API_BASE || '';
  let allProducts = [];

  function formatPrice(cents, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100);
  }

  function productCard(p) {
    const img = p.images?.[0] || 'img/img1.jpg';
    return `
      <div class="col-lg-4 col-md-6 product-item" data-category="${p.category}">
        <div class="product-card">
          <div class="product-img-wrap">
            <img src="${img}" alt="${p.name}" onerror="this.src='img/img1.jpg'">
          </div>
          <div class="product-card-body">
            <div class="product-category-tag">${p.category}</div>
            <div class="product-name">${p.name}</div>
            <p class="product-desc">${p.description}</p>
            <div class="shop-product-price">
              ${formatPrice(p.priceCents, p.currency)}
              <span class="shop-moq-note">MOQ: ${p.moq} · ${p.stock} in stock</span>
            </div>
            <div class="product-card-footer">
              <button class="btn-add-cart" onclick='addToShopCart(this, ${JSON.stringify(shopCartPayload(p))})'>
                <i class="fas fa-cart-plus me-1"></i> Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function shopCartPayload(p) {
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      img: p.images?.[0] || 'img/img1.jpg',
      priceCents: p.priceCents,
      currency: p.currency,
      moq: p.moq,
      stock: p.stock,
    };
  }

  function render(products) {
    const grid = document.getElementById('shopProductsGrid');
    if (!grid) return;
    if (!products.length) {
      grid.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No products available yet — check back soon.</p></div>`;
      return;
    }
    grid.innerHTML = products.map(productCard).join('');
  }

  async function loadProducts() {
    const grid = document.getElementById('shopProductsGrid');
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      allProducts = await res.json();
      render(allProducts);
    } catch (err) {
      console.error('Failed to load products:', err);
      if (grid) grid.innerHTML = `<div class="col-12 text-center py-5"><p class="text-danger">Could not load the shop right now. Please try again shortly.</p></div>`;
    }
  }

  window.filterShopByCategory = function (cat, btn) {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render(cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat));
  };

  window.filterShopProducts = function () {
    const q = document.getElementById('shopProductSearch').value.toLowerCase();
    render(allProducts.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
  };

  window.addToShopCart = function (btn, product) {
    AlhahShop.add(product);
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Added!';
    btn.classList.add('added');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('added');
    }, 1500);
  };

  document.addEventListener('DOMContentLoaded', loadProducts);
})();
