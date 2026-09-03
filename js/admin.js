/**
 * ALHAH Admin dashboard. Entirely separate session/cookie from customer
 * accounts (js/auth.js) — this talks to /api/admin/* only, which is
 * protected by its own requireAdmin middleware server-side.
 */
(function () {
  'use strict';

  const API_BASE = window.ALHAH_SHOP_CONFIG?.API_BASE || '';

  async function api(path, options) {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  // Separate from api() above — this sends multipart/form-data, so it must
  // NOT set a Content-Type header itself (the browser sets the correct
  // boundary automatically when the body is a FormData object).
  async function uploadImageFile(file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/api/admin/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed.');
    return data;
  }

  const AlhahAdmin = {
    login: (username, password) => api('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    logout: () => api('/api/admin/auth/logout', { method: 'POST' }),
    me: () => api('/api/admin/auth/me'),
    updateMe: (data) => api('/api/admin/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
    listProducts: () => api('/api/admin/products'),
    createProduct: (data) => api('/api/admin/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id, data) => api(`/api/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteProduct: (id) => api(`/api/admin/products/${id}`, { method: 'DELETE' }),
    listOrders: () => api('/api/admin/orders'),
    updateOrderStatus: (id, status) => api(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    listAdmins: () => api('/api/admin/admins'),
    createAdmin: (data) => api('/api/admin/admins', { method: 'POST', body: JSON.stringify(data) }),
    uploadImage: uploadImageFile,
  };

  function formatPrice(cents, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format((cents || 0) / 100);
  }
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!msg) { el.classList.remove('show'); el.textContent = ''; return; }
    el.textContent = msg;
    el.classList.add('show');
  }

  // ── Login page ──────────────────────────────────────────────────
  function initLoginPage() {
    const form = document.getElementById('adminLoginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('adminLoginError', null);
      const btn = document.getElementById('adminLoginBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in…';
      try {
        await AlhahAdmin.login(
          document.getElementById('adminUsername').value.trim(),
          document.getElementById('adminPassword').value
        );
        window.location.href = 'admin-dashboard.html';
      } catch (err) {
        showError('adminLoginError', err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-lock"></i> Log In';
      }
    });
  }

  // ── Dashboard page ──────────────────────────────────────────────
  const STATUS_OPTIONS = ['PENDING', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED'];
  let allProducts = [];

  let currentAdmin = null;

  function initDashboard() {
    const tabs = document.getElementById('panel-products');
    if (!tabs) return;

    AlhahAdmin.me()
      .then(({ admin }) => {
        currentAdmin = admin;
        document.getElementById('adminWho').textContent = `${admin.name} (@${admin.username})`;
        loadProducts();
        loadOrders();
        loadAdmins();
      })
      .catch(() => { window.location.href = 'admin-login.html'; });

    document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
      await AlhahAdmin.logout();
      window.location.href = 'admin-login.html';
    });

    document.querySelectorAll('.admin-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`panel-${tab.dataset.panel}`).classList.add('active');
      });
    });

    initProductModal();
    initAdminModal();
    initSettingsModal();
  }

  // ── Products ────────────────────────────────────────────────────
  async function loadProducts() {
    allProducts = await AlhahAdmin.listProducts();
    const body = document.getElementById('productsTableBody');
    body.innerHTML = allProducts.map((p) => `
      <tr>
        <td>${p.name}</td>
        <td>${p.sku}</td>
        <td>${p.category}</td>
        <td>${formatPrice(p.priceCents, p.currency)}</td>
        <td>${p.stock}</td>
        <td>${p.moq}</td>
        <td><span class="admin-badge ${p.active ? 'active' : 'inactive'}">${p.active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="admin-btn admin-btn-ghost admin-btn-sm" data-edit="${p.id}">Edit</button>
          ${p.active ? `<button class="admin-btn admin-btn-danger admin-btn-sm" data-deactivate="${p.id}">Deactivate</button>` : ''}
        </td>
      </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:#888;">No products yet.</td></tr>`;

    body.querySelectorAll('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => openProductModal(allProducts.find((p) => p.id === btn.dataset.edit))));
    body.querySelectorAll('[data-deactivate]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm('Deactivate this product? It will be hidden from the shop but past orders keep working.')) return;
        await AlhahAdmin.deleteProduct(btn.dataset.deactivate);
        loadProducts();
      }));
  }

  function openProductModal(product) {
    showError('productModalError', null);
    const form = document.getElementById('productForm');
    form.reset();
    document.getElementById('productModalTitle').textContent = product ? 'Edit Product' : 'Add Product';
    document.getElementById('pfId').value = product?.id || '';
    document.getElementById('pfName').value = product?.name || '';
    document.getElementById('pfSku').value = product?.sku || '';
    document.getElementById('pfCategory').value = product?.category || 'Dental Surgery';
    document.getElementById('pfDescription').value = product?.description || '';
    document.getElementById('pfPrice').value = product ? (product.priceCents / 100).toFixed(2) : '';
    document.getElementById('pfStock').value = product?.stock ?? '';
    document.getElementById('pfMoq').value = product?.moq ?? 1;
    document.getElementById('pfImageFile').value = '';
    document.getElementById('pfImageUrl').value = product?.images?.[0] || '';
    document.getElementById('pfImageStatus').textContent = '';
    const preview = document.getElementById('pfImagePreview');
    const previewWrap = document.getElementById('pfImagePreviewWrap');
    if (product?.images?.[0]) {
      preview.src = product.images[0];
      previewWrap.style.display = '';
    } else {
      previewWrap.style.display = 'none';
    }
    document.getElementById('pfActive').checked = product ? product.active : true;
    // SKU can't change once set (used as the stable product identifier).
    document.getElementById('pfSku').disabled = !!product;
    document.getElementById('productModalOverlay').classList.add('show');
  }

  function initProductModal() {
    document.getElementById('newProductBtn').addEventListener('click', () => openProductModal(null));
    document.getElementById('productModalCancel').addEventListener('click', () =>
      document.getElementById('productModalOverlay').classList.remove('show'));

    // Upload immediately on file selection (not on form submit) so the
    // admin sees the result and gets a clear error before saving the rest
    // of the form.
    document.getElementById('pfImageFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const status = document.getElementById('pfImageStatus');
      status.textContent = 'Uploading…';
      try {
        const { url } = await AlhahAdmin.uploadImage(file);
        document.getElementById('pfImageUrl').value = url;
        document.getElementById('pfImagePreview').src = url;
        document.getElementById('pfImagePreviewWrap').style.display = '';
        status.textContent = 'Uploaded.';
      } catch (err) {
        status.textContent = '';
        showError('productModalError', err.message);
        e.target.value = '';
      }
    });

    document.getElementById('productForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('productModalError', null);
      const id = document.getElementById('pfId').value;
      const imageUrl = document.getElementById('pfImageUrl').value.trim();
      const payload = {
        name: document.getElementById('pfName').value.trim(),
        category: document.getElementById('pfCategory').value.trim(),
        description: document.getElementById('pfDescription').value.trim(),
        priceCents: Math.round(parseFloat(document.getElementById('pfPrice').value) * 100),
        stock: parseInt(document.getElementById('pfStock').value, 10),
        moq: parseInt(document.getElementById('pfMoq').value, 10),
        images: imageUrl ? [imageUrl] : [],
        active: document.getElementById('pfActive').checked,
      };
      if (!id) payload.sku = document.getElementById('pfSku').value.trim();

      const btn = document.getElementById('productModalSave');
      btn.disabled = true;
      try {
        if (id) await AlhahAdmin.updateProduct(id, payload);
        else await AlhahAdmin.createProduct(payload);
        document.getElementById('productModalOverlay').classList.remove('show');
        loadProducts();
      } catch (err) {
        showError('productModalError', err.message);
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ── Orders ──────────────────────────────────────────────────────
  function orderWho(o) {
    if (o.user) return `${o.user.username} <small style="color:#888;">(account)</small>`;
    if (o.guestCode) return `Guest #${o.guestCode.slice(0, 6)}`;
    return `<small style="color:#888;">Guest</small>`;
  }

  async function loadOrders() {
    const orders = await AlhahAdmin.listOrders();
    const body = document.getElementById('ordersTableBody');
    body.innerHTML = orders.map((o) => `
      <tr>
        <td><strong>${o.orderNumber}</strong></td>
        <td>${formatDate(o.createdAt)}</td>
        <td>${o.customerName}<br><small style="color:#888;">${o.customerEmail}</small><br>${orderWho(o)}</td>
        <td>${o.items.map((i) => `${i.nameSnapshot} × ${i.qty}`).join(', ')}</td>
        <td>${formatPrice(o.totalCents, o.currency)}</td>
        <td>
          <select class="admin-status-select" data-order="${o.id}">
            ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:#888;">No orders yet.</td></tr>`;

    body.querySelectorAll('[data-order]').forEach((sel) =>
      sel.addEventListener('change', async () => {
        sel.disabled = true;
        try {
          await AlhahAdmin.updateOrderStatus(sel.dataset.order, sel.value);
        } catch (err) {
          alert(`Could not update status: ${err.message}`);
        } finally {
          sel.disabled = false;
        }
      }));
  }

  // ── Admins ──────────────────────────────────────────────────────
  async function loadAdmins() {
    const admins = await AlhahAdmin.listAdmins();
    document.getElementById('adminsTableBody').innerHTML = admins.map((a) => `
      <tr><td>${a.name}</td><td>@${a.username}</td><td>${a.email}</td><td>${formatDate(a.createdAt)}</td></tr>
    `).join('');
  }

  function initAdminModal() {
    document.getElementById('newAdminBtn').addEventListener('click', () => {
      showError('adminModalError', null);
      document.getElementById('adminForm').reset();
      document.getElementById('adminModalOverlay').classList.add('show');
    });
    document.getElementById('adminModalCancel').addEventListener('click', () =>
      document.getElementById('adminModalOverlay').classList.remove('show'));

    document.getElementById('adminForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('adminModalError', null);
      const btn = document.getElementById('adminModalSave');
      btn.disabled = true;
      try {
        await AlhahAdmin.createAdmin({
          name: document.getElementById('afName').value.trim(),
          username: document.getElementById('afUsername').value.trim(),
          email: document.getElementById('afEmail').value.trim(),
          password: document.getElementById('afPassword').value,
        });
        document.getElementById('adminModalOverlay').classList.remove('show');
        loadAdmins();
      } catch (err) {
        showError('adminModalError', err.message);
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ── Settings (change my own username/email/password) ────────────
  function initSettingsModal() {
    const openBtn = document.getElementById('adminSettingsBtn');
    if (!openBtn) return;

    openBtn.addEventListener('click', () => {
      showError('settingsModalError', null);
      document.getElementById('settingsForm').reset();
      document.getElementById('sfUsername').value = currentAdmin?.username || '';
      document.getElementById('sfEmail').value = currentAdmin?.email || '';
      document.getElementById('settingsModalOverlay').classList.add('show');
    });
    document.getElementById('settingsModalCancel').addEventListener('click', () =>
      document.getElementById('settingsModalOverlay').classList.remove('show'));

    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('settingsModalError', null);
      const btn = document.getElementById('settingsModalSave');
      btn.disabled = true;
      try {
        const newPassword = document.getElementById('sfNewPassword').value;
        const { admin } = await AlhahAdmin.updateMe({
          currentPassword: document.getElementById('sfCurrentPassword').value,
          username: document.getElementById('sfUsername').value.trim(),
          email: document.getElementById('sfEmail').value.trim(),
          ...(newPassword ? { newPassword } : {}),
        });
        currentAdmin = admin;
        document.getElementById('adminWho').textContent = `${admin.name} (@${admin.username})`;
        document.getElementById('settingsModalOverlay').classList.remove('show');
      } catch (err) {
        showError('settingsModalError', err.message);
      } finally {
        btn.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
    initDashboard();
  });
})();
