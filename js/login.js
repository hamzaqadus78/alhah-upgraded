(function () {
  'use strict';

  function setError(msg) {
    const el = document.getElementById('loginError');
    if (!msg) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = msg;
    el.style.display = 'block';
  }

  async function submitLogin(e) {
    e.preventDefault();
    setError(null);

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Logging in…';

    try {
      await AlhahAuth.login(
        document.getElementById('loginUsername').value.trim(),
        document.getElementById('loginPassword').value
      );
      const redirectTo = new URLSearchParams(location.search).get('redirect') || 'account.html';
      window.location.href = redirectTo;
    } catch (err) {
      setError(err.message);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Log In';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginForm')?.addEventListener('submit', submitLogin);
  });
})();
