(function () {
  'use strict';

  function setError(msg, showResend) {
    const el = document.getElementById('loginError');
    const resend = document.getElementById('resendVerificationLink');
    if (!msg) { el.style.display = 'none'; el.textContent = ''; if (resend) resend.style.display = 'none'; return; }
    el.textContent = msg;
    el.style.display = 'block';
    if (resend) resend.style.display = showResend ? 'inline' : 'none';
  }

  async function resendVerification(e) {
    e.preventDefault();
    const status = document.getElementById('resendVerificationStatus');
    const username = document.getElementById('loginUsername').value.trim();
    if (!username || !status) return;
    status.style.display = 'block';
    status.textContent = 'Sending…';
    try {
      await AlhahAuth.resendVerification(username);
      status.textContent = 'A new confirmation link is on its way — check your inbox.';
    } catch {
      status.textContent = 'Something went wrong sending that — please try again in a moment.';
    }
  }

  async function submitLogin(e) {
    e.preventDefault();
    setError(null);

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Logging in…';

    try {
      await AlhahAuth.login(
        document.getElementById('loginUsername').value.trim(),
        document.getElementById('loginPassword').value
      );
      const redirectTo = new URLSearchParams(location.search).get('redirect') || 'account.html';
      window.location.href = redirectTo;
    } catch (err) {
      setError(err.message, /verify your email/i.test(err.message));
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i>Log In';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginForm')?.addEventListener('submit', submitLogin);
    document.getElementById('resendVerificationLink')?.addEventListener('click', resendVerification);
  });
})();
