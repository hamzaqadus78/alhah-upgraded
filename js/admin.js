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
    deleteProductPermanently: (id) => api(`/api/admin/products/${id}/permanent`, { method: 'DELETE' }),
    listOrders: () => api('/api/admin/orders'),
    updateOrderStatus: (id, status) => api(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    deleteOrder: (id) => api(`/api/admin/orders/${id}`, { method: 'DELETE' }),
    listAdmins: () => api('/api/admin/admins'),
    createAdmin: (data) => api('/api/admin/admins', { method: 'POST', body: JSON.stringify(data) }),
    listUsers: () => api('/api/admin/users'),
    setUserActive: (id, active) => api(`/api/admin/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
    resetUserPassword: (id, newPassword) => api(`/api/admin/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ newPassword }) }),
    deleteUser: (id) => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
    getSiteSettings: (scope) => api(`/api/settings/${scope}`),
    updateSiteSettings: (scope, data) => api(`/api/admin/settings/${scope}`, { method: 'PATCH', body: JSON.stringify(data) }),
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
        loadUsers();
        loadAdmins();
        loadWebsiteSettings();
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
    initResetPwModal();
    initWebsiteSettings();
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
          <button class="admin-btn admin-btn-danger admin-btn-sm" data-delete-permanent="${p.id}" data-name="${p.name}">Delete</button>
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
    body.querySelectorAll('[data-delete-permanent]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm(`Permanently delete "${btn.dataset.name}"? This cannot be undone. Past orders will still show what was sold, but this product will be gone from the catalog for good.`)) return;
        try {
          await AlhahAdmin.deleteProductPermanently(btn.dataset.deletePermanent);
          loadProducts();
        } catch (err) {
          alert(err.message);
        }
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
        <td><button class="admin-btn admin-btn-danger admin-btn-sm" data-delete-order="${o.id}" data-order-number="${o.orderNumber}">Delete</button></td>
      </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:#888;">No orders yet.</td></tr>`;

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
    body.querySelectorAll('[data-delete-order]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!confirm(`Permanently delete order ${btn.dataset.orderNumber}? This cannot be undone.`)) return;
        try {
          await AlhahAdmin.deleteOrder(btn.dataset.deleteOrder);
          loadOrders();
        } catch (err) {
          alert(err.message);
        }
      }));
  }

  // ── Users ───────────────────────────────────────────────────────
  async function loadUsers() {
    const users = await AlhahAdmin.listUsers();
    const body = document.getElementById('usersTableBody');
    body.innerHTML = users.map((u) => `
      <tr>
        <td>${u.name}</td>
        <td>@${u.username}</td>
        <td>${u.email}</td>
        <td>${u.phone || '<small style="color:#888;">—</small>'}</td>
        <td>${u.orderCount}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td><span class="admin-badge ${u.active ? 'active' : 'inactive'}">${u.active ? 'Active' : 'Deactivated'}</span></td>
        <td>
          <button class="admin-btn admin-btn-ghost admin-btn-sm" data-reset-pw="${u.id}" data-name="${u.name}">Reset Password</button>
          <button class="admin-btn ${u.active ? 'admin-btn-danger' : ''} admin-btn-sm" data-toggle-active="${u.id}" data-active="${u.active}">${u.active ? 'Deactivate' : 'Reactivate'}</button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" data-delete-user="${u.id}" data-username="${u.username}">Delete</button>
        </td>
      </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;color:#888;">No customer accounts yet.</td></tr>`;

    body.querySelectorAll('[data-toggle-active]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const isActive = btn.dataset.active === 'true';
        const verb = isActive ? 'deactivate' : 'reactivate';
        if (!confirm(`Are you sure you want to ${verb} this account?`)) return;
        try {
          await AlhahAdmin.setUserActive(btn.dataset.toggleActive, !isActive);
          loadUsers();
        } catch (err) {
          alert(`Could not update account: ${err.message}`);
        }
      }));

    body.querySelectorAll('[data-reset-pw]').forEach((btn) =>
      btn.addEventListener('click', () => {
        showError('resetPwModalError', null);
        document.getElementById('resetPwForm').reset();
        document.getElementById('rpUserId').value = btn.dataset.resetPw;
        document.getElementById('resetPwFor').textContent = `For: ${btn.dataset.name}`;
        document.getElementById('resetPwModalOverlay').classList.add('show');
      }));

    // Permanent and cannot be undone — require typing the username to
    // confirm, not just a plain OK/Cancel dialog (their orders are kept,
    // just unlinked from the account, but the account itself is gone).
    body.querySelectorAll('[data-delete-user]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const username = btn.dataset.username;
        const typed = prompt(`This permanently deletes the account "${username}". Their past orders are kept but unlinked. This cannot be undone.\n\nType the username to confirm:`);
        if (typed !== username) {
          if (typed !== null) alert('Username did not match — nothing was deleted.');
          return;
        }
        try {
          await AlhahAdmin.deleteUser(btn.dataset.deleteUser);
          loadUsers();
        } catch (err) {
          alert(`Could not delete account: ${err.message}`);
        }
      }));
  }

  function initResetPwModal() {
    document.getElementById('resetPwModalCancel').addEventListener('click', () =>
      document.getElementById('resetPwModalOverlay').classList.remove('show'));

    document.getElementById('resetPwForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('resetPwModalError', null);
      const btn = document.getElementById('resetPwModalSave');
      btn.disabled = true;
      try {
        await AlhahAdmin.resetUserPassword(
          document.getElementById('rpUserId').value,
          document.getElementById('rpNewPassword').value
        );
        document.getElementById('resetPwModalOverlay').classList.remove('show');
      } catch (err) {
        showError('resetPwModalError', err.message);
      } finally {
        btn.disabled = false;
      }
    });
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

  // ── Edit Website (shop + admin dashboard appearance) ─────────────
  const ACCENT_PRESETS = [
    { primary: '#006D77', secondary: '#00C49A' },
    { primary: '#6366f1', secondary: '#818cf8' },
    { primary: '#1e3a5f', secondary: '#38bdf8' },
    { primary: '#14532d', secondary: '#84cc16' },
    { primary: '#7f1d1d', secondary: '#fb7185' },
    { primary: '#334155', secondary: '#22d3ee' },
  ];
  const WS_DEFAULTS = {
    shop: { fontKey: 'dm-sans', accentColor: '#006D77', accentColor2: '#00C49A', defaultMode: 'light', allowToggle: true, buttonShape: 'rounded', buttonFill: 'solid' },
    admin: { fontKey: 'dm-sans', accentColor: '#6366f1', accentColor2: '#818cf8', defaultMode: 'dark', allowToggle: true, buttonShape: 'rounded', buttonFill: 'solid' },
  };
  const WS_FONT_FAMILIES = { 'dm-sans': "'DM Sans'", inter: "'Inter'", poppins: "'Poppins'", montserrat: "'Montserrat'", 'ibm-plex-sans': "'IBM Plex Sans'" };

  function samePreset(a, b) {
    return a.primary.toLowerCase() === b.primary.toLowerCase() && a.secondary.toLowerCase() === b.secondary.toLowerCase();
  }

  function renderSwatches(prefix, accentColor, accentColor2, onSelect) {
    const container = document.getElementById(`${prefix}Swatches`);
    if (!container) return;
    const current = { primary: accentColor, secondary: accentColor2 };
    const matched = ACCENT_PRESETS.find((p) => samePreset(p, current));
    container.innerHTML = ACCENT_PRESETS.map((p, i) => `
      <button type="button" class="ws-swatch${matched === p ? ' selected' : ''}" data-preset="${i}" title="${p.primary} / ${p.secondary}">
        <span style="background:${p.primary};"></span><span style="background:${p.secondary};"></span>
      </button>`).join('') +
      `<button type="button" class="ws-swatch ws-swatch-custom${!matched ? ' selected' : ''}" data-preset="custom">Custom</button>`;

    container.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.ws-swatch').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        onSelect(btn.dataset.preset === 'custom' ? null : ACCENT_PRESETS[Number(btn.dataset.preset)]);
      });
    });
  }

  function updateWsPreview(prefix) {
    const preview = document.getElementById(`${prefix}Preview`);
    if (!preview) return;
    const accent1 = document.getElementById(`${prefix}Accent1`).value;
    const accent2 = document.getElementById(`${prefix}Accent2`).value;
    const shape = document.getElementById(`${prefix}ButtonShape`).value;
    const fill = document.getElementById(`${prefix}ButtonFill`).value;
    const font = document.getElementById(`${prefix}Font`).value;
    const radius = shape === 'sharp' ? '4px' : shape === 'pill' ? '50px' : '10px';
    const fontFamily = `${WS_FONT_FAMILIES[font] || "'DM Sans'"}, sans-serif`;
    const btn = preview.querySelector('.ws-preview-btn');
    const heading = preview.querySelector('.ws-preview-heading');
    heading.style.fontFamily = fontFamily;
    btn.style.fontFamily = fontFamily;
    btn.style.borderRadius = radius;
    btn.style.border = `2px solid ${accent1}`;
    if (fill === 'outline') {
      btn.style.background = 'transparent';
      btn.style.color = accent1;
    } else if (fill === 'gradient') {
      btn.style.background = `linear-gradient(135deg, ${accent1}, ${accent2})`;
      btn.style.borderColor = 'transparent';
      btn.style.color = '#fff';
    } else {
      btn.style.background = accent1;
      btn.style.color = '#fff';
    }
  }

  function populateWsForm(prefix, settings) {
    document.getElementById(`${prefix}Font`).value = settings.fontKey;
    document.getElementById(`${prefix}ButtonShape`).value = settings.buttonShape;
    document.getElementById(`${prefix}ButtonFill`).value = settings.buttonFill;
    document.getElementById(`${prefix}DefaultMode`).value = settings.defaultMode;
    document.getElementById(`${prefix}AllowToggle`).checked = settings.allowToggle;
    document.getElementById(`${prefix}Accent1`).value = settings.accentColor;
    document.getElementById(`${prefix}Accent2`).value = settings.accentColor2;

    const matched = ACCENT_PRESETS.find((p) => samePreset(p, { primary: settings.accentColor, secondary: settings.accentColor2 }));
    document.getElementById(`${prefix}CustomColors`).style.display = matched ? 'none' : 'flex';

    renderSwatches(prefix, settings.accentColor, settings.accentColor2, (preset) => {
      if (preset) {
        document.getElementById(`${prefix}Accent1`).value = preset.primary;
        document.getElementById(`${prefix}Accent2`).value = preset.secondary;
        document.getElementById(`${prefix}CustomColors`).style.display = 'none';
      } else {
        document.getElementById(`${prefix}CustomColors`).style.display = 'flex';
      }
      updateWsPreview(prefix);
    });

    updateWsPreview(prefix);
  }

  function setupAppearanceForm(scope, prefix) {
    const form = document.getElementById(`${prefix}Form`);
    if (!form) return;

    ['Font', 'ButtonShape', 'ButtonFill', 'DefaultMode'].forEach((field) => {
      document.getElementById(`${prefix}${field}`).addEventListener('change', () => updateWsPreview(prefix));
    });
    document.getElementById(`${prefix}Accent1`).addEventListener('input', () => updateWsPreview(prefix));
    document.getElementById(`${prefix}Accent2`).addEventListener('input', () => updateWsPreview(prefix));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError(`${prefix}Error`, null);
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const updated = await AlhahAdmin.updateSiteSettings(scope, {
          fontKey: document.getElementById(`${prefix}Font`).value,
          accentColor: document.getElementById(`${prefix}Accent1`).value,
          accentColor2: document.getElementById(`${prefix}Accent2`).value,
          defaultMode: document.getElementById(`${prefix}DefaultMode`).value,
          allowToggle: document.getElementById(`${prefix}AllowToggle`).checked,
          buttonShape: document.getElementById(`${prefix}ButtonShape`).value,
          buttonFill: document.getElementById(`${prefix}ButtonFill`).value,
        });
        populateWsForm(prefix, updated);
        if (scope === 'admin' && window.AlhahTheme) window.AlhahTheme.apply(updated);
      } catch (err) {
        showError(`${prefix}Error`, err.message);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById(`${prefix}Reset`).addEventListener('click', async () => {
      if (!confirm('Reset this appearance to the default look? This cannot be undone.')) return;
      showError(`${prefix}Error`, null);
      try {
        const updated = await AlhahAdmin.updateSiteSettings(scope, WS_DEFAULTS[scope]);
        populateWsForm(prefix, updated);
        if (scope === 'admin' && window.AlhahTheme) window.AlhahTheme.apply(updated);
      } catch (err) {
        showError(`${prefix}Error`, err.message);
      }
    });
  }

  async function loadWebsiteSettings() {
    if (!document.getElementById('panel-website')) return;
    try {
      const [shop, adminAppearance] = await Promise.all([
        AlhahAdmin.getSiteSettings('shop'),
        AlhahAdmin.getSiteSettings('admin'),
      ]);
      populateWsForm('wsShop', shop);
      populateWsForm('wsAdmin', adminAppearance);
    } catch (err) {
      showError('wsShopError', 'Could not load appearance settings.');
    }
  }

  function initWebsiteSettings() {
    if (!document.getElementById('panel-website')) return;
    setupAppearanceForm('shop', 'wsShop');
    setupAppearanceForm('admin', 'wsAdmin');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLoginPage();
    initDashboard();
  });
})();
