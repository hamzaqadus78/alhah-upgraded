/**
 * ALHAH INDUSTRIES — Quote List (RFQ) System
 * Email backend: EmailJS (free tier) → sends directly to alhahindustries@gmail.com
 * Fallback: mailto link if EmailJS fails
 *
 * SETUP (one-time, 2 minutes — FREE):
 *  1. Go to https://www.emailjs.com → Sign Up free
 *  2. Add Email Service → choose Gmail → connect alhahindustries@gmail.com
 *  3. Create Email Template — use the variables listed below
 *  4. Replace the three IDs below with your own values
 */

// ── EmailJS CONFIG ─────────────────────────────────────────────
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';   // from Account → API Keys
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';   // from Email Services
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';  // from Email Templates

/*
  EMAIL TEMPLATE VARIABLES (paste these into your EmailJS template):
  {{from_name}}       — customer full name
  {{from_email}}      — customer email (used as reply-to)
  {{from_phone}}      — customer phone
  {{from_country}}    — customer country
  {{product_list}}    — formatted list of selected instruments
  {{total_items}}     — total unit count
  {{total_products}}  — number of distinct products
  {{notes}}           — additional notes
  {{enquiry_date}}    — date/time of enquiry
*/

(function () {
  'use strict';

  const CART_KEY = 'alhah_cart_v3';

  /* ── STORE ────────────────────────────────────────────────── */
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  }
  function saveCart(c) {
    localStorage.setItem(CART_KEY, JSON.stringify(c));
    renderCart(); updateBadges();
  }
  function addItem(product) {
    const c = getCart();
    const ex = c.find(i => i.id === product.id);
    if (ex) ex.qty = Math.min(ex.qty + 1, 99);
    else c.push({ ...product, qty: 1 });
    saveCart(c);
    toast('<i class="fas fa-check-circle"></i> Added to quote list');
    pulseBadge();
  }
  function removeItem(id)  { saveCart(getCart().filter(i => i.id !== id)); }
  function changeQty(id, d) {
    const c = getCart();
    const it = c.find(i => i.id === id);
    if (!it) return;
    it.qty = Math.max(1, Math.min(it.qty + d, 99));
    saveCart(c);
  }
  function clearAll() { localStorage.removeItem(CART_KEY); renderCart(); updateBadges(); }

  /* ── BADGES ────────────────────────────────────────────────── */
  function updateBadges() {
    const n = getCart().reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-badge').forEach(el => {
      el.textContent = n;
      el.style.display = n ? 'flex' : 'none';
    });
    document.querySelectorAll('.cart-count-text').forEach(el => {
      el.textContent = n ? `${n} item${n > 1 ? 's' : ''} selected` : 'No items yet';
    });
  }
  function pulseBadge() {
    document.querySelectorAll('.cart-badge').forEach(b => {
      b.style.animation = 'none';
      requestAnimationFrame(() => { b.style.animation = 'pop 0.4s ease'; });
    });
  }

  /* ── RENDER CART ────────────────────────────────────────────── */
  function renderCart() {
    const c = getCart();
    const body = document.getElementById('cartDrawerBody');
    const footer = document.getElementById('cartDrawerFooter');
    if (!body) return;

    if (!c.length) {
      body.innerHTML = `
        <div class="cart-empty">
          <div style="width:72px;height:72px;background:#f0faf9;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.8rem;color:#aaa;">
            <i class="fas fa-clipboard-list"></i>
          </div>
          <h5 style="font-weight:700;color:#1a1a2e;margin-bottom:6px;">Quote list is empty</h5>
          <p style="font-size:.85rem;color:#888;">Browse our categories and add instruments to build your quote list.</p>
        </div>`;
      if (footer) footer.innerHTML = '';
      return;
    }

    body.innerHTML = c.map(i => `
      <div class="cart-item" data-id="${i.id}">
        <img class="cart-item-img" src="${i.img}" alt="${i.name}" onerror="this.src='img/img1.jpg'">
        <div class="cart-item-info">
          <div class="cart-item-name">${i.name}</div>
          <div class="cart-item-category">${i.category}</div>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="AlhahCart.changeQty('${i.id}',-1)">−</button>
            <span class="qty-display">${i.qty}</span>
            <button class="qty-btn" onclick="AlhahCart.changeQty('${i.id}',1)">+</button>
          </div>
        </div>
        <button class="cart-item-remove" onclick="AlhahCart.remove('${i.id}')" title="Remove">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>`).join('');

    const totalQty = c.reduce((s, i) => s + i.qty, 0);
    if (footer) footer.innerHTML = `
      <div class="cart-subtotal" style="display:flex;justify-content:space-between;font-size:.85rem;color:#666;margin-bottom:6px;">
        <span>Products</span><span>${c.length}</span>
      </div>
      <div class="cart-subtotal" style="display:flex;justify-content:space-between;font-size:.85rem;color:#666;margin-bottom:12px;">
        <span>Total units</span><span>${totalQty}</span>
      </div>
      <div class="cart-note" style="font-size:.75rem;color:#555;background:#e8f5f6;border-left:3px solid #00C49A;padding:9px 12px;border-radius:6px;margin-bottom:14px;line-height:1.5;">
        <i class="fas fa-info-circle me-1"></i> Pricing quoted per enquiry. MOQ applies per product.
      </div>
      <button class="btn-checkout" onclick="AlhahCart.openCheckout()" style="width:100%;background:#006D77;color:#fff;border:none;padding:14px;border-radius:50px;font-weight:700;font-size:.88rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;letter-spacing:.5px;">
        <i class="fas fa-paper-plane"></i> Send Enquiry
      </button>
      <button class="btn-clear-cart" onclick="AlhahCart.confirmClear()" style="width:100%;background:transparent;color:#dc2626;border:1.5px solid #fca5a5;padding:10px;border-radius:50px;font-weight:700;font-size:.8rem;cursor:pointer;margin-top:10px;letter-spacing:.5px;">
        <i class="fas fa-times me-1"></i> Clear all items
      </button>`;
  }

  /* ── CART OPEN / CLOSE ──────────────────────────────────────── */
  function openCart() {
    document.getElementById('cartDrawer')?.classList.add('open');
    document.getElementById('cartOverlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCart();
  }
  function closeCart() {
    document.getElementById('cartDrawer')?.classList.remove('open');
    document.getElementById('cartOverlay')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── CHECKOUT MODAL ─────────────────────────────────────────── */
  function openCheckout() {
    const c = getCart();
    if (!c.length) { toast('<i class="fas fa-exclamation-circle"></i> Add items first'); return; }
    closeCart();

    // Build WhatsApp message
    let wa = 'Hello ALHAH INDUSTRIES 👋\n\nI would like to enquire about:\n\n';
    c.forEach((i, n) => { wa += `${n+1}. ${i.name} — ${i.category} (Qty: ${i.qty})\n`; });
    wa += `\nTotal: ${c.length} product(s), ${c.reduce((s,i)=>s+i.qty,0)} unit(s)\n\nPlease share pricing and availability.`;
    const waEl = document.getElementById('whatsappOrderBtn');
    if (waEl) waEl.href = `https://wa.me/923426004911?text=${encodeURIComponent(wa)}`;

    // Build order summary
    const sumEl = document.getElementById('checkoutSummary');
    if (sumEl) {
      sumEl.innerHTML = c.map(i =>
        `<div style="display:flex;justify-content:space-between;font-size:.84rem;color:#555;margin-bottom:6px;">
          <span>${i.name} ×${i.qty}</span>
          <span style="font-size:.76rem;color:#888">${i.category}</span>
        </div>`
      ).join('') +
      `<div style="display:flex;justify-content:space-between;font-weight:800;color:#1a1a2e;padding-top:10px;margin-top:6px;border-top:1px solid #eee;">
        <span>Total</span>
        <span>${c.reduce((s,i)=>s+i.qty,0)} units · ${c.length} product${c.length>1?'s':''}</span>
      </div>`;
    }

    document.getElementById('checkoutModal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeCheckout() {
    document.getElementById('checkoutModal')?.classList.remove('open');
    document.body.style.overflow = '';
    document.getElementById('inquiryForm')?.reset();
    const success = document.getElementById('checkoutSuccess');
    const formWrap = document.getElementById('checkoutFormWrap');
    if (success) success.style.display = 'none';
    if (formWrap) formWrap.style.display = 'block';
    const btn = document.getElementById('submitInquiryBtn');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Send Enquiry'; }
  }

  /* ── EMAIL SEND ─────────────────────────────────────────────── */
  async function submitInquiry(e) {
    e.preventDefault();
    const btn = document.getElementById('submitInquiryBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Sending…';

    const c = getCart();
    const name    = document.getElementById('inqName').value.trim();
    const email   = document.getElementById('inqEmail').value.trim();
    const phone   = document.getElementById('inqPhone').value.trim();
    const country = document.getElementById('inqCountry').value.trim();
    const notes   = document.getElementById('inqNotes').value.trim();

    // Build product list string
    const productList = c.map((i, n) =>
      `${n+1}. ${i.name}\n   Category: ${i.category}\n   Quantity: ${i.qty} unit${i.qty>1?'s':''}`
    ).join('\n\n');

    const totalUnits    = c.reduce((s,i)=>s+i.qty, 0);
    const totalProducts = c.length;
    const now           = new Date().toLocaleString('en-GB', {timeZone:'Asia/Karachi', hour12:true});

    /* ── Try EmailJS first ──────────────────────────────────── */
    let emailSent = false;
    if (EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
      try {
        // Load EmailJS SDK dynamically if not loaded yet
        if (!window.emailjs) {
          await loadScript('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js');
          emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
        }
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          from_name:      name,
          from_email:     email,
          from_phone:     phone || 'Not provided',
          from_country:   country || 'Not provided',
          product_list:   productList,
          total_items:    totalUnits,
          total_products: totalProducts,
          notes:          notes || 'None',
          enquiry_date:   now,
          reply_to:       email,
        });
        emailSent = true;
      } catch (err) {
        console.warn('EmailJS failed, falling back to mailto:', err);
      }
    }

    /* ── Fallback: mailto (opens Gmail/Outlook) ─────────────── */
    if (!emailSent) {
      const subject = `Surgical Instrument Enquiry from ${name} — ALHAH INDUSTRIES`;
      const body = [
        `Dear ALHAH INDUSTRIES Team,`,
        ``,
        `I would like to enquire about the following surgical instruments:`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        productList,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `TOTAL: ${totalProducts} product${totalProducts>1?'s':''}, ${totalUnits} unit${totalUnits>1?'s':''}`,
        ``,
        `CUSTOMER DETAILS:`,
        `Name:     ${name}`,
        `Email:    ${email}`,
        `Phone:    ${phone || 'Not provided'}`,
        `Country:  ${country || 'Not provided'}`,
        `Date:     ${now}`,
        notes ? `\nNOTES:\n${notes}` : '',
        ``,
        `Please provide pricing, MOQ details, certifications available, and lead times.`,
        ``,
        `Thank you!`,
        `${name}`,
      ].join('\n');

      const mailtoLink = `mailto:alhahindustries@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, '_blank');
    }

    // Show success screen
    setTimeout(() => {
      document.getElementById('checkoutFormWrap').style.display = 'none';
      document.getElementById('checkoutSuccess').style.display = 'block';
      clearAll();
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Send Enquiry';
    }, emailSent ? 200 : 800);
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function confirmClear() {
    if (confirm('Remove all items from your quote list?')) clearAll();
  }

  /* ── TOAST ──────────────────────────────────────────────────── */
  let _toastTimer;
  function toast(html) {
    let el = document.getElementById('cartToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cartToast';
      el.className = 'cart-toast';
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  /* ── INJECT CART HTML ───────────────────────────────────────── */
  function injectCartHTML() {
    document.body.insertAdjacentHTML('beforeend', `
    <div id="cartOverlay" class="cart-overlay" onclick="AlhahCart.close()"></div>
    <div id="cartDrawer" class="cart-drawer">
      <div class="cart-drawer-header">
        <div>
          <h3><i class="fas fa-clipboard-list me-2" style="color:#00C49A"></i>Quote List</h3>
          <div class="cart-count-text">No items yet</div>
        </div>
        <button class="cart-close-btn" onclick="AlhahCart.close()"><i class="fas fa-times"></i></button>
      </div>
      <div class="cart-drawer-body" id="cartDrawerBody">
        <div class="cart-empty">
          <div style="width:72px;height:72px;background:#f0faf9;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.8rem;color:#aaa;">
            <i class="fas fa-clipboard-list"></i>
          </div>
          <h5 style="font-weight:700;color:#1a1a2e;margin-bottom:6px;">Quote list is empty</h5>
          <p style="font-size:.85rem;color:#888;">Add instruments to build your quote list.</p>
        </div>
      </div>
      <div id="cartDrawerFooter" class="cart-drawer-footer"></div>
    </div>

    <!-- CHECKOUT MODAL -->
    <div id="checkoutModal" class="checkout-modal-overlay">
      <div class="checkout-modal">
        <div class="checkout-modal-header">
          <h4><i class="fas fa-paper-plane me-2" style="color:#00C49A"></i>Send Enquiry</h4>
          <button class="modal-close-btn" onclick="AlhahCart.closeCheckout()"><i class="fas fa-times"></i></button>
        </div>
        <div class="checkout-modal-body">
          <div id="checkoutFormWrap">
            <div class="checkout-order-summary">
              <h6 style="font-size:.72rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:12px;">
                <i class="fas fa-list me-2"></i>Selected Items
              </h6>
              <div id="checkoutSummary"></div>
            </div>

            <!-- WhatsApp quick option -->
            <a id="whatsappOrderBtn" href="#" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;background:#25D366;color:#fff;border:none;padding:13px;border-radius:50px;font-weight:700;font-size:.88rem;text-decoration:none;cursor:pointer;letter-spacing:.4px;box-shadow:0 4px 16px rgba(37,211,102,.25);transition:all .25s ease;">
              <i class="fab fa-whatsapp" style="font-size:1.2rem"></i> Quick Enquiry via WhatsApp
            </a>

            <div style="text-align:center;position:relative;margin:16px 0;font-size:.76rem;color:#aaa;font-weight:600;">
              <span style="background:#fff;padding:0 14px;position:relative;z-index:1;">or fill the form below</span>
              <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:#eee;z-index:0;"></div>
            </div>

            <form id="inquiryForm" onsubmit="AlhahCart.submitForm(event)">
              <div class="row g-3">
                <div class="col-12">
                  <div class="checkout-form-group">
                    <label>Full Name *</label>
                    <input type="text" id="inqName" required placeholder="Your full name">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="checkout-form-group">
                    <label>Email Address *</label>
                    <input type="email" id="inqEmail" required placeholder="email@example.com">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="checkout-form-group">
                    <label>Phone / WhatsApp</label>
                    <input type="tel" id="inqPhone" placeholder="+1 555 000 0000">
                  </div>
                </div>
                <div class="col-12">
                  <div class="checkout-form-group">
                    <label>Country</label>
                    <input type="text" id="inqCountry" placeholder="Your country">
                  </div>
                </div>
                <div class="col-12">
                  <div class="checkout-form-group">
                    <label>Additional Notes</label>
                    <textarea id="inqNotes" placeholder="Quantities, certifications needed, custom requirements…"></textarea>
                  </div>
                </div>
              </div>
              <p style="font-size:.72rem;color:#aaa;text-align:center;margin:12px 0 6px;">
                <i class="fas fa-lock me-1"></i>Sent directly to alhahindustries@gmail.com · Reply within 24 hours
              </p>
              <button type="submit" id="submitInquiryBtn" class="btn-submit-inquiry">
                <i class="fas fa-paper-plane me-2"></i> Send Enquiry
              </button>
            </form>
          </div>

          <!-- Success Screen -->
          <div id="checkoutSuccess" style="display:none;text-align:center;padding:40px 28px;">
            <div style="width:80px;height:80px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:2.2rem;color:#16a34a;box-shadow:0 8px 24px rgba(22,163,74,.2);">
              <i class="fas fa-check"></i>
            </div>
            <h4 style="font-weight:800;color:#1a1a2e;margin-bottom:8px;">Enquiry Sent!</h4>
            <p style="font-size:.9rem;color:#666;margin-bottom:24px;">
              Your enquiry has been sent to ALHAH INDUSTRIES. We will review your product list and reply within 24 hours.
            </p>
            <button class="btn-checkout" onclick="AlhahCart.closeCheckout()" style="width:auto;padding:12px 32px;">
              <i class="fas fa-arrow-left me-2"></i> Continue Browsing
            </button>
          </div>
        </div>
      </div>
    </div>`);

    // Close modal on overlay click
    document.getElementById('checkoutModal')?.addEventListener('click', e => {
      if (e.target.id === 'checkoutModal') closeCheckout();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeCart(); closeCheckout(); }
    });
  }

  /* ── PUBLIC API ─────────────────────────────────────────────── */
  window.AlhahCart = {
    add: addItem, remove: removeItem, changeQty,
    open: openCart, close: closeCart,
    openCheckout, closeCheckout,
    submitForm: submitInquiry,
    confirmClear, getCart,
  };

  document.addEventListener('DOMContentLoaded', () => {
    injectCartHTML();
    updateBadges();
  });

})();
