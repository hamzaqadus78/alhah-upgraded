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
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating account…';

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
        pending.style.display = '';
      }
    } catch (err) {
      setError(err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('signupForm')?.addEventListener('submit', submitSignup);
  });
})();
