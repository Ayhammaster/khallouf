/* ============================================================
   admin.js — منطق لوحة تحكم المشرف
   ============================================================ */

   function getStockStatus(stock) {
    if (stock <= 0) return { text: '❌ نفذ', cls: 'badge-danger' };
    if (stock <= settings.lowStockThreshold) return { text: '⚠️ منخفض', cls: 'badge-warning' };
    return { text: '✅ متوفر', cls: 'badge' };
  }
  
  function renderCategoryOptions() {
    var sel = document.getElementById('newProductCategory');
    if (!sel) return;
    sel.innerHTML = state.categories.map(c =>
      '<option value="' + c.id + '">' + c.emoji + ' ' + c.name + '</option>').join('');
  }
  
  /* ============================================================
     جدول المنتجات
     ============================================================ */
  function renderProductsTable() {
    var tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;
    if (state.products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">لا توجد منتجات</td></tr>';
      return;
    }
    tbody.innerHTML = state.products.map(p => {
      var cat = getCategoryById(p.categoryId);
      var status = getStockStatus(p.stock);
      var img = p.image || CONFIG.PLACEHOLDER_IMG;
      return '<tr data-id="' + p.id + '" class="' + (p.stock <= 0 ? 'out-of-stock-row' : '') + '">' +
        '<td><img class="table-thumb" src="' + img + '" onerror="this.src=\'' + CONFIG.PLACEHOLDER_IMG + '\'"></td>' +
        '<td><span class="product-code-badge">' + p.code + '</span></td>' +
        '<td>' + p.name + '<div style="font-size:.7rem;color:#1565c0;">≈ ' + formatSYP(usdToSyp(p.priceUSD)) + ' ل.س</div></td>' +
        '<td>' + (cat ? cat.emoji + ' ' + cat.name : '-') + '</td>' +
        '<td><input type="number" class="price-input" value="' + (p.costUSD || 0) + '" step="0.01" min="0" data-cost-id="' + p.id + '"></td>' +
        '<td><input type="number" class="price-input" value="' + p.priceUSD + '" step="0.01" min="0" data-price-id="' + p.id + '"></td>' +
        '<td><input type="number" class="stock-input" value="' + p.stock + '" step="1" min="0" data-stock-id="' + p.id + '"></td>' +
        '<td><span class="' + status.cls + '">' + status.text + '</span></td>' +
        '<td>' +
          '<button class="btn btn-secondary btn-xs" data-change-image="' + p.id + '">🖼️</button> ' +
          '<button class="btn btn-secondary btn-xs" data-restock-id="' + p.id + '">🔄</button> ' +
          '<button class="btn btn-danger btn-xs" data-delete-product="' + p.id + '">🗑️</button>' +
        '</td></tr>';
    }).join('');
  
    tbody.querySelectorAll('[data-cost-id]').forEach(inp => {
      inp.addEventListener('change', e => {
        var p = getProductById(Number(e.target.dataset.costId));
        var v = parseFloat(e.target.value);
        if (p && !isNaN(v) && v >= 0) { p.costUSD = v; persistState(); showToast('✓ تم تحديث سعر الشراء'); }
      });
    });
    tbody.querySelectorAll('[data-price-id]').forEach(inp => {
      inp.addEventListener('change', e => {
        var id = Number(e.target.dataset.priceId);
        var p = getProductById(id);
        var v = parseFloat(e.target.value);
        if (p && !isNaN(v) && v >= 0) {
          p.priceUSD = v;
          state.cart.forEach(ci => { if (ci.id === id) ci.priceUSD = v; });
          persistState();
          renderProductsTable(); renderCart();
          showToast('✓ تم تحديث السعر');
        }
      });
    });
    tbody.querySelectorAll('[data-stock-id]').forEach(inp => {
      inp.addEventListener('change', e => {
        var id = Number(e.target.dataset.stockId);
        var p = getProductById(id);
        var v = parseInt(e.target.value);
        if (p && !isNaN(v) && v >= 0) {
          p.stock = v; persistState();
          renderProductsTable();
          showToast('✓ تم تحديث المخزون');
        }
      });
    });
    tbody.querySelectorAll('[data-change-image]').forEach(btn => {
      btn.addEventListener('click', () => changeProductImage(Number(btn.dataset.changeImage)));
    });
    tbody.querySelectorAll('[data-restock-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        var p = getProductById(Number(btn.dataset.restockId));
        if (p) {
          p.stock += 50; persistState();
          renderProductsTable();
          showToast('🔄 +50 وحدة');
        }
      });
    });
    tbody.querySelectorAll('[data-delete-product]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('حذف المنتج نهائياً؟')) return;
        var id = Number(btn.dataset.deleteProduct);
        state.products = state.products.filter(p => p.id !== id);
        state.cart = state.cart.filter(i => i.id !== id);
        persistState();
        renderProductsTable();
        showToast('🗑️ تم الحذف');
      });
    });
  }
  
  function changeProductImage(productId) {
    var p = getProductById(productId);
    if (!p) return;
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = e => {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = ev => {
        p.image = ev.target.result; persistState();
        renderProductsTable();
        showToast('🖼️ تم تحديث الصورة');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
  
  var newProductImageData = null;
  function setupProductForm() {
    document.getElementById('newProductImage')?.addEventListener('change', e => {
      var file = e.target.files[0];
      if (!file) return;
      var r = new FileReader();
      r.onload = ev => {
        newProductImageData = ev.target.result;
        var prev = document.getElementById('newProductImagePreview');
        if (prev) { prev.src = newProductImageData; prev.classList.add('visible'); }
      };
      r.readAsDataURL(file);
    });
  
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
      var name = document.getElementById('newProductName').value.trim();
      var unit = document.getElementById('newProductUnit').value.trim();
      var costUSD = parseFloat(document.getElementById('newProductCost').value) || 0;
      var priceUSD = parseFloat(document.getElementById('newProductPrice').value);
      var stock = parseInt(document.getElementById('newProductStock').value) || 0;
      var categoryId = document.getElementById('newProductCategory').value;
      var code = document.getElementById('newProductCode').value.trim().toUpperCase();
      if (!code || code === 'AUTO') code = generateProductCode();
      else if (state.products.some(p => p.code === code)) {
        alert('الكود مستخدم! سيتم توليد كود جديد');
        code = generateProductCode();
      }
      if (!name || !unit || isNaN(priceUSD) || priceUSD < 0 || !categoryId) {
        alert('الرجاء تعبئة جميع الحقول'); return;
      }
      state.products.push({
        id: nextProductId(), code, name, unit,
        costUSD, priceUSD, stock, categoryId,
        image: newProductImageData || CONFIG.PLACEHOLDER_IMG
      });
      persistState();
      ['newProductName', 'newProductUnit', 'newProductCost', 'newProductPrice', 'newProductCode']
        .forEach(id => { var el = document.getElementById(id); if (el) el.value = ''; });
      document.getElementById('newProductStock').value = '100';
      document.getElementById('newProductImage').value = '';
      var prev = document.getElementById('newProductImagePreview');
      if (prev) prev.classList.remove('visible');
      newProductImageData = null;
      renderProductsTable();
      showToast('✓ تمت إضافة ' + name);
    });
  }
  
  function renderCategoriesTable() {
    var tbody = document.querySelector('#categoriesTable tbody');
    if (!tbody) return;
    if (state.categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا توجد فئات</td></tr>';
      return;
    }
    tbody.innerHTML = state.categories.map(c => {
      var count = state.products.filter(p => p.categoryId === c.id).length;
      return '<tr><td style="font-size:1.4rem;">' + c.emoji + '</td>' +
        '<td>' + c.name + '</td><td>' + count + ' منتج</td>' +
        '<td><button class="btn btn-danger btn-sm" data-delete-cat="' + c.id + '">🗑️</button></td></tr>';
    }).join('');
    tbody.querySelectorAll('[data-delete-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        var id = btn.dataset.deleteCat;
        if (state.products.some(p => p.categoryId === id)) {
          alert('الفئة تحتوي منتجات'); return;
        }
        if (!confirm('حذف الفئة؟')) return;
        state.categories = state.categories.filter(c => c.id !== id);
        persistState();
        renderCategoriesTable();
        renderCategoryOptions();
        showToast('🗑️ تم الحذف');
      });
    });
  }
  
  function setupCategoryForm() {
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
      var name = document.getElementById('newCategoryName').value.trim();
      var emoji = document.getElementById('newCategoryEmoji').value.trim() || '🗂️';
      if (!name) { alert('أدخل اسم الفئة'); return; }
      state.categories.push({ id: 'cat_' + Date.now(), name, emoji });
      persistState();
      document.getElementById('newCategoryName').value = '';
      document.getElementById('newCategoryEmoji').value = '';
      renderCategoriesTable();
      renderCategoryOptions();
      showToast('✓ تمت إضافة ' + name);
    });
  }
  
  function setupRateTab() {
    var input = document.getElementById('exchangeRateInput');
    var preview = document.getElementById('ratePreview');
    function updatePreview() {
      var rate = parseFloat(input.value) || 0;
      if (preview) preview.innerHTML = 'منتج بـ <strong>1.00$</strong> = <strong>' + formatSYP(rate) + ' ل.س</strong>';
    }
    input?.addEventListener('input', updatePreview);
    updatePreview();
    document.getElementById('saveRateBtn')?.addEventListener('click', () => {
      var rate = parseFloat(input.value);
      if (isNaN(rate) || rate <= 0) { alert('أدخل سعراً صحيحاً'); return; }
      state.exchangeRate = rate;
      persistState();
      var badge = document.getElementById('rateBadgeValue');
      if (badge) badge.textContent = formatSYP(rate);
      renderProductsTable();
      updatePreview();
      showToast('💱 تم تحديث سعر الصرف');
    });
  }
  
  function setupShippingTab() {
    document.getElementById('saveShippingBtn')?.addEventListener('click', () => {
      var t = parseFloat(document.getElementById('shippingThresholdInput').value);
      var f = parseFloat(document.getElementById('shippingFeeInput').value);
      if (isNaN(t) || t < 0 || isNaN(f) || f < 0) { alert('قيم غير صحيحة'); return; }
      state.shipping.threshold = t;
      state.shipping.fee = f;
      persistState();
      showToast('🚚 تم حفظ إعدادات الشحن');
    });
    var th = document.getElementById('shippingThresholdInput');
    var fe = document.getElementById('shippingFeeInput');
    if (th) th.value = state.shipping.threshold;
    if (fe) fe.value = state.shipping.fee;
  }
  
  function setupSettingsTab() {
    var wa = document.getElementById('whatsappNumberInput');
    var ls = document.getElementById('lowStockInput');
    if (wa) wa.value = settings.whatsappNumber;
    if (ls) ls.value = settings.lowStockThreshold;
  
    document.getElementById('saveWhatsappBtn')?.addEventListener('click', () => {
      var v = wa.value.trim();
      if (!/^\d{8,15}$/.test(v)) { alert('رقم غير صحيح (أرقام فقط مع رمز الدولة)'); return; }
      settings.whatsappNumber = v;
      persistSettings();
      showToast('📱 تم حفظ رقم الواتساب');
    });
    document.getElementById('saveNotifBtn')?.addEventListener('click', () => {
      var v = parseInt(ls.value);
      if (isNaN(v) || v < 0) { alert('قيمة غير صحيحة'); return; }
      settings.lowStockThreshold = v;
      persistSettings();
      showToast('🔔 تم حفظ إعدادات الإشعارات');
    });
  }
  
  function setupInvoiceDesigner() {
    var map = [
      ['invStoreName', 'storeName'], ['invStoreTagline', 'storeTagline'],
      ['invStorePhone', 'storePhone'], ['invStoreAddress', 'storeAddress'],
      ['invLogoText', 'logoText'], ['invAccentColor', 'accentColor'],
      ['invDarkColor', 'darkColor'], ['invTitle', 'title'],
      ['invNote', 'note'], ['invThanks', 'thanks'],
      ['invFooterSub', 'footerSub'], ['invPaymentMethod', 'paymentMethod']
    ];
    map.forEach(([id, prop]) => {
      var el = document.getElementById(id);
      if (!el) return;
      el.value = invoiceDesign[prop] || '';
      el.addEventListener('input', () => {
        invoiceDesign[prop] = el.value;
        renderDesignerPreview();
      });
    });
    var toggles = [
      ['invShowLogo', 'showLogo'], ['invShowCustomer', 'showCustomer'],
      ['invShowCode', 'showCode'], ['invShowUnit', 'showUnit'],
      ['invShowUSD', 'showUSD'], ['invShowNotes', 'showNotes'],
      ['invShowSummary', 'showSummary'], ['invShowFooter', 'showFooter']
    ];
    toggles.forEach(([id, prop]) => {
      var el = document.getElementById(id);
      if (!el) return;
      el.checked = !!invoiceDesign[prop];
      el.addEventListener('change', () => {
        invoiceDesign[prop] = el.checked;
        renderDesignerPreview();
      });
    });
    document.getElementById('invLogoImage')?.addEventListener('change', e => {
      var file = e.target.files[0];
      if (!file) return;
      var r = new FileReader();
      r.onload = ev => { invoiceDesign.logoImage = ev.target.result; renderDesignerPreview(); };
      r.readAsDataURL(file);
    });
    document.getElementById('saveDesignBtn')?.addEventListener('click', () => {
      persistInvoiceDesign();
      renderDesignerPreview();
      showToast('💾 تم حفظ التصميم');
    });
    document.getElementById('resetDesignBtn')?.addEventListener('click', () => {
      if (!confirm('استعادة التصميم الافتراضي؟')) return;
      invoiceDesign = JSON.parse(JSON.stringify(CONFIG.DEFAULT_DESIGN));
      persistInvoiceDesign();
      location.reload();
    });
    renderDesignerPreview();
  }
  
  function setupNotifsTab() {
    renderNotifsList();
    updateNotifBadge();
    document.getElementById('clearNotifsBtn')?.addEventListener('click', () => {
      if (!confirm('مسح جميع الإشعارات؟')) return;
      notifications = [];
      persistNotifs();
      updateNotifBadge();
      renderNotifsList();
      showToast('🗑️ تم المسح');
    });
    document.getElementById('printNotifsBtn')?.addEventListener('click', printNotifications);
    document.getElementById('notifBtn')?.addEventListener('click', () => {
      document.getElementById('notifOverlay').classList.add('active');
      markAllRead();
      var box = document.getElementById('notifModalList');
      if (box) {
        if (notifications.length === 0) box.innerHTML = '<div class="empty-cart-msg">لا توجد إشعارات</div>';
        else box.innerHTML = notifications.slice(0, 20).map(n =>
          '<div class="notif-item"><div class="notif-content">' +
          '<strong>' + escapeHtml(n.title) + '</strong>' +
          '<p>' + escapeHtml(n.message) + '</p>' +
          '<small>' + new Date(n.date).toLocaleString('ar-EG') + '</small>' +
          '</div></div>').join('');
      }
    });
    document.getElementById('notifCloseBtn')?.addEventListener('click', () => {
      document.getElementById('notifOverlay').classList.remove('active');
    });
  }
  
  /* ============================================================
     سجل الطلبات — عرض + طباعة + حذف + وسم كمقروء
     ============================================================ */
  
  function renderOrdersTable() {
    var tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;
    if (ordersHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">لا توجد طلبات</td></tr>';
      updateOrdersBadge();
      return;
    }
    tbody.innerHTML = ordersHistory.slice().reverse().map(o => {
      var rowClass = o.read ? '' : 'order-unread';
      var readLabel = o.read ? '' : ' <span class="badge-new">جديد</span>';
      return '<tr class="' + rowClass + '" data-order-inv="' + o.invoiceNumber + '">' +
        '<td>' + o.invoiceNumber + readLabel + '</td>' +
        '<td>' + (o.date || '—') + '<div style="font-size:.7rem;color:#8899aa;">' + (o.time || '') + '</div></td>' +
        '<td>' + escapeHtml(o.customer?.name || '—') + '</td>' +
        '<td>' + escapeHtml(o.customer?.phone || '—') + '</td>' +
        '<td>' + formatSYP(o.grandTotal) + ' ل.س</td>' +
        '<td><span class="' + (o.read ? 'badge' : 'badge-warning') + '">' +
          (o.read ? '✅ مقروء' : '🔵 غير مقروء') + '</span></td>' +
        '<td>' +
          '<button class="btn btn-secondary btn-xs" data-view-order="' + o.invoiceNumber + '">👁️</button> ' +
          '<button class="btn btn-print btn-xs" data-print-order="' + o.invoiceNumber + '">🖨️</button> ' +
          '<button class="btn btn-danger btn-xs" data-delete-order="' + o.invoiceNumber + '">🗑️</button>' +
        '</td></tr>';
    }).join('');
  
    tbody.querySelectorAll('[data-view-order]').forEach(btn => {
      btn.addEventListener('click', () => viewOrder(btn.dataset.viewOrder));
    });
    tbody.querySelectorAll('[data-print-order]').forEach(btn => {
      btn.addEventListener('click', () => printOrder(btn.dataset.printOrder));
    });
    tbody.querySelectorAll('[data-delete-order]').forEach(btn => {
      btn.addEventListener('click', () => deleteOrder(btn.dataset.deleteOrder));
    });
  
    updateOrdersBadge();
  }
  
  function updateOrdersBadge() {
    var unreadCount = ordersHistory.filter(o => !o.read).length;
  
    var tabBtn = document.querySelector('.tab-btn[data-tab="ordersTab"]');
    if (tabBtn) {
      var existing = tabBtn.querySelector('.badge-new');
      if (existing) existing.remove();
      if (unreadCount > 0) {
        tabBtn.insertAdjacentHTML('beforeend', ' <span class="badge-new">' + unreadCount + '</span>');
      }
    }
    var headerBadge = document.getElementById('ordersCountBadge');
    if (headerBadge) {
      headerBadge.textContent = unreadCount;
      headerBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
  }
  
  function markOrderRead(inv) {
    var o = ordersHistory.find(x => x.invoiceNumber === inv);
    if (!o || o.read) return;
    o.read = true;
    persistOrders();
    renderOrdersTable();
  }
  
  function viewOrder(inv) {
    var o = ordersHistory.find(x => x.invoiceNumber === inv);
    if (!o) return;
    markOrderRead(inv);
    renderInvoicePrintTemplate(o);
    document.body.classList.add('printing-invoice');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-invoice'), 500);
    }, 200);
  }
  
  function printOrder(inv) {
    var o = ordersHistory.find(x => x.invoiceNumber === inv);
    if (!o) return;
    markOrderRead(inv);
    renderInvoicePrintTemplate(o);
    document.body.classList.add('printing-invoice');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-invoice'), 500);
    }, 200);
  }
  
  function deleteOrder(inv) {
    if (!confirm('حذف الطلب ' + inv + ' نهائياً؟')) return;
    ordersHistory = ordersHistory.filter(o => o.invoiceNumber !== inv);
    persistOrders();
    renderOrdersTable();
    renderStats();
    showToast('🗑️ تم حذف الطلب');
  }
  
  function printAllOrders() {
    if (ordersHistory.length === 0) {
      showToast('⚠️ لا توجد طلبات للطباعة');
      return;
    }
    var area = document.getElementById('notifsPrintArea');
    if (!area) return;
  
    var rows = ordersHistory.slice().reverse().map((o, i) => {
      var st = o.read
        ? '<span style="color:#2e7d32;">✅ مقروء</span>'
        : '<span style="color:#e65100;font-weight:800;">🔵 غير مقروء</span>';
      return '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + o.invoiceNumber + '</td>' +
        '<td>' + (o.date || '—') + '<br><small>' + (o.time || '') + '</small></td>' +
        '<td>' + escapeHtml(o.customer?.name || '—') + '<br><small>' + escapeHtml(o.customer?.phone || '') + '</small></td>' +
        '<td>' + escapeHtml(o.customer?.address || '—') + '</td>' +
        '<td style="text-align:left;">' + formatSYP(o.grandTotal) + ' ل.س</td>' +
        '<td>' + st + '</td>' +
        '</tr>';
    }).join('');
  
    var totalRevenue = ordersHistory.reduce((s, o) => s + (o.grandTotal || 0), 0);
    var unreadCount = ordersHistory.filter(o => !o.read).length;
  
    var style = '<style>' +
      '@page{size:A4;margin:10mm;}' +
      '#notifsPrintArea{font-family:system-ui,sans-serif;direction:rtl;}' +
      '#notifsPrintArea h1{color:' + invoiceDesign.accentColor + ';font-size:16pt;margin-bottom:4px;}' +
      '#notifsPrintArea .meta{font-size:9pt;color:#555;margin-bottom:12px;}' +
      '#notifsPrintArea .summary{display:flex;gap:20px;background:#f4f6f8;padding:8px 12px;border-radius:8px;margin-bottom:12px;font-size:9pt;}' +
      '#notifsPrintArea .summary strong{color:' + invoiceDesign.accentColor + ';font-size:11pt;}' +
      '#notifsPrintArea table{width:100%;border-collapse:collapse;font-size:8.5pt;}' +
      '#notifsPrintArea th,#notifsPrintArea td{border:1px solid #999;padding:5px;text-align:right;vertical-align:top;}' +
      '#notifsPrintArea th{background:' + invoiceDesign.darkColor + ';color:#fff;font-weight:700;}' +
      '#notifsPrintArea tbody tr:nth-child(even) td{background:#f9fbfd;}' +
      '</style>';
  
    area.innerHTML = style +
      '<h1>📋 ' + escapeHtml(invoiceDesign.storeName) + ' — سجل الطلبات</h1>' +
      '<div class="meta">تاريخ الطباعة: ' + new Date().toLocaleString('ar-EG') + '</div>' +
      '<div class="summary">' +
        '<span>إجمالي الطلبات: <strong>' + ordersHistory.length + '</strong></span>' +
        '<span>الطلبات غير المقروءة: <strong style="color:#e65100;">' + unreadCount + '</strong></span>' +
        '<span>إجمالي الإيرادات: <strong>' + formatSYP(totalRevenue) + ' ل.س</strong></span>' +
      '</div>' +
      '<table><thead><tr>' +
        '<th>#</th><th>رقم الطلب</th><th>التاريخ</th><th>الزبون</th>' +
        '<th>العنوان</th><th>الإجمالي</th><th>الحالة</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  
    document.body.classList.add('printing-notifs');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-notifs');
        area.innerHTML = '';
      }, 500);
    }, 150);
  }
  
  /* ============================================================
     التبويبات + التهيئة النهائية
     ============================================================ */
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        var tab = document.getElementById(btn.dataset.tab);
        if (tab) tab.classList.add('active');
  
        if (btn.dataset.tab === 'statsTab') renderStats();
        if (btn.dataset.tab === 'priceListTab') { renderPriceListCategoryFilter(); renderPriceListPreview(); }
        if (btn.dataset.tab === 'ordersTab') renderOrdersTable();
      });
    });
  }
  
  function initAdmin() {
    var badge = document.getElementById('rateBadgeValue');
    if (badge) badge.textContent = formatSYP(state.exchangeRate);
  
    renderCategoryOptions();
    renderProductsTable();
    renderCategoriesTable();
  
    setupTabs();
    setupProductForm();
    setupCategoryForm();
    setupRateTab();
    setupShippingTab();
    setupSettingsTab();
    setupInvoiceDesigner();
    setupPriceList();
    setupStats();
    setupNotifsTab();
    renderOrdersTable();
    updateOrdersBadge();
    checkLowStock();
  
    /* أزرار سجل الطلبات */
    document.getElementById('printAllOrdersBtn')?.addEventListener('click', printAllOrders);
  
    document.getElementById('deleteAllOrdersBtn')?.addEventListener('click', () => {
      if (!confirm('حذف كل الطلبات نهائياً؟ لا يمكن التراجع!')) return;
      if (!confirm('تأكيد أخير: سيتم حذف ' + ordersHistory.length + ' طلب!')) return;
      ordersHistory = [];
      persistOrders();
      renderOrdersTable();
      renderStats();
      showToast('🗑️ تم حذف كل الطلبات');
    });
  
    document.getElementById('markAllReadBtn')?.addEventListener('click', () => {
      ordersHistory.forEach(o => o.read = true);
      persistOrders();
      renderOrdersTable();
      showToast('✅ تم وسم كل الطلبات كمقروءة');
    });
  
    document.getElementById('ordersQuickBtn')?.addEventListener('click', e => {
      e.preventDefault();
      var tabBtn = document.querySelector('.tab-btn[data-tab="ordersTab"]');
      if (tabBtn) tabBtn.click();
      document.getElementById('adminPanel').scrollIntoView({ behavior: 'smooth' });
    });
  
    /* زر كتم/تشغيل الصوت */
    document.getElementById('soundToggleBtn')?.addEventListener('click', function () {
      AudioNotifier.enabled = !AudioNotifier.enabled;
      this.textContent = AudioNotifier.enabled ? '🔊' : '🔇';
      showToast(AudioNotifier.enabled ? '🔊 الصوت مفعّل' : '🔇 الصوت مكتوم');
    });
  
    /* فحص دوري احتياطي للطلبات الجديدة */
    setInterval(() => {
      var stored = Storage.get(CONFIG.STORAGE_KEYS.ORDERS, []);
      if (stored.length > ordersHistory.length) {
        ordersHistory = stored;
        renderOrdersTable();
        renderStats();
        showToast('🔔 طلب جديد وصل!');
      }
    }, 5000);
  }