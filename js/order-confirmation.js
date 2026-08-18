/**
 * order-confirmation.html logic: reads ?order=<id> and polls the backend
 * for status. In real Payoneer flows, PAID only becomes true once the
 * webhook fires (see server/src/controllers/webhooks.controller.js) — the
 * redirect back here is never itself trusted as proof of payment.
 */
(function () {
  'use strict';

  const API_BASE = window.ALHAH_SHOP_CONFIG?.API_BASE || '';
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  const isDemo = params.get('demo') === '1';

  function formatPrice(cents, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100);
  }

  function renderStatus(order) {
    const iconEl = document.getElementById('confirmIcon');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const summaryEl = document.getElementById('confirmSummary');

    const statusMap = {
      PAID: { icon: 'fa-check-circle', color: '#16a34a', title: 'Order Confirmed', message: 'Thank you — your payment was received and your order is confirmed.' },
      PENDING: { icon: 'fa-clock', color: '#d97706', title: 'Awaiting Payment', message: 'Your order was created but payment has not been completed yet.' },
      AWAITING_PAYMENT: { icon: 'fa-clock', color: '#d97706', title: 'Confirming Payment…', message: 'We are waiting for payment confirmation. This page will update automatically.' },
      FAILED: { icon: 'fa-times-circle', color: '#dc2626', title: 'Payment Failed', message: 'Something went wrong with payment. Please try again or contact us.' },
      CANCELLED: { icon: 'fa-times-circle', color: '#dc2626', title: 'Order Cancelled', message: 'This order was cancelled.' },
    };
    const s = statusMap[order.status] || statusMap.PENDING;

    if (iconEl) { iconEl.className = `fas ${s.icon}`; iconEl.style.color = s.color; }
    if (titleEl) titleEl.textContent = s.title;
    if (messageEl) messageEl.textContent = s.message;

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
      renderStatus(order);
      if (order.status === 'AWAITING_PAYMENT' && attemptsLeft > 0) {
        setTimeout(() => poll(attemptsLeft - 1), 3000);
      }
    } catch (err) {
      showError(err.message || 'Could not load this order.');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const demoBanner = document.getElementById('confirmDemoBanner');
    if (demoBanner) demoBanner.style.display = isDemo ? 'block' : 'none';

    if (!orderId) { showError('No order specified.'); return; }
    poll(10);
  });
})();
