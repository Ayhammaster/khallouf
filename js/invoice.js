/* ============================================================
   invoice.js — توليد الفاتورة، المعاينة، الصورة، والواتساب
   ============================================================ */

/* ---------- ضمان وجود حاوية الفاتورة ---------- */
function ensureInvoiceTemplateExists() {
    var tpl = document.getElementById('invoicePrintTemplate');
    if (tpl) return tpl;
  
    var wrapper = document.getElementById('invoiceTemplateWrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'invoiceTemplateWrapper';
      wrapper.className = 'invoice-template-wrapper';
      document.body.appendChild(wrapper);
    }
  
    tpl = document.createElement('div');
    tpl.id = 'invoicePrintTemplate';
    tpl.className = 'invoice-print-template';
    wrapper.appendChild(tpl);
    return tpl;
  }
  
  /* ---------- توليد HTML الفاتورة ---------- */
  function generateInvoiceHTML(order) {
    var d = invoiceDesign;
    var c = order.customer || { name: '—', phone: '—', address: '—', notes: '' };
    var items = order.items || [];
    var subtotalSYP = order.subtotalSYP || 0;
    var shippingFee = order.shippingFee || 0;
    var grandTotal = order.grandTotal || 0;
    var itemCount = order.itemCount || items.length;
    var totalQty = order.totalQuantity || items.reduce((s, i) => s + i.quantity, 0);
  
    var rows = items.map((it, i) => {
      var cells = '<td>' + (i + 1) + '</td>';
      if (d.showCode) cells += '<td class="code-cell">' + it.code + '</td>';
      var name = it.name;
      if (d.showUnit) name += '<div style="font-size:.68rem;color:#8899aa;">' + it.unit + '</div>';
      cells += '<td>' + name + '</td>';
      cells += '<td class="num">' + it.quantity + '</td>';
      if (d.showUSD) cells += '<td class="num">' + formatUSD(it.priceUSD) + ' $</td>';
      cells += '<td class="num">' + formatSYP(usdToSyp(it.priceUSD)) + ' ل.س</td>';
      cells += '<td class="num" style="font-weight:800;color:' + d.accentColor + ';">' +
        formatSYP(usdToSyp(it.priceUSD * it.quantity)) + ' ل.س</td>';
      return '<tr>' + cells + '</tr>';
    }).join('');
  
    var logoBlock = d.showLogo
      ? '<div class="ipt-logo-area">' +
          (d.logoImage
            ? '<img src="' + d.logoImage + '" style="width:56px;height:56px;border-radius:14px;object-fit:cover;">'
            : '<div class="ipt-logo-icon">' + (d.logoText || '🛒') + '</div>') +
          '<div class="ipt-logo-text"><h2>' + d.storeName + '</h2>' +
          '<p>' + d.storeTagline + '</p>' +
          '<p>📍 ' + d.storeAddress + ' | 📞 ' + d.storePhone + '</p></div></div>'
      : '<div></div>';
  
    var custBlock = d.showCustomer
      ? '<div class="ipt-customer"><h4>🧑 بيانات الزبون</h4>' +
        '<p><strong>الاسم:</strong> ' + c.name + '</p>' +
        '<p><strong>الهاتف:</strong> ' + c.phone + '</p>' +
        '<p><strong>العنوان:</strong> ' + c.address + '</p>' +
        '<p><strong>طريقة الدفع:</strong> ' + d.paymentMethod + '</p>' +
        ((d.showNotes && c.notes) ? '<p style="grid-column:1/-1;"><strong>ملاحظات:</strong> ' + c.notes + '</p>' : '') +
        '</div>' : '';
  
    var summaryBlock = d.showSummary
      ? '<div class="ipt-totals">' +
        '<div class="ipt-totals-row"><span>عدد الأصناف:</span><span>' + itemCount + ' صنف</span></div>' +
        '<div class="ipt-totals-row"><span>إجمالي القطع:</span><span>' + totalQty + ' قطعة</span></div>' +
        '<div class="ipt-totals-row"><span>المجموع الفرعي:</span><span>' + formatSYP(subtotalSYP) + ' ل.س</span></div>' +
        '<div class="ipt-totals-row"><span>الشحن:</span><span>' + (shippingFee === 0 ? 'مجاني ✓' : formatSYP(shippingFee) + ' ل.س') + '</span></div>' +
        '<div class="ipt-totals-row grand"><span>المجموع الكلي:</span><span>' + formatSYP(grandTotal) + ' ل.س</span></div>' +
        '</div>' : '';
  
    var noteBlock = d.note ? '<div class="ipt-note">' + d.note + '</div>' : '';
  
    var footerBlock = d.showFooter
      ? '<div class="ipt-footer"><div class="thanks">' + d.thanks + '</div>' +
        '<p>' + d.footerSub + '</p>' +
        '<p style="margin-top:4px;font-size:.7rem;color:#8899aa;">فاتورة إلكترونية — ' +
        (order.invoiceNumber || 'PREVIEW') + '</p></div>' : '';
  
    return '<div style="--inv-accent:' + d.accentColor + ';--inv-dark:' + d.darkColor + ';">' +
      '<div class="ipt-header">' + logoBlock +
        '<div class="ipt-meta"><h1>' + d.title + '</h1>' +
        '<p>رقم الفاتورة: <strong>' + (order.invoiceNumber || 'PREVIEW') + '</strong></p>' +
        '<p>التاريخ: <strong>' + (order.date || '—') + '</strong></p>' +
        '<p>الوقت: <strong>' + (order.time || '—') + '</strong></p></div></div>' +
      custBlock +
      '<table class="ipt-table"><thead><tr><th>#</th>' +
        (d.showCode ? '<th>الكود</th>' : '') +
        '<th>المنتج</th><th>الكمية</th>' +
        (d.showUSD ? '<th>السعر ($)</th>' : '') +
        '<th>السعر (ل.س)</th><th>الإجمالي (ل.س)</th>' +
      '</tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr><td colspan="' + (d.showCode ? 2 : 1) + '">الإجمالي</td>' +
      '<td class="num">' + totalQty + '</td>' +
      '<td colspan="' + (d.showUSD ? 3 : 2) + '"></td>' +
      '<td class="num" style="color:' + d.accentColor + ';">' + formatSYP(subtotalSYP) + ' ل.س</td>' +
      '</tr></tfoot></table>' +
      summaryBlock + noteBlock + footerBlock + '</div>';
  }
  
  /* ---------- بناء طلب معاينة ---------- */
  function buildPreviewOrder() {
    var items, subtotal;
    if (state.cart.length > 0) {
      items = state.cart.map(i => Object.assign({}, i));
    } else {
      items = [
        { code: 'MK-ADM-0001', name: 'عدس أحمر', unit: 'كيس 1 كجم', priceUSD: 0.85, quantity: 2 },
        { code: 'MK-ADM-0005', name: 'فول مدمس', unit: 'علبة 400 جم', priceUSD: 0.50, quantity: 3 }
      ];
    }
    subtotal = items.reduce((s, i) => s + usdToSyp(i.priceUSD * i.quantity), 0);
    var shippingFee = calculateShipping(subtotal);
    return {
      invoiceNumber: 'PREVIEW',
      date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      customer: { name: 'اسم تجريبي', phone: '0992 000 000', address: 'سوريا - دمشق', notes: 'ملاحظة' },
      items: items,
      subtotalSYP: subtotal,
      shippingFee: shippingFee,
      grandTotal: subtotal + shippingFee,
      itemCount: items.length,
      totalQuantity: items.reduce((s, i) => s + i.quantity, 0)
    };
  }
  
  /* ---------- معاينة المصمم ---------- */
  function renderDesignerPreview() {
    var el = document.getElementById('designerPreviewTemplate');
    if (el) el.innerHTML = generateInvoiceHTML(buildPreviewOrder());
  }
  
  /* ---------- تعبئة قالب الطباعة ---------- */
  function renderInvoicePrintTemplate(order) {
    var tpl = ensureInvoiceTemplateExists();
    tpl.innerHTML = generateInvoiceHTML(order);
  }
  
  /* ---------- توليد صورة الفاتورة ---------- */
  function generateInvoiceImage(order) {
    var tpl = ensureInvoiceTemplateExists();
    tpl.innerHTML = generateInvoiceHTML(order);
  
    return new Promise(resolve => {
      setTimeout(() => {
        if (typeof html2canvas !== 'function') {
          console.error('html2canvas غير محمّلة');
          resolve(null);
          return;
        }
        html2canvas(tpl, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: 800
        })
          .then(cv => resolve(cv.toDataURL('image/png')))
          .catch(err => { console.error('html2canvas error:', err); resolve(null); });
      }, 300);
    });
  }
  
  /* ---------- بناء رسالة الواتساب ---------- */
  function buildWhatsappMessage(order) {
    var c = order.customer;
    var msg = '🛒 *' + invoiceDesign.storeName + '*\n━━━━━━━━━━━━━━━━━━━━\n';
    msg += '🧾 *' + invoiceDesign.title + ' طلب جديد*\n━━━━━━━━━━━━━━━━━━━━\n\n';
    msg += '📋 *رقم الطلب:* ' + order.invoiceNumber + '\n';
    msg += '📅 *التاريخ:* ' + order.date + '\n';
    msg += '⏰ *الوقت:* ' + order.time + '\n\n';
    msg += '👤 *بيانات الزبون*\n▪️ الاسم: ' + c.name + '\n▪️ الهاتف: ' + c.phone +
      '\n▪️ العنوان: ' + c.address + '\n';
    if (c.notes) msg += '▪️ ملاحظات: ' + c.notes + '\n';
    msg += '\n📦 *تفاصيل الأصناف*\n━━━━━━━━━━━━━━━━━━━━\n\n';
    order.items.forEach((it, i) => {
      msg += (i + 1) + '. *' + it.name + '* × ' + it.quantity + '\n';
      msg += '   🔖 ' + it.code + ' | 📏 ' + it.unit + '\n';
      msg += '   💰 ' + formatSYP(usdToSyp(it.priceUSD * it.quantity)) + ' ل.س\n\n';
    });
    msg += '━━━━━━━━━━━━━━━━━━━━\n';
    msg += '📦 عدد الأصناف: *' + order.itemCount + '*\n';
    msg += '🔢 إجمالي القطع: *' + order.totalQuantity + '*\n\n';
    msg += '💵 المجموع الفرعي: *' + formatSYP(order.subtotalSYP) + ' ل.س*\n';
    msg += '🚚 الشحن: *' + (order.shippingFee === 0 ? 'مجاني ✓' : formatSYP(order.shippingFee) + ' ل.س') + '*\n';
    msg += '━━━━━━━━━━━━━━━━━━━━\n';
    msg += '💰 *المجموع الكلي: ' + formatSYP(order.grandTotal) + ' ل.س*\n';
    msg += '━━━━━━━━━━━━━━━━━━━━\n\n';
    msg += '💳 *طريقة الدفع:* ' + invoiceDesign.paymentMethod + '\n\n';
    msg += '🙏 شكراً لتسوقكم من ' + invoiceDesign.storeName;
    return msg;
  }
  
  /* ---------- إرسال رسالة الواتساب ---------- */
  function sendWhatsappMessage(order) {
    var msg = buildWhatsappMessage(order);
    var phone = settings.whatsappNumber || CONFIG.STORE_WHATSAPP_DEFAULT;
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
  }