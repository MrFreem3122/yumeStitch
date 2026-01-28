// script_Java/all.js
// Single-file app: cart + product interactions + forms + mini-cart
// Meant to be loaded as: <script type="module" src="script_Java/all.js"></script>

const STORAGE_KEY = 'yumestitch_cart_v1';

// ---------------------------
// Utilities
// ---------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read cart from storage', e);
    return [];
  }
}
function writeStorage(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  updateCartBadge();
  renderMiniCartItems();
}
function findCartItem(cart, id, attrs = {}) {
  return cart.find(it => it.id === id && (!attrs.variant || it.variant === attrs.variant));
}
function formatCurrency(n) {
  return `R${Number(n).toFixed(0)}`;
}

// ---------------------------
// Cart operations
// ---------------------------
function addToCart(item) {
  const cart = readStorage();
  // define variant string for item identification (size+color)
  const variant = ((item.size || '') + '|' + (item.color || '')).trim();
  const existing = cart.find(ci => ci.id === item.id && ci.variant === variant);
  if (existing) {
    existing.qty = (existing.qty || 1) + (item.qty || 1);
  } else {
    cart.push({
      id: item.id,
      name: item.name || 'Unnamed product',
      price: Number(item.price) || 0,
      image: item.image || '',
      qty: item.qty || 1,
      size: item.size || '',
      color: item.color || '',
      variant: variant
    });
  }
  writeStorage(cart);
  flashMessage('Added to cart');
}

// ---------------------------
// UI: badge + mini cart
// ---------------------------
function updateCartBadge() {
  const badge = $('#cart-count');
  if (!badge) return;
  const cart = readStorage();
  const totalQty = cart.reduce((s, it) => s + (it.qty || 0), 0);
  if (totalQty > 0) {
    badge.style.display = 'flex';
    badge.textContent = String(totalQty > 99 ? '99+' : totalQty);
  } else {
    badge.style.display = 'none';
  }
}

function renderMiniCartItems() {
  const container = $('#mini-cart-items');
  if (!container) return;
  container.innerHTML = '';
  const cart = readStorage();
  if (!cart.length) {
    container.innerHTML = '<p>Your cart is empty.</p>';
    return;
  }
  cart.slice(0, 6).forEach(it => {
    const div = document.createElement('div');
    div.className = 'mini-cart-item';
    div.innerHTML = `
      <img src="${it.image || 'images/Yume_Stich_Logo.png'}" alt="${escapeHtml(it.name)}">
      <div style="flex:1">
        <div style="font-weight:700">${escapeHtml(it.name)}</div>
        <div style="font-size:0.9rem">${it.size ? 'Size: '+escapeHtml(it.size)+' ' : ''}${it.color ? '• '+escapeHtml(it.color) : ''}</div>
        <div style="margin-top:6px">${formatCurrency(it.price)} x ${it.qty}</div>
      </div>
      <button class="mini-remove" data-id="${escapeHtml(it.id)}" data-variant="${escapeHtml(it.variant)}" aria-label="remove">✕</button>
    `;
    container.appendChild(div);
  });
  const footer = $('#mini-cart .mini-cart-footer');
  if (footer) {
    const total = cart.reduce((s, it) => s + (it.price * it.qty), 0);
    footer.querySelector('.cart-btn')?.insertAdjacentHTML('beforebegin', `<div style="padding:8px 0; font-weight:700">Total: ${formatCurrency(total)}</div>`);
  }
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function flashMessage(text, timeout = 1800) {
  let el = document.getElementById('yumestitch_flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'yumestitch_flash';
    el.style.position = 'fixed';
    el.style.right = '20px';
    el.style.bottom = '20px';
    el.style.background = '#E03C31';
    el.style.color = '#fff';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '10px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.2)';
    el.style.fontWeight = '700';
    el.style.zIndex = 9999;
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  if (el._timeout) clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.opacity = '0'; }, timeout);
}

// ---------------------------
// Mini cart open/close + handlers
// ---------------------------
function showMiniCart() {
  const mini = $('#mini-cart');
  if (!mini) return;
  mini.classList.add('open');
}
function hideMiniCart() {
  const mini = $('#mini-cart');
  if (!mini) return;
  mini.classList.remove('open');
}
function toggleMiniCart() {
  const mini = $('#mini-cart');
  if (!mini) return;
  mini.classList.toggle('open');
}

function handleMiniCartClicks(e) {
  const rm = e.target.closest('.mini-remove');
  if (rm) {
    const id = rm.dataset.id;
    const variant = rm.dataset.variant || '';
    if (!id) return;
    const cart = readStorage();
    const idx = cart.findIndex(it => it.id === id && it.variant === variant);
    if (idx >= 0) {
      cart.splice(idx, 1);
      writeStorage(cart);
      renderMiniCartItems();
      updateCartBadge();
    }
  }
}

// ---------------------------
// Add-to-cart listeners (home / product lists)
// ---------------------------
function attachAddToCartListeners() {
  const buttons = $$('.add-to-cart');
  buttons.forEach(btn => {
    if (btn._bound) return;
    btn._bound = true;
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      // Read dataset first (preferred)
      const ds = btn.dataset || {};
      const id = ds.id || ds.productId || ds.product || (btn.getAttribute('data-id')) || null;
      // attempt to extract name/price/image from data- attributes
      let payload = {
        id: id || (Date.now() + Math.random()).toString(36),
        name: ds.name || ds.productName || '',
        price: ds.price ? Number(ds.price) : (ds.cost ? Number(ds.cost) : null),
        image: ds.image || ds.img || ''
      };
      // get qty/size/color if present on button dataset
      if (ds.qty) payload.qty = Number(ds.qty);
      if (ds.size) payload.size = ds.size;
      if (ds.color) payload.color = ds.color;
      // Fallback: try to get data from DOM (common structure .product-card)
      if ((!payload.name || payload.price === null || payload.price === undefined || payload.price === 0) && btn.closest) {
        const card = btn.closest('.product-card') || btn.closest('.product-card') || btn.closest('.category') || btn.parentElement;
        if (card) {
          const nameEl = card.querySelector('h3') || card.querySelector('h2') || card.querySelector('.product-title');
          const priceEl = card.querySelector('p') || card.querySelector('.product-price') || card.querySelector('.price');
          const imgEl = card.querySelector('img');
          if (!payload.name && nameEl) payload.name = nameEl.textContent.trim();
          if ((payload.price === null || payload.price === undefined || payload.price === 0) && priceEl) {
            // try to parse digits from price text (e.g. "R250")
            const m = priceEl.textContent.match(/(\d+[.,]?\d*)/);
            payload.price = m ? Number(m[1].replace(',', '.')) : payload.price || 0;
          }
          if (!payload.image && imgEl) payload.image = imgEl.getAttribute('src') || '';
        }
      }
      // final safe defaults
      if (!payload.name) payload.name = 'Untitled product';
      if (!payload.price) payload.price = Number(payload.price) || 0;
      // If user selected size/color controls near this button, try to read them
      try {
        const card = btn.closest('.product-card') || document;
        const activeSize = card.querySelector('.sizes li.active');
        const activeColor = card.querySelector('.colors li.active');
        if (activeSize) payload.size = activeSize.textContent.trim();
        if (activeColor) payload.color = activeColor.className.split(' ').filter(c => c !== 'color' && c !== 'active').join(' ').trim() || '';
      } catch (e) { /* ignore */ }
      payload.qty = payload.qty || 1;
      addToCart(payload);
    });
  });
}

// ---------------------------
// Product page features
// ---------------------------
function initProductPage() {
  const mainImage = $('#mainImage');
  const thumbs = $('#thumbnails');
  if (thumbs && mainImage) {
    // delegate click on thumbnails
    thumbs.addEventListener('click', (ev) => {
      const img = ev.target.closest('img');
      if (!img) return;
      const src = img.dataset.full || img.src;
      mainImage.src = src;
      // mark active
      $$('#thumbnails img').forEach(i => i.classList.remove('active'));
      img.classList.add('active');
    });
  }
  // quantity controls
  const minus = $('#minus');
  const plus = $('#plus');
  const qtyVal = $('#quantityValue');
  if (minus && plus && qtyVal) {
    minus.addEventListener('click', () => {
      let v = Number(qtyVal.textContent || qtyVal.innerText || 1);
      v = Math.max(1, v - 1);
      qtyVal.textContent = v;
    });
    plus.addEventListener('click', () => {
      let v = Number(qtyVal.textContent || qtyVal.innerText || 1);
      v = v + 1;
      qtyVal.textContent = v;
    });
  }
  // sizes
  $$('.sizes li').forEach(li => {
    li.addEventListener('click', () => {
      $$('.sizes li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
    });
  });
  // colors
  $$('.colors li').forEach(li => {
    li.addEventListener('click', () => {
      $$('.colors li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
    });
  });

  // Product page "Add to cart" with qty/size/color
  const mainAdd = document.querySelector('.product-info .add-cart') || $('#productAdd') || $('.add-to-cart.product-page-btn');
  if (mainAdd) {
    // ensure button has class add-to-cart so global handler picks it up
    if (!mainAdd.classList.contains('add-to-cart')) mainAdd.classList.add('add-to-cart');
    // But we want to set dataset values dynamically when clicked
    mainAdd.addEventListener('click', (ev) => {
      // update dataset before global handler runs
      const btn = ev.currentTarget;
      const card = btn.closest('.product-page') || document;
      // name
      const nameEl = card.querySelector('#productName') || card.querySelector('.product-title') || card.querySelector('h1') || card.querySelector('h2');
      if (nameEl) btn.dataset.name = nameEl.textContent.trim();
      // price
      const priceEl = card.querySelector('#price') || card.querySelector('.product-price') || card.querySelector('.price');
      if (priceEl) {
        const m = priceEl.textContent.match(/(\d+[.,]?\d*)/);
        if (m) btn.dataset.price = m[1].replace(',', '.');
      }
      // image
      const imgEl = card.querySelector('#mainImage') || card.querySelector('.main-image') || card.querySelector('img');
      if (imgEl) btn.dataset.image = imgEl.getAttribute('src') || '';
      // size + color + qty
      const activeSize = card.querySelector('.sizes li.active');
      const activeColor = card.querySelector('.colors li.active');
      const qtyEl = card.querySelector('#quantityValue');
      if (activeSize) btn.dataset.size = activeSize.textContent.trim();
      if (activeColor) {
        // try to get color name from class or data-color
        btn.dataset.color = activeColor.dataset.color || activeColor.className.replace('color', '').replace('active', '').trim();
      }
      if (qtyEl) btn.dataset.qty = Number(qtyEl.textContent || qtyEl.innerText) || 1;
      // allow other handlers (global add-to-cart) to run
    }, {capture: false});
  }
}

// ---------------------------
// Cart page render / interactions
// ---------------------------
function initCartPage() {
  const root = $('#cartRoot');
  if (!root) return;
  function render() {
    const cart = readStorage();
    if (!cart.length) {
      root.innerHTML = '<p>Your cart is empty.</p>';
      return;
    }
    root.innerHTML = '';
    const table = document.createElement('div');
    table.className = 'cart-table';
    cart.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.style.display = 'flex';
      row.style.gap = '12px';
      row.style.alignItems = 'center';
      row.style.marginBottom = '12px';
      row.innerHTML = `
        <img src="${it.image || 'images/Yume_Stich_Logo.png'}" alt="${escapeHtml(it.name)}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #ccc;">
        <div style="flex:1">
          <div style="font-weight:700">${escapeHtml(it.name)}</div>
          <div style="font-size:0.9rem;color:#666">${it.size? 'Size: '+escapeHtml(it.size) : ''} ${it.color ? ' • '+escapeHtml(it.color) : ''}</div>
          <div style="margin-top:6px">${formatCurrency(it.price)} each</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
          <div style="display:flex;gap:6px;align-items:center">
            <button class="cart-decrease" data-idx="${idx}">-</button>
            <div style="min-width:28px;text-align:center;font-weight:700">${it.qty}</div>
            <button class="cart-increase" data-idx="${idx}">+</button>
          </div>
          <button class="cart-remove" data-idx="${idx}">Remove</button>
        </div>
        <div style="width:110px;text-align:right">${formatCurrency(it.price * it.qty)}</div>
      `;
      table.appendChild(row);
    });
    const total = cart.reduce((s, it) => s + (it.price * it.qty), 0);
    root.appendChild(table);
    const summary = document.createElement('div');
    summary.style.marginTop = '18px';
    summary.style.display = 'flex';
    summary.style.justifyContent = 'space-between';
    summary.style.alignItems = 'center';
    summary.innerHTML = `
      <div style="font-weight:700">Total: ${formatCurrency(total)}</div>
      <div>
        <button id="clearCart" style="margin-right:8px">Clear Cart</button>
        <button id="checkoutBtn">Checkout</button>
      </div>
    `;
    root.appendChild(summary);
  }
  render();
  root.addEventListener('click', (ev) => {
    const dec = ev.target.closest('.cart-decrease');
    const inc = ev.target.closest('.cart-increase');
    const rem = ev.target.closest('.cart-remove');
    if (dec || inc || rem) {
      const idx = Number((dec || inc || rem).dataset.idx);
      const cart = readStorage();
      if (!cart[idx]) return;
      if (dec) {
        cart[idx].qty = Math.max(1, (cart[idx].qty || 1) - 1);
      } else if (inc) {
        cart[idx].qty = (cart[idx].qty || 1) + 1;
      } else if (rem) {
        cart.splice(idx, 1);
      }
      writeStorage(cart);
      render();
    }
  });
  document.addEventListener('click', (ev) => {
    if (ev.target && ev.target.id === 'clearCart') {
      localStorage.removeItem(STORAGE_KEY);
      render();
      updateCartBadge();
      renderMiniCartItems();
    }
    if (ev.target && ev.target.id === 'checkoutBtn') {
      // simple checkout flow: open mailto with cart summary
      const cart = readStorage();
      if (!cart.length) { flashMessage('Cart is empty'); return; }
      const lines = cart.map(it => `${it.name} (${it.size || '-'} ${it.color?'/'+it.color:''}) x ${it.qty} = ${formatCurrency(it.price * it.qty)}`);
      const total = cart.reduce((s,it)=>s+(it.price*it.qty),0);
      const body = encodeURIComponent(lines.join('\n') + `\n\nTotal: ${formatCurrency(total)}\n\nPlease contact me to process this order.`);
      const mailto = `mailto:sales@yumestitch.com?subject=${encodeURIComponent('Order request from site')}&body=${body}`;
      window.location.href = mailto;
    }
  });
}

// ---------------------------
// Forms: contact & enquiry
// ---------------------------
function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('firstName') || fd.get('name') || '').toString().trim();
    const last = (fd.get('lastName') || fd.get('lastName') || fd.get('last') || '').toString().trim();
    const email = (fd.get('email') || fd.get('emailAddress') || '').toString().trim();
    const message = (fd.get('message') || fd.get('msg') || '').toString().trim();
    if (!name || !email || !message) {
      flashMessage('Please fill required fields');
      return;
    }
    // simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { flashMessage('Invalid email'); return; }
    const subject = encodeURIComponent('Contact from website');
    const body = encodeURIComponent(`Name: ${name} ${last}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:support@yumestitch.com?subject=${subject}&body=${body}`;
  });
}

function initEnquiryForm() {
  const form = document.getElementById('enquiryForm');
  if (!form) return;
  // populate productSelect if empty by scanning product cards (useful)
  const productSelect = $('#productSelect');
  if (productSelect) {
    if (!productSelect.querySelectorAll('option').length || productSelect.querySelectorAll('option').length <= 1) {
      // scan page images with product-card
      const prodCards = $$('.product-card img, .bestseller-container img, .category img');
      const seen = new Set();
      prodCards.forEach((img, i) => {
        const nameEl = img.closest('.product-card')?.querySelector('h3') || img.alt || `Product ${i+1}`;
        const val = nameEl && nameEl.textContent ? nameEl.textContent.trim() : img.alt || `prod-${i+1}`;
        if (!seen.has(val)) {
          const opt = document.createElement('option');
          opt.value = val;
          opt.textContent = val;
          productSelect.appendChild(opt);
          seen.add(val);
        }
      });
    }
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const type = (fd.get('type') || '').toString();
    const product = (fd.get('product') || '').toString();
    const details = (fd.get('details') || '').toString().trim();
    if (!name || !email) {
      $('#enquiryResponse').innerHTML = `<p style="color:tomato">Please provide your name and email</p>`;
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      $('#enquiryResponse').innerHTML = `<p style="color:tomato">Invalid email address</p>`;
      return;
    }

    // Simulate availability & price estimation: simple logic
    let available = true;
    let estimation = 'Please contact for exact quote';
    if (type === 'bulk') {
      estimation = 'Bulk orders: estimated price per item R' + (Math.round((Math.random()*200)+350));
    } else if (type === 'product' && product) {
      // try to find product price from product cards or data attributes
      let price = null;
      // find card matching the product title
      const card = Array.from(document.querySelectorAll('.product-card')).find(c => (c.querySelector('h3')?.textContent || '').trim() === product);
      if (card) {
        const pEl = card.querySelector('p');
        const m = pEl?.textContent?.match(/(\d+[.,]?\d*)/);
        if (m) price = Number(m[1].replace(',','.'));
      }
      if (!price) price = 500; // fallback
      estimation = `Estimated unit price: R${price}`;
    } else {
      estimation = 'We will contact you with details';
    }

    // Present response
    $('#enquiryResponse').innerHTML = `
      <div style="padding:12px;border-radius:8px;background:#f6f6f6;border:1px solid #ddd">
        <strong>Thank you, ${escapeHtml(name)}.</strong>
        <p>Type: ${escapeHtml(type)} ${product ? '• Product: '+escapeHtml(product) : ''}</p>
        <p>Estimation / Availability: <strong>${escapeHtml(estimation)}</strong></p>
        <p>We will contact you at <strong>${escapeHtml(email)}</strong>.</p>
      </div>
    `;
  });
}

// ---------------------------
// Initialization on DOM ready
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
  // attach add-to-cart handlers site-wide
  attachAddToCartListeners();

  // Init mini-cart toggle
  const cartIcon = $('#cart-icon') || $('.box-basket') || $('#cart-count')?.closest('.box-basket') || $('#cart-button');
  if (cartIcon) {
    cartIcon.addEventListener('click', (ev) => {
      ev.preventDefault();
      toggleMiniCart();
    });
  }
  // mini-cart close buttons (if any)
  document.addEventListener('click', (ev) => {
    if (ev.target.matches('#mini-cart button') && ev.target.textContent.toLowerCase().includes('close')) {
      hideMiniCart();
    }
  });

  // allow clicking outside mini-cart to close
  document.addEventListener('click', (ev) => {
    const mini = $('#mini-cart');
    if (!mini) return;
    const inside = ev.target.closest('#mini-cart') || ev.target.closest('.box-basket') || ev.target.closest('#cart-icon');
    if (!inside && mini.classList.contains('open')) {
      // close
      mini.classList.remove('open');
    }
  });

  // mini-cart internal buttons
  const mini = $('#mini-cart');
  if (mini) mini.addEventListener('click', handleMiniCartClicks);

  // initial badge and mini cart render
  updateCartBadge();
  renderMiniCartItems();

  // product page features
  initProductPage();

  // cart page render
  initCartPage();

  // forms
  initContactForm();
  initEnquiryForm();

  // re-attach add-to-cart in case productAdd added dataset dynamically
  attachAddToCartListeners();
});

// ---------------------------
// Expose for debugging (optional)
// ---------------------------
window.YumeStitch = {
  addToCart,
  readStorage,
  writeStorage,
  showMiniCart,
  hideMiniCart,
  toggleMiniCart
};
