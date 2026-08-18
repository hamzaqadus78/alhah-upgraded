/**
 * ALHAH INDUSTRIES — Site-Wide Search
 * Indexes all products across all category pages + homepage
 * Pure vanilla JS, no backend needed
 */
(function () {
  'use strict';

  /* ── PRODUCT INDEX ──────────────────────────────────────────
     Add every product here. Matches against name + tags + category.
     url = the page the product lives on + anchor if needed.
  ─────────────────────────────────────────────────────────── */
  const PRODUCTS = [
    // Dental Surgery
    { name: 'Dental Extraction Forceps Set',    category: 'Dental Surgery',     tags: 'forceps extraction tooth removal oral', url: 'DentalSurgery.html' },
    { name: 'Periodontal Probe & Explorer',     category: 'Dental Surgery',     tags: 'probe explorer periodontal pocket depth', url: 'DentalSurgery.html' },
    { name: 'Luxating Elevator Set',            category: 'Dental Surgery',     tags: 'elevator luxating extraction minimal invasive', url: 'DentalSurgery.html' },
    { name: 'Sickle Scaler & Curette Set',      category: 'Dental Surgery',     tags: 'scaler curette calculus cleaning scaling', url: 'DentalSurgery.html' },
    { name: 'Mouth Mirror & Tweezers Set',      category: 'Dental Surgery',     tags: 'mirror tweezers examination dental', url: 'DentalSurgery.html' },
    { name: 'Dental Needle Holder (Mathieu)',   category: 'Dental Surgery',     tags: 'needle holder suture mathieu oral surgery', url: 'DentalSurgery.html' },
    // Plastic Surgery
    { name: 'Metzenbaum Dissecting Scissors',   category: 'Plastic Surgery',    tags: 'scissors dissecting tissue plastic reconstructive', url: 'Spinal.html' },
    { name: 'Skin Hook & Retractor Set',        category: 'Plastic Surgery',    tags: 'skin hook retractor cosmetic reconstructive', url: 'Spinal.html' },
    { name: 'Adson Tissue Forceps',             category: 'Plastic Surgery',    tags: 'adson forceps tissue holding delicate', url: 'Spinal.html' },
    { name: 'Mayo Dissecting Scissors',         category: 'Plastic Surgery',    tags: 'mayo scissors dissecting heavy duty', url: 'Spinal.html' },
    { name: 'Plastic Surgery Needle Holder',    category: 'Plastic Surgery',    tags: 'needle holder suture plastic surgery', url: 'Spinal.html' },
    // Ophthalmic Surgery
    { name: 'Micro Forceps & Needle Holder Set', category: 'Ophthalmic Surgery', tags: 'micro forceps needle holder ophthalmic eye surgery', url: 'Neuro.html' },
    { name: 'Iris Scissors Straight',           category: 'Ophthalmic Surgery', tags: 'iris scissors straight fine eye surgery', url: 'Neuro.html' },
    { name: 'Castroviejo Needle Holder',        category: 'Ophthalmic Surgery', tags: 'castroviejo needle holder eye micro surgery', url: 'Neuro.html' },
    { name: 'Eye Speculum (Wire)',               category: 'Ophthalmic Surgery', tags: 'speculum wire eye retractor surgery', url: 'Neuro.html' },
    { name: 'Corneal Scissors',                 category: 'Ophthalmic Surgery', tags: 'corneal scissors fine precision eye', url: 'Neuro.html' },
    { name: 'Chalazion Clamp',                  category: 'Ophthalmic Surgery', tags: 'chalazion clamp eyelid cyst removal', url: 'Neuro.html' },
  ];

  /* ── PAGES INDEX ──────────────────────────────────────────── */
  const PAGES = [
    { name: 'Home',                  url: 'index.html',         desc: 'Featured instruments, categories & enquiry cart' },
    { name: 'About Us',              url: 'about.html',         desc: 'Our story, heritage and manufacturing background' },
    { name: 'Contact',               url: 'contact.html',       desc: 'Get in touch, send enquiry or find our office' },
    { name: 'Dental Surgery',        url: 'DentalSurgery.html', desc: 'Full range of dental and oral surgery instruments' },
    { name: 'Plastic Surgery',       url: 'Spinal.html',        desc: 'Instruments for plastic and reconstructive surgery' },
    { name: 'Ophthalmic Surgery',    url: 'Neuro.html',         desc: 'Ultra-fine ophthalmic and eye surgery instruments' },
    { name: 'Terms & Conditions',    url: 'Terms&Conditions.html', desc: 'Our terms of service and conditions' },
  ];

  /* ── SEARCH LOGIC ─────────────────────────────────────────── */
  function search(query) {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();

    const productHits = PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.toLowerCase().includes(q)
    ).map(p => ({ ...p, type: 'product' }));

    const pageHits = PAGES.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q)
    ).map(p => ({ ...p, type: 'page' }));

    // Products first, then pages, max 8 results
    return [...productHits, ...pageHits].slice(0, 8);
  }

  /* ── BUILD SEARCH UI ──────────────────────────────────────── */
  function buildSearchUI() {
    // Overlay + panel
    const overlay = document.createElement('div');
    overlay.id = 'searchOverlay';
    overlay.innerHTML = `
      <div id="searchPanel">
        <div id="searchHeader">
          <div id="searchInputWrap">
            <i class="fas fa-search" id="searchIcon"></i>
            <input type="text" id="siteSearchBar" placeholder="Search instruments, categories…" autocomplete="off" spellcheck="false">
            <button id="searchClearBtn" title="Clear">×</button>
          </div>
          <button id="searchCloseBtn">Close <kbd>Esc</kbd></button>
        </div>
        <div id="searchResults"></div>
        <div id="searchFooter">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const input    = document.getElementById('siteSearchBar');
    const results  = document.getElementById('searchResults');
    const clearBtn = document.getElementById('searchClearBtn');
    const closeBtn = document.getElementById('searchCloseBtn');

    let activeIdx = -1;

    /* render results */
    function render(query) {
      activeIdx = -1;
      clearBtn.style.display = query ? 'flex' : 'none';

      if (!query || query.length < 2) {
        results.innerHTML = `
          <div class="search-empty">
            <i class="fas fa-search"></i>
            <p>Type to search instruments, categories or pages</p>
          </div>`;
        return;
      }

      const hits = search(query);

      if (!hits.length) {
        results.innerHTML = `
          <div class="search-no-results">
            <i class="fas fa-inbox"></i>
            <p>No results for "<strong>${escHtml(query)}</strong>"</p>
            <small>Try: forceps, scissors, dental, ophthalmic…</small>
          </div>`;
        return;
      }

      // Group by type
      const products = hits.filter(h => h.type === 'product');
      const pages    = hits.filter(h => h.type === 'page');
      let html = '';

      if (products.length) {
        html += `<div class="search-group-label"><i class="fas fa-box me-2"></i>Instruments</div>`;
        products.forEach((p, i) => {
          const hi = highlight(p.name, query);
          html += `
            <a class="search-result-item" href="${p.url}" data-idx="${i}">
              <div class="result-icon"><i class="fas fa-scalpel"></i></div>
              <div class="result-text">
                <div class="result-name">${hi}</div>
                <div class="result-cat">${p.category}</div>
              </div>
              <i class="fas fa-arrow-right result-arrow"></i>
            </a>`;
        });
      }
      if (pages.length) {
        html += `<div class="search-group-label" style="margin-top:8px"><i class="fas fa-file-alt me-2"></i>Pages</div>`;
        pages.forEach((p, i) => {
          const hi = highlight(p.name, query);
          html += `
            <a class="search-result-item" href="${p.url}" data-idx="${products.length + i}">
              <div class="result-icon page-icon"><i class="fas fa-link"></i></div>
              <div class="result-text">
                <div class="result-name">${hi}</div>
                <div class="result-cat">${p.desc}</div>
              </div>
              <i class="fas fa-arrow-right result-arrow"></i>
            </a>`;
        });
      }

      results.innerHTML = html;
    }

    /* keyboard navigation */
    input.addEventListener('keydown', e => {
      const items = results.querySelectorAll('.search-result-item');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, items.length - 1);
        setActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        setActive(items);
      } else if (e.key === 'Enter' && activeIdx >= 0) {
        e.preventDefault();
        items[activeIdx].click();
      }
    });

    function setActive(items) {
      items.forEach((el, i) => el.classList.toggle('active', i === activeIdx));
      if (items[activeIdx]) items[activeIdx].scrollIntoView({ block: 'nearest' });
    }

    /* input handler with debounce */
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => render(input.value), 120);
    });

    clearBtn.addEventListener('click', () => { input.value = ''; render(''); input.focus(); });
    closeBtn.addEventListener('click', closeSearch);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });

    render(''); // initial state
  }

  /* ── OPEN / CLOSE ─────────────────────────────────────────── */
  function openSearch() {
    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('siteSearchBar')?.focus(), 80);
  }
  function closeSearch() {
    document.getElementById('searchOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── HELPERS ──────────────────────────────────────────────── */
  function highlight(text, query) {
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${esc})`, 'gi'), '<mark>$1</mark>');
  }
  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ── INJECT STYLES ────────────────────────────────────────── */
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Search trigger button in navbar */
      .btn-search-nav {
        display: inline-flex; align-items: center; gap: 8px;
        background: transparent;
        color: #555;
        border: 1.5px solid #e0e0e0;
        padding: 8px 16px;
        border-radius: 50px;
        font-size: .8rem; font-weight: 600;
        letter-spacing: .4px;
        cursor: pointer;
        transition: all .2s ease;
        margin-right: 10px;
        white-space: nowrap;
      }
      .btn-search-nav:hover {
        border-color: var(--teal, #006D77);
        color: var(--teal, #006D77);
        background: rgba(0,109,119,.05);
      }
      .btn-search-nav kbd {
        background: #f0f0f0; border: 1px solid #ddd;
        border-radius: 4px; padding: 1px 5px;
        font-size: .68rem; color: #888;
        font-family: inherit; margin-left: 2px;
      }
      @media (max-width: 991px) { .btn-search-nav kbd { display: none; } }

      /* Overlay */
      #searchOverlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.55);
        z-index: 99997;
        display: flex; align-items: flex-start; justify-content: center;
        padding-top: 80px;
        opacity: 0; visibility: hidden;
        transition: opacity .25s ease, visibility .25s ease;
        backdrop-filter: blur(4px);
      }
      #searchOverlay.open { opacity: 1; visibility: visible; }

      /* Panel */
      #searchPanel {
        background: #fff;
        border-radius: 20px;
        width: 100%; max-width: 600px;
        box-shadow: 0 24px 60px rgba(0,0,0,.22);
        overflow: hidden;
        transform: translateY(-16px) scale(.98);
        transition: transform .25s cubic-bezier(.4,0,.2,1);
        margin: 0 16px;
        max-height: calc(100vh - 120px);
        display: flex; flex-direction: column;
      }
      #searchOverlay.open #searchPanel { transform: translateY(0) scale(1); }

      /* Header */
      #searchHeader {
        display: flex; align-items: center; gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid #f0f0f0;
      }
      #searchInputWrap {
        flex: 1; position: relative; display: flex; align-items: center;
      }
      #searchIcon {
        position: absolute; left: 14px;
        color: var(--teal, #006D77); font-size: .95rem;
      }
      #siteSearchBar {
        width: 100%; padding: 11px 40px 11px 40px;
        border: 2px solid #e8e8e8;
        border-radius: 50px;
        font-size: .95rem; color: #1a1a2e;
        background: #f8f9fa;
        transition: border-color .2s, box-shadow .2s;
        outline: none;
        font-family: inherit;
      }
      #siteSearchBar:focus {
        border-color: var(--teal, #006D77);
        background: #fff;
        box-shadow: 0 0 0 3px rgba(0,109,119,.12);
      }
      #searchClearBtn {
        position: absolute; right: 12px;
        background: #e8e8e8; border: none;
        border-radius: 50%;
        width: 22px; height: 22px;
        font-size: 1rem; line-height: 1;
        cursor: pointer; color: #666;
        display: none; align-items: center; justify-content: center;
        transition: .15s;
      }
      #searchClearBtn:hover { background: #d0d0d0; }
      #searchCloseBtn {
        background: #f0f0f0; border: none;
        border-radius: 10px; padding: 8px 14px;
        font-size: .78rem; font-weight: 700;
        color: #555; cursor: pointer;
        white-space: nowrap; transition: .15s;
        display: flex; align-items: center; gap: 6px;
        flex-shrink: 0;
      }
      #searchCloseBtn:hover { background: #e0e0e0; color: #333; }
      #searchCloseBtn kbd {
        background: #ddd; border-radius: 4px;
        padding: 1px 5px; font-size: .68rem; font-family: inherit;
      }

      /* Results area */
      #searchResults {
        overflow-y: auto; padding: 12px 16px;
        flex: 1; min-height: 180px;
      }

      /* Group label */
      .search-group-label {
        font-size: .7rem; font-weight: 800;
        letter-spacing: 1.2px; text-transform: uppercase;
        color: #999; padding: 4px 8px 8px;
      }

      /* Result item */
      .search-result-item {
        display: flex; align-items: center; gap: 14px;
        padding: 11px 12px;
        border-radius: 12px;
        border: 1px solid transparent;
        text-decoration: none; color: inherit;
        transition: background .15s, border-color .15s;
        cursor: pointer; margin-bottom: 4px;
        border-left: 3px solid transparent;
      }
      .search-result-item:hover,
      .search-result-item.active {
        background: #f0faf9;
        border-left-color: var(--teal, #006D77);
        border-color: rgba(0,109,119,.15);
      }
      .result-icon {
        width: 38px; height: 38px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--teal, #006D77), #0097A7);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: .9rem; flex-shrink: 0;
      }
      .result-icon.page-icon {
        background: linear-gradient(135deg, #475569, #64748b);
      }
      .result-text { flex: 1; min-width: 0; }
      .result-name {
        font-size: .88rem; font-weight: 700; color: #1a1a2e;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .result-name mark {
        background: rgba(0,196,154,.2);
        color: var(--teal, #006D77);
        border-radius: 3px; padding: 0 2px;
      }
      .result-cat {
        font-size: .74rem; color: var(--teal-light, #0097A7);
        margin-top: 2px; font-weight: 600;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .result-arrow {
        color: var(--emerald, #00C49A); font-size: .8rem; flex-shrink: 0;
        opacity: 0; transition: opacity .15s, transform .15s;
      }
      .search-result-item:hover .result-arrow,
      .search-result-item.active .result-arrow {
        opacity: 1; transform: translateX(3px);
      }

      /* Empty / no results states */
      .search-empty, .search-no-results {
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 40px 20px; text-align: center;
        color: #aaa;
      }
      .search-empty i, .search-no-results i {
        font-size: 2.5rem; margin-bottom: 12px;
        color: var(--teal-light, #0097A7); opacity: .4;
      }
      .search-empty p, .search-no-results p { font-size: .9rem; margin: 0; color: #888; }
      .search-no-results small { font-size: .78rem; color: #bbb; margin-top: 6px; }
      .search-no-results strong { color: #555; }

      /* Footer hints */
      #searchFooter {
        display: flex; gap: 16px; justify-content: center;
        padding: 10px 20px;
        border-top: 1px solid #f5f5f5;
        font-size: .72rem; color: #aaa;
        flex-wrap: wrap;
      }
      #searchFooter kbd {
        background: #f0f0f0; border: 1px solid #e0e0e0;
        border-radius: 4px; padding: 1px 5px;
        font-size: .68rem; font-family: inherit; color: #666;
      }
      @media (max-width: 600px) {
        #searchOverlay { padding-top: 20px; align-items: flex-start; }
        #searchPanel { border-radius: 16px; margin: 8px; max-height: calc(100vh - 30px); }
        #searchFooter { display: none; }
        #searchCloseBtn kbd { display: none; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ── INJECT SEARCH BUTTON INTO NAVBAR ──────────────────────── */
  function injectNavbarButton() {
    // Find the navbar collapse div that has the cart button already in it
    const navCollapse = document.getElementById('navbarCollapse');
    if (!navCollapse) return;

    // Find the ms-auto div that wraps the cart button
    const cartWrap = navCollapse.querySelector('.ms-auto');
    if (!cartWrap) return;

    const btn = document.createElement('button');
    btn.className = 'btn-search-nav';
    btn.setAttribute('aria-label', 'Search');
    btn.onclick = openSearch;
    btn.innerHTML = `<i class="fas fa-search"></i><span>Search</span><kbd>/</kbd>`;
    cartWrap.insertBefore(btn, cartWrap.firstChild);
  }

  /* ── KEYBOARD SHORTCUT "/" ───────────────────────────────────  */
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      openSearch();
    }
  });

  /* ── INIT ─────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    buildSearchUI();
    injectNavbarButton();
  });

  window.AlhahSearch = { open: openSearch, close: closeSearch };
})();
