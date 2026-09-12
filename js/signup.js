(function () {
  'use strict';

  function setError(msg) {
    const el = document.getElementById('signupError');
    if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = msg;
    el.style.display = 'block';
  }

  async function submitSignup(e) {
    e.preventDefault();
    setError(null);

    const btn = document.getElementById('signupBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Creating account…';

    try {
      const { email } = await AlhahAuth.signup(
        document.getElementById('signupUsername').value.trim(),
        document.getElementById('signupEmail').value.trim(),
        document.getElementById('signupPassword').value,
        document.getElementById('signupName').value.trim(),
        document.getElementById('signupPhone').value.trim()
      );
      document.getElementById('signupForm').style.display = 'none';
      const pending = document.getElementById('signupPendingVerification');
      if (pending) {
        pending.querySelector('[data-email]').textContent = email;
        pending.dataset.email = email;
        pending.style.display = '';
      }
    } catch (err) {
      setError(err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-plus"></i>Create Account';
    }
  }

  async function resendVerification(e) {
    e.preventDefault();
    const pending = document.getElementById('signupPendingVerification');
    const status = document.getElementById('resendVerificationStatus');
    const email = pending?.dataset.email;
    if (!email) return;
    status.style.display = 'block';
    status.textContent = 'Sending…';
    try {
      await AlhahAuth.resendVerification(email);
      status.textContent = 'A new confirmation link is on its way — check your inbox.';
    } catch {
      status.textContent = 'Something went wrong sending that — please try again in a moment.';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('signupForm')?.addEventListener('submit', submitSignup);
    document.getElementById('resendVerificationLink')?.addEventListener('click', resendVerification);
  });
})();
