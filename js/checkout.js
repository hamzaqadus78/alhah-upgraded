/**
 * checkout.html logic: renders the shop cart's order summary, submits the
 * order to the backend, then goes straight to the confirmation page.
 *
 * There is no payment gateway — orders are created PENDING and the admin
 * marks them PAID later (after arranging payment directly with the
 * customer), from the admin dashboard's Orders tab.
 */
(function () {
  'use strict';

  const API_BASE = window.ALHAH_SHOP_CONFIG?.API_BASE || '';
  const GUEST_CODE_KEY = 'alhah_guest_code';

  function formatPrice(cents, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100);
  }

  // Persistent per-browser identifier for guest (not-logged-in) checkouts,
  // so the admin dashboard can recognize a repeat guest across orders
  // without requiring an account.
  function getOrCreateGuestCode() {
    try {
      let code = localStorage.getItem(GUEST_CODE_KEY);
      if (!code) {
        code = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        localStorage.setItem(GUEST_CODE_KEY, code);
      }
      return code;
    } catch {
      return null; // localStorage unavailable (private mode etc.) — fine, just no guest tracking
    }
  }

  function renderSummary() {
    const cart = AlhahShop.getCart();
    const summaryEl = document.getElementById('checkoutOrderSummary');
    const totalEl = document.getElementById('checkoutOrderTotal');
    const payBtn = document.getElementById('checkoutPayBtn');
    if (!summaryEl) return;

    if (!cart.length) {
      summaryEl.innerHTML = `<p class="text-muted">Your cart is empty. <a href="shop.html">Go shopping</a>.</p>`;
      if (totalEl) totalEl.textContent = '';
      if (payBtn) payBtn.disabled = true;
      return;
    }

    const currency = cart[0].currency;
    const subtotalCents = cart.reduce((s, i) => s + i.priceCents * i.qty, 0);

    summaryEl.innerHTML = cart.map(i => `
      <div class="checkout-summary-row">
        <span>${i.name} × ${i.qty}</span>
        <span>${formatPrice(i.priceCents * i.qty, i.currency)}</span>
      </div>`).join('');

    if (totalEl) totalEl.innerHTML = `
      <div class="checkout-summary-row checkout-summary-total">
        <span>Total</span><span>${formatPrice(subtotalCents, currency)}</span>
      </div>
      <p class="checkout-shipping-note"><i class="fas fa-info-circle me-1"></i>Shipping calculated after order — this is an early v1 of the store.</p>`;
    if (payBtn) payBtn.disabled = false;
  }

  function setError(msg) {
    const el = document.getElementById('checkoutError');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = msg;
    el.style.display = 'block';
  }

  async function submitOrder(e) {
    e.preventDefault();
    setError(null);

    const cart = AlhahShop.getCart();
    if (!cart.length) { setError('Your cart is empty.'); return; }

    const payBtn = document.getElementById('checkoutPayBtn');
    payBtn.disabled = true;
    payBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Placing order…';

    const payload = {
      items: cart.map(i => ({ productId: i.id, qty: i.qty })),
      customerName: document.getElementById('coName').value.trim(),
      customerEmail: document.getElementById('coEmail').value.trim(),
      customerPhone: document.getElementById('coPhone').value.trim(),
      shippingAddress: {
        line1: document.getElementById('coAddress').value.trim(),
        city: document.getElementById('coCity').value.trim(),
        country: document.getElementById('coCountry').value.trim(),
        postalCode: document.getElementById('coPostal').value.trim(),
      },
      guestCode: getOrCreateGuestCode(),
    };

    try {
      const orderRes = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Could not create order.');

      // Nothing is saved yet — the order is only created once the customer
      // clicks the emailed confirmation link (checkout-confirm.html) and
      // explicitly confirms. The cart stays intact until then, in case
      // they need to come back and retry.
      document.getElementById('checkoutForm').style.display = 'none';
      const pending = document.getElementById('checkoutPendingVerification');
      if (pending) {
        pending.querySelector('[data-email]').textContent = orderData.email;
        pending.style.display = '';
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      payBtn.disabled = false;
      payBtn.innerHTML = '<i class="fas fa-lock me-2"></i>Proceed to Pay';
    }
  }

  // If logged in, prefill name/email/phone so returning customers don't
  // have to retype them — guest checkout still works fine if this fails.
  async function prefillFromAccount() {
    if (!window.AlhahAuth) return;
    try {
      const { user } = await AlhahAuth.me();
      const nameEl = document.getElementById('coName');
      const emailEl = document.getElementById('coEmail');
      const phoneEl = document.getElementById('coPhone');
      if (nameEl && !nameEl.value) nameEl.value = user.name;
      if (emailEl && !emailEl.value) emailEl.value = user.email;
      if (phoneEl && !phoneEl.value && user.phone) phoneEl.value = user.phone;
    } catch {
      // not logged in — guest checkout, nothing to prefill
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSummary();
    prefillFromAccount();
    document.getElementById('checkoutForm')?.addEventListener('submit', submitOrder);
  });
})();
