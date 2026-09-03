/**
 * Adds a show/hide eye-icon toggle to every password field on the page,
 * automatically. Just include this script — no markup changes needed per
 * page/field.
 */
(function () {
  'use strict';

  function wrap(input) {
    if (input.dataset.pwToggled) return;
    input.dataset.pwToggled = '1';

    const wrapper = document.createElement('div');
    wrapper.className = 'pw-toggle-wrap';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle-btn';
    btn.setAttribute('aria-label', 'Show password');
    btn.innerHTML = '<i class="fas fa-eye"></i>';
    wrapper.appendChild(btn);

    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = showing ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[type="password"]').forEach(wrap);
  });
})();
