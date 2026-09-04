/**
 * checkout-confirm.html logic: decodes the token to show an order summary,
 * then requires an explicit button click before actually placing the
 * order. Deliberately NOT auto-firing on page load — email clients
 * (Gmail/Outlook) commonly prefetch links for security scanning, which
 * would otherwise silently create a real, stock-decrementing order
 * before the customer ever saw this page.
 */
(function () {
  'use strict';

  const API_BASE = window.ALHAH_SHOP_CONFIG?.API_BASE || '';
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  function formatPrice(cents, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100);
  }

  function setError(msg) {
    const el = document.getElementById('confirmError');
    if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = msg;
    el.style.display = 'block';
  }

  // JWTs are signed, not encrypted — this just reads the data the
  // customer themselves already typed at checkout, nothing new exposed.
  function decodeTokenPayload(jwt) {
    const parts = jwt.split('.');
    if (parts.length !== 3) throw new Error('Malformed token.');
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map((c) =>
      '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    return JSON.parse(json);
  }

  async function load() {
    if (!token) {
      document.getElementById('confirmLoading').style.display = 'none';
      setError('No confirmation token was provided.');
      return;
    }

    let decoded;
    try {
      decoded = decodeTokenPayload(token);
      if (decoded.purpose !== 'verify-checkout') throw new Error('Wrong token type.');
    } catch {
      document.getElementById('confirmLoading').style.display = 'none';
      setError('This confirmation link is invalid.');
      return;
    }

    const cartPayload = decoded.payload;

    try {
      const products = await fetch(`${API_BASE}/api/products`).then((r) => r.json());
      const productById = new Map(products.map((p) => [p.id, p]));

      let subtotalCents = 0;
      let currency = 'USD';
      const rows = cartPayload.items.map((line) => {
        const product = productById.get(line.productId);
        const name = product ? product.name : 'Product';
        const priceCents = product ? product.priceCents : 0;
        currency = product ? product.currency : currency;
        subtotalCents += priceCents * line.qty;
        return `<div class="checkout-summary-row"><span>${name} × ${line.qty}</span><span>${formatPrice(priceCents * line.qty, currency)}</span></div>`;
      }).join('');

      document.getElementById('confirmSummary').innerHTML = rows + `
        <div class="checkout-summary-row checkout-summary-total">
          <span>Total</span><span>${formatPrice(subtotalCents, currency)}</span>
        </div>
        <p class="checkout-shipping-note"><i class="fas fa-info-circle me-1"></i>Final total is confirmed fresh when you click Confirm below — prices/stock may have changed slightly since you checked out.</p>`;

      const addr = cartPayload.shippingAddress || {};
      document.getElementById('confirmShipping').innerHTML = `
        ${cartPayload.customerName}<br>
        ${cartPayload.customerEmail} · ${cartPayload.customerPhone}<br>
        ${addr.line1 || ''}, ${addr.city || ''}, ${addr.country || ''} ${addr.postalCode || ''}`;

      document.getElementById('confirmLoading').style.display = 'none';
      document.getElementById('confirmContent').style.display = '';
    } catch (err) {
      document.getElementById('confirmLoading').style.display = 'none';
      setError('Could not load your order details. Please try checking out again.');
    }
  }

  async function confirmOrder() {
    setError(null);
    const btn = document.getElementById('confirmBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Placing order…';

    try {
      const res = await fetch(`${API_BASE}/api/orders/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not confirm your order.');

      window.location.href = `order-confirmation.html?order=${data.orderId}`;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Confirm My Order';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    load();
    document.getElementById('confirmBtn')?.addEventListener('click', confirmOrder);
  });
})();
