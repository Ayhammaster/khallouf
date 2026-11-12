var priceListState = {
    category: 'all',
    fontSize: 8,
    paper: 'A4',
    footerNote: 'الأسعار سارية حتى إشعار آخر — ماركت أدم'
  };
  
  function getPriceListRows() {
    var rows = state.products.filter(p => p.stock > 0);
    if (priceListState.category !== 'all')
      rows = rows.filter(p => p.categoryId === priceListState.category);
    return rows.map(p => {
      var cat = getCategoryById(p.categoryId);
      return {
        code: p.code, name: p.name, unit: p.unit,
        category: cat ? cat.name : '', stock: p.stock,
        priceUSD: p.priceUSD, priceSYP: usdToSyp(p.priceUSD)
      };
    });
  }
  
  function buildPriceListHTML(rows) {
    var head = '<div class="pl-head">' +
      '<div><h2>' + invoiceDesign.storeName + ' <span>— لائحة الأسعار</span></h2>' +
      '<div style="font-size:.62rem;color:#666;">' + invoiceDesign.storeTagline +
      ' • 📞 ' + invoiceDesign.storePhone + '</div></div>' +
      '<div class="meta">' +
      '<div>التاريخ: <strong>' + new Date().toLocaleDateString('ar-EG') + '</strong></div>' +
      '<div>سعر الصرف: <strong>1$ = ' + formatSYP(state.exchangeRate) + ' ل.س</strong></div>' +
      '<div>المواد: <strong>' + rows.length + '</strong></div>' +
      '</div></div>';
    var thead = '<thead><tr><th style="width:34px;">#</th><th style="width:70px;">الكود</th>' +
      '<th>اسم المادة</th><th style="width:80px;">الفئة</th>' +
      '<th style="width:80px;">الوحدة</th><th style="width:80px;">السعر (ل.س)</th></tr></thead>';
    var body = rows.map((r, i) =>
      '<tr><td>' + (i+1) + '</td><td class="code">' + r.code + '</td>' +
      '<td class="name">' + r.name + '</td><td class="unit">' + r.category + '</td>' +
      '<td class="unit">' + r.unit + '</td>' +
      '<td class="price">' + formatSYP(r.priceSYP) + '</td></tr>').join('');
    var foot = '<div class="pl-foot"><span>' + priceListState.footerNote + '</span>' +
      '<span>' + invoiceDesign.storeAddress + ' • ' + invoiceDesign.storePhone + '</span></div>';
    return '<div class="pl-doc">' + head +
      '<table class="pl-table">' + thead + '<tbody>' + body + '</tbody></table>' + foot + '</div>';
  }
  
  function renderPriceListPreview() {
    var rows = getPriceListRows();
    var box = document.getElementById('priceListPreview');
    if (!box) return;
    box.style.setProperty('--pl-fs', priceListState.fontSize + 'pt');
    box.innerHTML = buildPriceListHTML(rows);
  }
  
  function renderPriceListCategoryFilter() {
    var sel = document.getElementById('plCategoryFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="all">كل الفئات</option>' +
      state.categories.map(c => '<option value="' + c.id + '">' + c.emoji + ' ' + c.name + '</option>').join('');
    sel.value = priceListState.category;
  }
  
  function printPriceList() {
    var rows = getPriceListRows();
    if (rows.length === 0) { showToast('⚠️ لا توجد مواد'); return; }
    var area = document.getElementById('priceListPrintArea');
    var style = '<style>' +
      '@page { size: ' + priceListState.paper + '; margin: 6mm; }' +
      '#priceListPrintArea .pl-head{display:flex;justify-content:space-between;border-bottom:2px solid ' + invoiceDesign.accentColor + ';padding-bottom:4px;margin-bottom:6px;}' +
      '#priceListPrintArea .pl-head h2{margin:0;font-size:12pt;color:' + invoiceDesign.darkColor + ';}' +
      '#priceListPrintArea .pl-head h2 span{color:' + invoiceDesign.accentColor + ';}' +
      '#priceListPrintArea .pl-head .meta{text-align:left;font-size:7pt;line-height:1.4;}' +
      '#priceListPrintArea .pl-table{width:100%;border-collapse:collapse;font-size:' + priceListState.fontSize + 'pt;}' +
      '#priceListPrintArea .pl-table th,#priceListPrintArea .pl-table td{border:1px solid #888;padding:1px 3px;line-height:1.2;}' +
      '#priceListPrintArea .pl-table th{background:' + invoiceDesign.darkColor + ';color:#fff;font-weight:700;}' +
      '#priceListPrintArea .pl-table tbody tr:nth-child(even) td{background:#f4f6f8;}' +
      '#priceListPrintArea .pl-table td.name{font-weight:700;}' +
      '#priceListPrintArea .pl-table td.code{font-family:monospace;color:#555;}' +
      '#priceListPrintArea .pl-table td.price{color:' + invoiceDesign.accentColor + ';font-weight:800;text-align:left;}' +
      '#priceListPrintArea .pl-foot{margin-top:4px;padding-top:3px;border-top:1px dashed #999;font-size:6.5pt;display:flex;justify-content:space-between;}' +
      '</style>';
    area.innerHTML = style + buildPriceListHTML(rows);
    document.body.classList.add('printing-pricelist');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-pricelist');
        area.innerHTML = '';
      }, 500);
    }, 150);
  }
  
  function exportPriceListExcel() {
    var rows = getPriceListRows();
    if (rows.length === 0) { showToast('⚠️ لا توجد مواد'); return; }
    var esc = escapeHtml;
    var table = '<table border="1"><thead><tr style="background:' + invoiceDesign.darkColor + ';color:#fff;">' +
      '<th>#</th><th>الكود</th><th>اسم المادة</th><th>الفئة</th>' +
      '<th>الوحدة</th><th>سعر الشراء ($)</th><th>سعر البيع ($)</th>' +
      '<th>سعر الصرف</th><th>سعر البيع (ل.س)</th><th>المخزون</th></tr></thead><tbody>' +
      rows.map((r, i) => {
        var p = getProductById(state.products.find(x => x.code === r.code)?.id);
        return '<tr><td>' + (i+1) + '</td><td>' + esc(r.code) + '</td>' +
          '<td>' + esc(r.name) + '</td><td>' + esc(r.category) + '</td>' +
          '<td>' + esc(r.unit) + '</td>' +
          '<td>' + (p ? (p.costUSD || 0).toFixed(2) : '0.00') + '</td>' +
          '<td>' + r.priceUSD.toFixed(2) + '</td>' +
          '<td>' + state.exchangeRate + '</td>' +
          '<td>' + Math.round(r.priceSYP) + '</td>' +
          '<td>' + r.stock + '</td></tr>';
      }).join('') + '</tbody></table>';
    var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8">' +
      '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>' +
      '<x:Name>PriceList</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>' +
      '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
      '</head><body><h3>' + esc(invoiceDesign.storeName) + ' — لائحة الأسعار</h3>' +
      '<p>التاريخ: ' + new Date().toLocaleDateString('ar-EG') +
      ' — سعر الصرف: 1$ = ' + state.exchangeRate + ' ل.س</p>' + table + '</body></html>';
    var blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    downloadBlob(blob, 'لائحة-الأسعار-' + new Date().toISOString().slice(0,10) + '.xls');
    showToast('📊 تم تصدير Excel');
  }
  
  function exportPriceListCsv() {
    var rows = getPriceListRows();
    if (rows.length === 0) { showToast('⚠️ لا توجد مواد'); return; }
    var q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    var header = ['#','الكود','اسم المادة','الفئة','الوحدة','سعر الشراء ($)','سعر البيع ($)','سعر الصرف','سعر البيع (ل.س)','المخزون'];
    var lines = [header.map(q).join(',')];
    rows.forEach((r, i) => {
      var prod = state.products.find(x => x.code === r.code);
      lines.push([i+1, r.code, r.name, r.category, r.unit,
        prod ? (prod.costUSD || 0).toFixed(2) : '0.00',
        r.priceUSD.toFixed(2), state.exchangeRate, Math.round(r.priceSYP), r.stock].map(q).join(','));
    });
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'لائحة-الأسعار-' + new Date().toISOString().slice(0,10) + '.csv');
    showToast('📄 تم تصدير CSV');
  }
  
  function setupPriceList() {
    renderPriceListCategoryFilter();
    renderPriceListPreview();
    document.getElementById('plCategoryFilter')?.addEventListener('change', e => {
      priceListState.category = e.target.value; renderPriceListPreview();
    });
    document.getElementById('plFontSize')?.addEventListener('input', e => {
      priceListState.fontSize = parseFloat(e.target.value) || 8; renderPriceListPreview();
    });
    document.getElementById('plPaper')?.addEventListener('change', e => {
      priceListState.paper = e.target.value;
    });
    document.getElementById('plFooterNote')?.addEventListener('input', e => {
      priceListState.footerNote = e.target.value; renderPriceListPreview();
    });
    document.getElementById('printPriceListBtn')?.addEventListener('click', printPriceList);
    document.getElementById('exportExcelBtn')?.addEventListener('click', exportPriceListExcel);
    document.getElementById('exportCsvBtn')?.addEventListener('click', exportPriceListCsv);
  }