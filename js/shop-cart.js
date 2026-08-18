/**
 * ALHAH INDUSTRIES — Real Shopping Cart
 *
 * Fully separate from js/cart.js's "Quote List" (RFQ) system: own
 * localStorage key, own global namespace, own DOM ids, so the two never
 * collide (see plan Part B5). This cart holds priced products fetched
 * from the backend (js/shop.js) and hands off to checkout.html for
 * payment — it does not itself talk to the API.
 */

(function () {
  'use strict';

  const CART_KEY = 'alhah_shop_cart_v1';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  function saveCart(c) {
    localStorage.setItem(CART_KEY, JSON.stringify(c));
    renderCart(); updateBadges();
  }
  function addItem(product) {
    const c = getCart();
    const ex = c.find(i => i.id === product.id);
    const moq = product.moq || 1;
    if (ex) ex.qty = Math.min(ex.qty + 1, product.stock ?? 99);
    else c.push({ ...product, qty: moq });
    saveCart(c);
    toast('<i class="fas fa-check-circle"></i> Added to cart');
    pulseBadge();
  }
  function removeItem(id) { saveCart(getCart().filter(i => i.id !== id)); }
  function changeQty(id, d) {
    const c = getCart();
    const it = c.find(i => i.id === id);
    if (!it) return;
    const moq = it.moq || 1;
    it.qty = Math.max(moq, Math.min(it.qty + d, it.stock ?? 99));
    saveCart(c);
  }
  function clearAll() { localStorage.removeItem(CART_KEY); renderCart(); updateBadges(); }

  function formatPrice(cents, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100);
  }

  function updateBadges() {
    const n = getCart().reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.shop-cart-badge').forEach(el => {
      el.textContent = n;
      el.style.display = n ? 'flex' : 'none';
    });
  }
  function pulseBadge() {
    document.querySelectorAll('.shop-cart-badge').forEach(b => {
      b.style.animation = 'none';
      requestAnimationFrame(() => { b.style.animation = 'shopPop 0.4s ease'; });
    });
  }

  function renderCart() {
    const c = getCart();
    const body = document.getElementById('shopCartDrawerBody');
    const footer = document.getElementById('shopCartDrawerFooter');
    if (!body) return;

    if (!c.length) {
      body.innerHTML = `
        <div class="shop-cart-empty">
          <div class="shop-cart-empty-icon"><i class="fas fa-shopping-cart"></i></div>
          <h5>Your cart is empty</h5>
          <p>Browse the shop and add instruments to your cart.</p>
        </div>`;
      if (footer) footer.innerHTML = '';
      return;
    }

    body.innerHTML = c.map(i => `
      <div class="shop-cart-item" data-id="${i.id}">
        <img class="shop-cart-item-img" src="${i.img}" alt="${i.name}" onerror="this.src='img/img1.jpg'">
        <div class="shop-cart-item-info">
          <div class="shop-cart-item-name">${i.name}</div>
          <div class="shop-cart-item-price">${formatPrice(i.priceCents, i.currency)} <span class="shop-cart-item-each">each</span></div>
          <div class="shop-cart-item-controls">
            <button class="qty-btn" onclick="AlhahShop.changeQty('${i.id}',-1)">−</button>
            <span class="qty-display">${i.qty}</span>
            <button class="qty-btn" onclick="AlhahShop.changeQty('${i.id}',1)">+</button>
          </div>
        </div>
        <button class="shop-cart-item-remove" onclick="AlhahShop.remove('${i.id}')" title="Remove">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>`).join('');

    const subtotalCents = c.reduce((s, i) => s + i.priceCents * i.qty, 0);
    const currency = c[0]?.currency || 'USD';
    if (footer) footer.innerHTML = `
      <div class="shop-cart-subtotal">
        <span>Subtotal</span><span>${formatPrice(subtotalCents, currency)}</span>
      </div>
      <div class="shop-cart-note">
        <i class="fas fa-info-circle me-1"></i> Shipping calculated at checkout.
      </div>
      <button class="btn-shop-checkout" onclick="AlhahShop.goToCheckout()">
        <i class="fas fa-lock"></i> Proceed to Checkout
      </button>
      <button class="btn-shop-clear" onclick="AlhahShop.confirmClear()">
        <i class="fas fa-times me-1"></i> Clear cart
      </button>`;
  }

  function openCart() {
    document.getElementById('shopCartDrawer')?.classList.add('open');
    document.getElementById('shopCartOverlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCart();
  }
  function closeCart() {
    document.getElementById('shopCartDrawer')?.classList.remove('open');
    document.getElementById('shopCartOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function goToCheckout() {
    if (!getCart().length) { toast('<i class="fas fa-exclamation-circle"></i> Your cart is empty'); return; }
    window.location.href = 'checkout.html';
  }

  function confirmClear() {
    if (confirm('Remove all items from your cart?')) clearAll();
  }

  let _toastTimer;
  function toast(html) {
    let el = document.getElementById('shopCartToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'shopCartToast';
      el.className = 'shop-cart-toast';
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  function injectCartHTML() {
    document.body.insertAdjacentHTML('beforeend', `
    <div id="shopCartOverlay" class="shop-cart-overlay" onclick="AlhahShop.close()"></div>
    <div id="shopCartDrawer" class="shop-cart-drawer">
      <div class="shop-cart-drawer-header">
        <h3><i class="fas fa-shopping-cart me-2"></i>Your Cart</h3>
        <button class="shop-cart-close-btn" onclick="AlhahShop.close()"><i class="fas fa-times"></i></button>
      </div>
      <div class="shop-cart-drawer-body" id="shopCartDrawerBody"></div>
      <div id="shopCartDrawerFooter" class="shop-cart-drawer-footer"></div>
    </div>`);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeCart();
    });
  }

  window.AlhahShop = {
    add: addItem, remove: removeItem, changeQty,
    open: openCart, close: closeCart,
    goToCheckout, confirmClear, getCart, formatPrice,
  };

  document.addEventListener('DOMContentLoaded', () => {
    injectCartHTML();
    updateBadges();
  });
})();
