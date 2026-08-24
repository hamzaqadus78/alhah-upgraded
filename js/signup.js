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
      await AlhahAuth.signup(
        document.getElementById('signupEmail').value.trim(),
        document.getElementById('signupPassword').value,
        document.getElementById('signupName').value.trim(),
        document.getElementById('signupPhone').value.trim()
      );
      window.location.href = 'account.html';
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
