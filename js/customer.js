function productMatchesSearch(p, q) {
    if (!q) return true;
    q = q.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) ||
      (p.unit && p.unit.toLowerCase().includes(q));
  }
  
  function getFilteredProducts() {
    return state.products.filter(p => {
      if (p.stock <= 0) return false;
      return productMatchesSearch(p, state.searchQuery);
    });
  }
  
  function renderCategoriesWithProducts() {
    var container = document.getElementById('categoriesContainer');
    if (!container) return;
    var searching = state.searchQuery.trim().length > 0;
    var cats = state.categories;
    if (state.currentCategoryFilter !== 'all')
      cats = state.categories.filter(c => c.id === state.currentCategoryFilter);
  
    var totalShown = 0, html = '';
    cats.forEach(cat => {
      var prods = getFilteredProducts().filter(p => p.categoryId === cat.id);
      if (searching && prods.length === 0) return;
      totalShown += prods.length;
  
      var prodsHTML;
      if (prods.length === 0) {
        prodsHTML = '<div class="category-empty-msg">📭 لا توجد منتجات متوفرة</div>';
      } else {
        prodsHTML = prods.map(p => {
          var priceSYP = usdToSyp(p.priceUSD);
          var avail = getAvailableStock(p.id);
          var isLow = avail <= settings.lowStockThreshold && avail > 0;
          var badge = isLow
            ? '<span class="stock-badge low-stock">متبقي ' + avail + '</span>'
            : '<span class="stock-badge in-stock">متوفر</span>';
          var img = p.image || CONFIG.PLACEHOLDER_IMG;
          var nameHi = highlightText(p.name, state.searchQuery);
          return '<div class="product-card">' + badge +
            '<div class="product-image-wrapper"><img class="product-image" src="' + img +
            '" onerror="this.src=\'' + CONFIG.PLACEHOLDER_IMG + '\'" loading="lazy"></div>' +
            '<div class="product-info">' +
              '<div class="product-name">' + nameHi + '</div>' +
              '<div class="product-unit">' + p.unit + '</div>' +
              '<div class="product-code-mini">🔖 ' + p.code + '</div>' +
              '<div class="price-row"><span class="price">' + formatSYP(priceSYP) +
              ' <small>ل.س</small></span><button class="add-btn" data-id="' + p.id + '">+</button></div>' +
            '</div></div>';
        }).join('');
      }
      html += '<div class="category-block">' +
        '<div class="category-block-header"><h3><span class="cat-emoji-big">' + cat.emoji + '</span>' + cat.name + '</h3>' +
        '<span class="category-block-count">' + prods.length + ' منتج</span></div>' +
        '<div class="category-block-grid">' + prodsHTML + '</div></div>';
    });
  
    if (searching && totalShown === 0) {
      container.innerHTML = '<div class="no-results"><div class="no-results-icon">🔍</div><h3>لا توجد نتائج لـ "' + state.searchQuery + '"</h3></div>';
      return;
    }
    container.innerHTML = html;
    container.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', () => addToCart(Number(btn.dataset.id)));
    });
  }
  
  function renderCategoryFilterBar() {
    var bar = document.getElementById('categoryFilterBar');
    if (!bar) return;
    var avail = state.products.filter(p => p.stock > 0);
    var html = '<button class="cat-filter-btn ' + (state.currentCategoryFilter === 'all' ? 'active' : '') +
      '" data-cat="all">🛍️ الكل <span class="cat-count">' + avail.length + '</span></button>';
    state.categories.forEach(cat => {
      var count = avail.filter(p => p.categoryId === cat.id).length;
      html += '<button class="cat-filter-btn ' + (state.currentCategoryFilter === cat.id ? 'active' : '') +
        '" data-cat="' + cat.id + '">' + cat.emoji + ' ' + cat.name +
        ' <span class="cat-count">' + count + '</span></button>';
    });
    bar.innerHTML = html;
    bar.querySelectorAll('.cat-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentCategoryFilter = btn.dataset.cat;
        persistState();
        renderCategoryFilterBar();
        renderCategoriesWithProducts();
        updateSearchInfo();
      });
    });
  }
  
  function updateSearchInfo() {
    var info = document.getElementById('searchInfo');
    if (!info) return;
    var hasSearch = state.searchQuery.trim().length > 0;
    var hasFilter = state.currentCategoryFilter !== 'all';
    if (!hasSearch && !hasFilter) { info.style.display = 'none'; return; }
    var filtered = getFilteredProducts();
    var parts = [];
    if (hasSearch) parts.push('نتائج البحث عن "<strong>' + state.searchQuery + '</strong>"');
    if (hasFilter) {
      var cat = getCategoryById(state.currentCategoryFilter);
      if (cat) parts.push('داخل <strong>' + cat.emoji + ' ' + cat.name + '</strong>');
    }
    info.style.display = 'flex';
    info.innerHTML = parts.join(' — ') + ' • <strong>' + filtered.length + '</strong> منتج';
  }
  
  // Checkout
  var currentOrder = null, currentInvoiceImageDataUrl = null;
  
  function openCheckoutModal() {
    if (state.cart.length === 0) { alert('السلة فارغة'); return; }
    renderOrderSummary();
    document.getElementById('checkoutOverlay').classList.add('active');
  }
  function closeCheckoutModal() {
    document.getElementById('checkoutOverlay').classList.remove('active');
  }
  function renderOrderSummary() {
    var items = state.cart.map(it => {
      var t = usdToSyp(it.priceUSD * it.quantity);
      return '<div class="order-summary-item"><div><div class="name">' + it.name +
        '</div><div class="qty">' + it.code + ' • ' + it.quantity + ' × ' +
        formatSYP(usdToSyp(it.priceUSD)) + ' ل.س</div></div>' +
        '<div class="price">' + formatSYP(t) + ' ل.س</div></div>';
    }).join('');
    document.getElementById('orderSummaryItems').innerHTML = items;
    var sub = state.cart.reduce((s, i) => s + usdToSyp(i.priceUSD * i.quantity), 0);
    var sh = calculateShipping(sub);
    var tot = sub + sh;
    document.getElementById('orderSummaryTotals').innerHTML =
      '<div class="row"><span>الأصناف:</span><span>' + state.cart.length + '</span></div>' +
      '<div class="row"><span>القطع:</span><span>' + state.cart.reduce((s,i) => s + i.quantity, 0) + '</span></div>' +
      '<div class="row"><span>المجموع الفرعي:</span><span>' + formatSYP(sub) + ' ل.س</span></div>' +
      '<div class="row shipping"><span>الشحن:</span><span>' + (sh === 0 ? 'مجاني ✓' : formatSYP(sh) + ' ل.س') + '</span></div>' +
      '<div class="row grand"><span>الإجمالي:</span><span>' + formatSYP(tot) + ' ل.س</span></div>';
  }
  function validateCheckoutForm() {
    var name = document.getElementById('customerName');
    var phone = document.getElementById('customerPhone');
    var addr = document.getElementById('customerAddress');
    [name, phone, addr].forEach(el => el.classList.remove('error'));
    var ok = true;
    if (!name.value.trim() || name.value.trim().length < 2) { name.classList.add('error'); ok = false; }
    if (!phone.value.trim() || phone.value.trim().length < 8) { phone.classList.add('error'); ok = false; }
    if (!addr.value.trim() || addr.value.trim().length < 5) { addr.classList.add('error'); ok = false; }
    if (!ok) showToast('⚠️ يرجى تعبئة الحقول المطلوبة');
    return ok;
  }
  
  function confirmOrder() {
    if (!validateCheckoutForm()) return;
    var now = new Date();
    var customer = {
      name: document.getElementById('customerName').value.trim(),
      phone: document.getElementById('customerPhone').value.trim(),
      address: document.getElementById('customerAddress').value.trim(),
      notes: document.getElementById('customerNotes').value.trim()
    };
    var sub = state.cart.reduce((s, i) => s + usdToSyp(i.priceUSD * i.quantity), 0);
    var sh = calculateShipping(sub);
    var tot = sub + sh;
    var order = {
      invoiceNumber: generateInvoiceNumber(),
      date: now.toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' }),
      time: now.toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' }),
      timestamp: now.toISOString(),
      customer: customer,
      items: state.cart.map(i => Object.assign({}, i)),
      subtotalSYP: sub, shippingFee: sh, grandTotal: tot,
      exchangeRate: state.exchangeRate,
      itemCount: state.cart.length,
      totalQuantity: state.cart.reduce((s, i) => s + i.quantity, 0),
      costTotalUSD: state.cart.reduce((s, i) => s + (i.costUSD || 0) * i.quantity, 0),
      profitSYP: state.cart.reduce((s, i) => s + usdToSyp((i.priceUSD - (i.costUSD || 0)) * i.quantity), 0)
    };
    currentOrder = order;
  
    // حفظ الطلب في السجل
    order.read = false;
    order.notified = false;
    ordersHistory.push(order);
    persistOrders();

  
    showToast('⏳ جارٍ تحضير الفاتورة...');
    generateInvoiceImage(order).then(dataUrl => {
      currentInvoiceImageDataUrl = dataUrl;
      // إشعار المشرف
      pushNotification('order', '🧾 طلب جديد: ' + order.invoiceNumber,
        'من ' + customer.name + ' — ' + formatSYP(tot) + ' ل.س');
      // تحديث المخزون
      state.cart.forEach(it => {
        var p = getProductById(it.id);
        if (p) p.stock -= it.quantity;
      });
      persistState();
      // فحص المخزون
      checkLowStock();
      // واتساب
      sendWhatsappMessage(order);
      if (dataUrl) {
        setTimeout(() => {
          downloadImage(dataUrl, 'فاتورة-' + order.invoiceNumber + '.png');
          showToast('📥 تم تحميل صورة الفاتورة');
        }, 800);
      }
      state.cart = [];
      persistState();
      renderCart();
      renderCategoriesWithProducts();
      renderCategoryFilterBar();
      closeCheckoutModal();
      var numEl = document.getElementById('successOrderNum');
      if (numEl) numEl.textContent = order.invoiceNumber;
      var imgEl = document.getElementById('invoicePreviewImg');
      if (imgEl && dataUrl) imgEl.src = dataUrl;
      document.getElementById('successOverlay').classList.add('active');
      showToast('✅ تم إرسال الطلب');
    });
  }
  
  function printCustomerInvoice() {
    if (!currentOrder) return;
    renderInvoicePrintTemplate(currentOrder);
    document.body.classList.add('printing-invoice');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-invoice'), 500);
    }, 200);
  }
  
  function downloadCustomerInvoice() {
    if (currentInvoiceImageDataUrl) {
      downloadImage(currentInvoiceImageDataUrl, 'فاتورة-' + currentOrder.invoiceNumber + '.png');
      showToast('📥 تم التحميل');
    } else showToast('⚠️ لا توجد صورة');
  }
  
  function initCustomer() {
    // ربط الأحداث
    var searchInput = document.getElementById('searchInput');
    var clearBtn = document.getElementById('searchClearBtn');
    var searchTimer;
    if (searchInput) {
      searchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          state.searchQuery = e.target.value;
          if (clearBtn) clearBtn.classList.toggle('visible', state.searchQuery.length > 0);
          renderCategoriesWithProducts();
          updateSearchInfo();
        }, 150);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearBtn.classList.remove('visible');
        renderCategoriesWithProducts();
        updateSearchInfo();
      });
    }
  
    document.getElementById('cartBadgeBtn').addEventListener('click', () => {
      document.getElementById('cartSection').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('checkoutBtn').addEventListener('click', openCheckoutModal);
    document.getElementById('checkoutCloseBtn').addEventListener('click', closeCheckoutModal);
    document.getElementById('cancelCheckoutBtn').addEventListener('click', closeCheckoutModal);
    document.getElementById('confirmOrderBtn').addEventListener('click', confirmOrder);
    document.getElementById('closeSuccessBtn').addEventListener('click', () => {
      document.getElementById('successOverlay').classList.remove('active');
      currentOrder = null; currentInvoiceImageDataUrl = null;
    });
    document.getElementById('resendWhatsappBtn').addEventListener('click', () => {
      if (currentOrder) sendWhatsappMessage(currentOrder);
    });
    document.getElementById('printInvoiceBtn').addEventListener('click', printCustomerInvoice);
    document.getElementById('downloadInvoiceBtn').addEventListener('click', downloadCustomerInvoice);
    document.getElementById('checkoutOverlay').addEventListener('click', e => {
      if (e.target.id === 'checkoutOverlay') closeCheckoutModal();
    });
    document.getElementById('successOverlay').addEventListener('click', e => {
      if (e.target.id === 'successOverlay') {
        document.getElementById('successOverlay').classList.remove('active');
        currentOrder = null; currentInvoiceImageDataUrl = null;
      }
    });
  
    document.getElementById('rateBadgeValue').textContent = formatSYP(state.exchangeRate);
    renderCategoryFilterBar();
    renderCategoriesWithProducts();
    renderCart();
    bindCartEvents();
  }
  
  if (document.body.dataset.page === 'customer') {
    document.addEventListener('DOMContentLoaded', initCustomer);
  }