/**
 * ALHAH INDUSTRIES — Site appearance engine.
 *
 * Reads the admin-configured "Edit Website" settings and applies them live:
 * font, accent colors, light/dark mode, button shape/fill. Shop and admin
 * dashboard have completely independent settings (never synced) — scope is
 * detected from the URL, not the DOM, so this can run before <body> exists.
 *
 * Pairs with the tiny inline bootstrap snippet in each page's <head>, which
 * applies the last-known (cached) settings instantly to avoid a flash of
 * the wrong theme; this script then fetches the current settings and
 * re-applies if anything changed.
 */
(function () {
  'use strict';

  var SCOPE = location.pathname.indexOf('admin') !== -1 ? 'admin' : 'shop';
  var API_BASE = window.ALHAH_SHOP_CONFIG?.API_BASE || '';
  var CACHE_KEY = 'alhah_theme_' + SCOPE;
  var OVERRIDE_KEY = 'alhah_theme_mode_override_' + SCOPE;

  var FONTS = {
    'dm-sans': { family: "'DM Sans'", href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap' },
    'inter': { family: "'Inter'", href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
    'poppins': { family: "'Poppins'", href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap' },
    'montserrat': { family: "'Montserrat'", href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap' },
    'ibm-plex-sans': { family: "'IBM Plex Sans'", href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
  };

  var RADII = { sharp: '4px', rounded: SCOPE === 'admin' ? '8px' : '12px', pill: '50px' };

  function hexToRgb(hex) {
    var m = (hex || '#000000').replace('#', '');
    return [parseInt(m.substr(0, 2), 16), parseInt(m.substr(2, 2), 16), parseInt(m.substr(4, 2), 16)];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) {
      v = Math.max(0, Math.min(255, Math.round(v)));
      var s = v.toString(16);
      return s.length === 1 ? '0' + s : s;
    }).join('');
  }
  function mix(hex, target, pct) {
    var a = hexToRgb(hex), b = hexToRgb(target);
    return rgbToHex(a[0] + (b[0] - a[0]) * pct, a[1] + (b[1] - a[1]) * pct, a[2] + (b[2] - a[2]) * pct);
  }
  function lighten(hex, pct) { return mix(hex, '#ffffff', pct); }
  function darken(hex, pct) { return mix(hex, '#000000', pct); }
  function hexToRgba(hex, alpha) { var c = hexToRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')'; }

  function ensureFontLink(fontKey) {
    var font = FONTS[fontKey] || FONTS['dm-sans'];
    if (document.querySelector('link[data-theme-font="' + fontKey + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = font.href;
    link.setAttribute('data-theme-font', fontKey);
    document.head.appendChild(link);
  }

  function getEffectiveMode(settings) {
    var override = null;
    try { override = localStorage.getItem(OVERRIDE_KEY); } catch (e) {}
    if (settings.allowToggle && (override === 'light' || override === 'dark')) return override;
    return settings.defaultMode === 'dark' ? 'dark' : 'light';
  }

  function apply(settings) {
    var root = document.documentElement;
    var font = FONTS[settings.fontKey] || FONTS['dm-sans'];
    ensureFontLink(settings.fontKey);
    root.style.setProperty('--theme-font', font.family);
    root.style.setProperty('--theme-btn-radius', RADII[settings.buttonShape] || RADII.rounded);
    root.setAttribute('data-btn-fill', settings.buttonFill || 'solid');
    root.setAttribute('data-theme', getEffectiveMode(settings));

    if (SCOPE === 'shop') {
      root.style.setProperty('--teal', settings.accentColor);
      root.style.setProperty('--teal-mid', darken(settings.accentColor, 0.08));
      root.style.setProperty('--teal-light', lighten(settings.accentColor, 0.18));
      root.style.setProperty('--emerald', settings.accentColor2);
      root.style.setProperty('--pale', lighten(settings.accentColor, 0.92));
      root.style.setProperty('--pale-lime', lighten(settings.accentColor2, 0.88));
      root.style.setProperty('--brand-accent', settings.accentColor2);
      root.style.setProperty('--brand-accent-light', lighten(settings.accentColor2, 0.25));
      root.style.setProperty('--bs-primary', settings.accentColor);
      root.style.setProperty('--bs-primary-rgb', hexToRgb(settings.accentColor).join(','));
      root.style.setProperty('--shop-teal', settings.accentColor);
      root.style.setProperty('--shop-emerald', settings.accentColor2);
    } else {
      root.style.setProperty('--admin-accent', settings.accentColor);
      root.style.setProperty('--admin-accent-hover', lighten(settings.accentColor, 0.2));
      root.style.setProperty('--admin-accent-soft', hexToRgba(settings.accentColor, 0.16));
    }
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeCache(settings) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(settings)); } catch (e) {}
  }

  function injectToggle(settings) {
    if (!settings.allowToggle) return;
    if (SCOPE === 'shop') {
      if (document.getElementById('themeToggleBtn')) return;
      var btn = document.createElement('button');
      btn.className = 'theme-toggle-btn';
      btn.id = 'themeToggleBtn';
      btn.setAttribute('aria-label', 'Toggle light/dark mode');
      btn.innerHTML = '<i class="fas fa-moon"></i>';
      document.body.appendChild(btn);
      updateToggleIcon(btn);
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(OVERRIDE_KEY, next); } catch (e) {}
        document.documentElement.setAttribute('data-theme', next);
        updateToggleIcon(btn);
      });
    } else {
      var container = document.getElementById('adminTopbarActions');
      if (!container || document.getElementById('adminThemeToggle')) return;
      var abtn = document.createElement('button');
      abtn.className = 'admin-theme-toggle';
      abtn.id = 'adminThemeToggle';
      abtn.setAttribute('aria-label', 'Toggle light/dark mode');
      abtn.innerHTML = '<i class="fas fa-moon"></i>';
      container.insertBefore(abtn, container.firstChild);
      updateToggleIcon(abtn);
      abtn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(OVERRIDE_KEY, next); } catch (e) {}
        document.documentElement.setAttribute('data-theme', next);
        updateToggleIcon(abtn);
      });
    }
  }
  function updateToggleIcon(btn) {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }

  // Apply cached settings immediately (belt-and-suspenders — the inline
  // bootstrap snippet in <head> already did this before CSS loaded; this
  // covers pages that skip that snippet or load out of order).
  var cached = readCache();
  if (cached) apply(cached);

  document.addEventListener('DOMContentLoaded', function () {
    if (cached) injectToggle(cached);

    fetch(API_BASE + '/api/settings/' + SCOPE)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (settings) {
        if (!settings) return;
        var changed = !cached || JSON.stringify(cached) !== JSON.stringify(settings);
        writeCache(settings);
        if (changed) apply(settings);
        injectToggle(settings);
      })
      .catch(function () { /* offline / API down — cached or default look stands */ });
  });

  // Lets the admin dashboard's own "Edit Website" form apply a just-saved
  // change immediately (writes the cache too, so a reload stays in sync).
  window.AlhahTheme = {
    apply: function (settings) { writeCache(settings); apply(settings); },
    scope: SCOPE,
  };
})();
