function addToCart(productId) {
    var p = getProductById(productId);
    if (!p) return;
    if (getAvailableStock(productId) <= 0) { showToast('⚠️ ' + p.name + ' غير متوفر'); return; }
    var ex = state.cart.find(i => i.id === productId);
    if (ex) ex.quantity += 1;
    else state.cart.push({
      id: p.id, code: p.code, name: p.name, priceUSD: p.priceUSD,
      costUSD: p.costUSD || 0, unit: p.unit, image: p.image, quantity: 1
    });
    persistState();
    renderCart();
    if (typeof renderCategoriesWithProducts === 'function') renderCategoriesWithProducts();
    if (typeof renderProductsTable === 'function') renderProductsTable();
    showToast('✓ تمت إضافة ' + p.name);
  }
  
  function updateQuantity(productId, action) {
    var idx = state.cart.findIndex(i => i.id === productId);
    if (idx === -1) return;
    var item = state.cart[idx];
    if (action === 'increase') {
      if (getAvailableStock(productId) <= 0) { showToast('⚠️ المخزون محدود'); return; }
      item.quantity += 1;
    } else if (action === 'decrease') {
      item.quantity -= 1;
      if (item.quantity <= 0) state.cart.splice(idx, 1);
    }
    persistState();
    renderCart();
    if (typeof renderCategoriesWithProducts === 'function') renderCategoriesWithProducts();
    if (typeof renderProductsTable === 'function') renderProductsTable();
  }
  
  function clearCart() {
    if (state.cart.length === 0) return;
    state.cart = [];
    persistState();
    renderCart();
    if (typeof renderCategoriesWithProducts === 'function') renderCategoriesWithProducts();
    showToast('🗑️ تم مسح السلة');
  }
  
  function renderCart() {
    var totalItems = state.cart.reduce((s, i) => s + i.quantity, 0);
    var hc = document.getElementById('cartCountHeader');
    var ic = document.getElementById('cartItemCount');
    if (hc) hc.textContent = totalItems;
    if (ic) ic.textContent = totalItems;
  
    var container = document.getElementById('cartItemsContainer');
    if (!container) return;
  
    if (state.cart.length === 0) {
      container.innerHTML = '<div class="empty-cart-msg">السلة فارغة، أضف منتجات 🛒</div>';
    } else {
      container.innerHTML = state.cart.map(item => {
        var totalSYP = usdToSyp(item.priceUSD * item.quantity);
        var unitSYP = usdToSyp(item.priceUSD);
        var avail = getAvailableStock(item.id);
        var img = item.image || CONFIG.PLACEHOLDER_IMG;
        return '<div class="cart-item">' +
          '<div class="cart-item-info">' +
            '<img class="cart-item-image" src="' + img + '" onerror="this.src=\'' + CONFIG.PLACEHOLDER_IMG + '\'">' +
            '<div class="cart-item-text">' +
              '<div class="cart-item-name">' + item.name + '</div>' +
              '<div class="cart-item-detail">' + item.unit + ' • ' + formatSYP(unitSYP) + ' ل.س</div>' +
              '<div class="cart-item-code">🔖 ' + item.code + '</div>' +
            '</div></div>' +
          '<div class="cart-item-actions">' +
            '<button class="qty-btn" data-action="decrease" data-id="' + item.id + '">−</button>' +
            '<span class="item-qty">' + item.quantity + '</span>' +
            '<button class="qty-btn" data-action="increase" data-id="' + item.id + '" ' + (avail <= 0 ? 'disabled' : '') + '>+</button>' +
            '<span class="cart-item-price">' + formatSYP(totalSYP) + ' ل.س</span>' +
          '</div></div>';
      }).join('');
    }
  
    var subtotal = state.cart.reduce((s, i) => s + usdToSyp(i.priceUSD * i.quantity), 0);
    var shippingFee = calculateShipping(subtotal);
    var total = subtotal + shippingFee;
  
    var sub = document.getElementById('cartSubtotal');
    var ship = document.getElementById('cartShipping');
    var tot = document.getElementById('cartTotalAmount');
    var infoBox = document.getElementById('shippingInfoBox');
    if (sub) sub.textContent = formatSYP(subtotal) + ' ل.س';
    if (ship) ship.textContent = shippingFee === 0
      ? (subtotal > 0 ? 'مجاني ✓' : '-')
      : formatSYP(shippingFee) + ' ل.س';
    if (tot) tot.textContent = formatSYP(total) + ' ل.س';
  
    if (infoBox) {
      if (subtotal > 0 && shippingFee > 0) {
        var remaining = state.shipping.threshold - subtotal;
        infoBox.classList.add('visible');
        infoBox.style.background = '#fff8e1'; infoBox.style.borderColor = '#ffe082'; infoBox.style.color = '#7c5c00';
        infoBox.innerHTML = '🚚 أضف <strong>' + formatSYP(remaining) + ' ل.س</strong> للحصول على شحن مجاني!';
      } else if (subtotal > 0) {
        infoBox.classList.add('visible');
        infoBox.style.background = '#e8f5e9'; infoBox.style.borderColor = '#a5d6a7'; infoBox.style.color = '#2e7d32';
        infoBox.innerHTML = '🎉 <strong>مبروك! شحن مجاني</strong>';
      } else {
        infoBox.classList.remove('visible');
      }
    }
  }
  
  function bindCartEvents() {
    var container = document.getElementById('cartItemsContainer');
    if (container) {
      container.addEventListener('click', e => {
        var btn = e.target.closest('.qty-btn');
        if (!btn || btn.disabled) return;
        var id = Number(btn.dataset.id);
        var action = btn.dataset.action;
        if (id && action) updateQuantity(id, action);
      });
    }
    var clearBtn = document.getElementById('clearCartBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearCart);
  }