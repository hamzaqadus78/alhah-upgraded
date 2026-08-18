/**
 * contact.html form submission -> POST /api/contact (server/src/routes/contact.routes.js).
 */
(function () {
  'use strict';

  const API_BASE = window.ALHAH_SHOP_CONFIG?.API_BASE || '';

  function setStatus(msg, type) {
    const el = document.getElementById('contactFormStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = type === 'error' ? 'mb-3 alert alert-danger' : 'mb-3 alert alert-success';
    el.style.display = msg ? 'block' : 'none';
  }

  async function submitContact(e) {
    e.preventDefault();
    const btn = document.getElementById('contactSubmitBtn');
    const form = document.getElementById('contactForm');
    setStatus('', null);
    btn.disabled = true;
    btn.textContent = 'Sending…';

    const payload = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('mail').value.trim(),
      phone: document.getElementById('mobile').value.trim(),
      subject: document.getElementById('subject').value.trim(),
      message: document.getElementById('message').value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send your message.');

      setStatus('Thank you! Your message has been sent — we will reply within 24 hours.', 'success');
      form.reset();
    } catch (err) {
      setStatus(err.message || 'Something went wrong. Please try again or WhatsApp us directly.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit Now';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('contactForm')?.addEventListener('submit', submitContact);
  });
})();
