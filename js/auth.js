/**
 * ALHAH INDUSTRIES — Customer account (separate from js/admin.js's admin
 * session entirely — different cookie, different backend routes). Session
 * lives in an httpOnly cookie the browser sends automatically; this module
 * never touches the token itself.
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

  const AlhahAuth = {
    signup: (username, email, password, name, phone) =>
      api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ username, email, password, name, phone }) }),
    login: (username, password) =>
      api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    logout: () => api('/api/auth/logout', { method: 'POST' }),
    me: () => api('/api/auth/me'),
    updateMe: (data) => api('/api/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
    myOrders: () => api('/api/auth/orders'),
  };

  window.AlhahAuth = AlhahAuth;

  // Swap the nav's "Login" link for the account state, on every page that
  // includes this script and has #authNavLink in its markup.
  async function renderNavAuthState() {
    const link = document.getElementById('authNavLink');
    if (!link) return;
    try {
      const { user } = await AlhahAuth.me();
      link.textContent = user.name.split(' ')[0];
      link.href = 'account.html';
    } catch {
      link.textContent = 'Login';
      link.href = 'login.html';
    }
  }

  document.addEventListener('DOMContentLoaded', renderNavAuthState);
})();
