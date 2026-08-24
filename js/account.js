(function () {
  'use strict';

  function formatPrice(cents, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const STATUS_BADGE = {
    PENDING: 'bg-secondary',
    AWAITING_PAYMENT: 'bg-warning text-dark',
    PAID: 'bg-success',
    FAILED: 'bg-danger',
    CANCELLED: 'bg-dark',
  };

  function orderCard(order) {
    const itemsList = order.items.map(i => `${i.nameSnapshot} × ${i.qty}`).join(', ');
    const badgeClass = STATUS_BADGE[order.status] || 'bg-secondary';
    return `
      <div class="checkout-panel mb-3">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div class="fw-bold">${formatDate(order.createdAt)}</div>
            <div class="text-muted" style="font-size:.85rem;">${itemsList}</div>
          </div>
          <div class="text-end">
            <span class="badge ${badgeClass} mb-1">${order.status.replace('_', ' ')}</span>
            <div class="fw-bold">${formatPrice(order.totalCents, order.currency)}</div>
          </div>
        </div>
      </div>`;
  }

  async function loadAccount() {
    let user;
    try {
      ({ user } = await AlhahAuth.me());
    } catch {
      window.location.href = `login.html?redirect=${encodeURIComponent('account.html')}`;
      return;
    }

    document.getElementById('accName').textContent = user.name;
    document.getElementById('accEmail').textContent = user.email;
    if (user.phone) {
      document.getElementById('accPhone').textContent = user.phone;
    } else {
      document.getElementById('accPhoneRow').style.display = 'none';
    }

    document.getElementById('accountLoading').style.display = 'none';
    document.getElementById('accountContent').style.display = '';

    try {
      const orders = await AlhahAuth.myOrders();
      const list = document.getElementById('ordersList');
      list.innerHTML = orders.length
        ? orders.map(orderCard).join('')
        : `<div class="checkout-panel text-center text-muted py-4">No orders yet. <a href="shop.html">Start shopping</a>.</div>`;
    } catch (err) {
      document.getElementById('ordersList').innerHTML =
        `<div class="checkout-error" style="display:block;">Could not load order history: ${err.message}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadAccount();
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      await AlhahAuth.logout();
      window.location.href = 'index.html';
    });
  });
})();
