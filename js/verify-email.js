/**
 * verify-email.html logic: reads ?token= and confirms it automatically on
 * load. Low-risk to auto-fire (unlike checkout-confirm.js) — an email
 * client prefetching this link just verifies a moment early, with no
 * real-world consequence like a stock-decrementing order.
 */
(function () {
  'use strict';

  const API_BASE = window.ALHAH_SHOP_CONFIG?.API_BASE || '';
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  function show(icon, color, title, message, showAction) {
    document.getElementById('verifyIcon').className = `fas ${icon}`;
    document.getElementById('verifyIcon').style.color = color;
    document.getElementById('verifyTitle').textContent = title;
    document.getElementById('verifyMessage').textContent = message;
    document.getElementById('verifyAction').style.display = showAction ? '' : 'none';
  }

  async function verify() {
    if (!token) {
      show('fa-times-circle', '#dc2626', 'Invalid Link', 'No verification token was provided.', false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not verify your email.');

      show('fa-check-circle', '#16a34a', 'Email Verified!', "You're all set — your account is now active.", true);
    } catch (err) {
      show('fa-times-circle', '#dc2626', 'Verification Failed', err.message || 'This link is invalid or has expired.', false);
    }
  }

  document.addEventListener('DOMContentLoaded', verify);
})();
