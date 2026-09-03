/**
 * order-confirmation.html logic: reads ?order=<id> and shows its status,
 * polling for updates. There is no payment gateway — PENDING is the
 * normal "successfully placed" state; the admin marks it PAID later
 * (after arranging payment directly with the customer) from the admin
 * dashboard's Orders tab, and this page picks that up live if the
 * customer is still here.
 */
(function () {
  'use strict';

  const API_BASE = window.ALHAH_SHOP_CONFIG?.API_BASE || '';
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  const POLL_MS = 5000;
  const MAX_POLLS = 120; // ~10 minutes, then stop — customer can just refresh

  function formatPrice(cents, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100);
  }

  const TERMINAL_STATUSES = new Set(['PAID', 'FAILED', 'CANCELLED']);

  function renderStatus(order) {
    const iconEl = document.getElementById('confirmIcon');
    const titleEl = document.getElementById('confirmTitle');
    const orderNumberEl = document.getElementById('confirmOrderNumber');
    const messageEl = document.getElementById('confirmMessage');
    const summaryEl = document.getElementById('confirmSummary');
    const liveEl = document.getElementById('confirmLiveNote');

    const statusMap = {
      PENDING: { icon: 'fa-check-circle', color: '#16a34a', title: 'Order Placed!', message: "Thank you — we've received your order and will contact you shortly to arrange payment." },
      AWAITING_PAYMENT: { icon: 'fa-clock', color: '#d97706', title: 'Awaiting Payment', message: 'We are following up with you to complete payment for this order.' },
      PAID: { icon: 'fa-check-circle', color: '#16a34a', title: 'Payment Received', message: 'Your payment has been confirmed — this order is fully processed.' },
      FAILED: { icon: 'fa-times-circle', color: '#dc2626', title: 'Payment Issue', message: 'There was a problem with payment on this order. Please contact us.' },
      CANCELLED: { icon: 'fa-times-circle', color: '#dc2626', title: 'Order Cancelled', message: 'This order was cancelled.' },
    };
    const s = statusMap[order.status] || statusMap.PENDING;

    if (iconEl) { iconEl.className = `fas ${s.icon}`; iconEl.style.color = s.color; }
    if (titleEl) titleEl.textContent = s.title;
    if (orderNumberEl) orderNumberEl.textContent = order.orderNumber;
    if (messageEl) messageEl.textContent = s.message;
    if (liveEl) liveEl.style.display = TERMINAL_STATUSES.has(order.status) ? 'none' : '';

    if (summaryEl) {
      summaryEl.innerHTML = order.items.map(i => `
        <div class="checkout-summary-row">
          <span>${i.nameSnapshot} × ${i.qty}</span>
          <span>${formatPrice(i.priceCentsSnapshot * i.qty, order.currency)}</span>
        </div>`).join('') + `
        <div class="checkout-summary-row checkout-summary-total">
          <span>Total</span><span>${formatPrice(order.totalCents, order.currency)}</span>
        </div>`;
    }

    return order.status;
  }

  function showError(msg) {
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    if (titleEl) titleEl.textContent = 'Order Not Found';
    if (messageEl) messageEl.textContent = msg;
  }

  async function poll(attemptsLeft) {
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/status`);
      if (!res.ok) throw new Error('Order not found.');
      const order = await res.json();
      const status = renderStatus(order);
      if (!TERMINAL_STATUSES.has(status) && attemptsLeft > 0) {
        setTimeout(() => poll(attemptsLeft - 1), POLL_MS);
      }
    } catch (err) {
      showError(err.message || 'Could not load this order.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!orderId) { showError('No order specified.'); return; }
    poll(MAX_POLLS);
  });
})();
