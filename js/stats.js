function computeStats() {
    var totalOrders = ordersHistory.length;
    var totalRevenueSYP = ordersHistory.reduce((s, o) => s + (o.grandTotal || 0), 0);
    var totalProfitSYP = ordersHistory.reduce((s, o) => s + (o.profitSYP || 0), 0);
    var totalItemsSold = ordersHistory.reduce((s, o) =>
      s + (o.items || []).reduce((si, it) => si + it.quantity, 0), 0);
  
    // المنتج الأكثر مبيعاً
    var productSales = {};
    ordersHistory.forEach(o => (o.items || []).forEach(it => {
      if (!productSales[it.code]) productSales[it.code] = { name: it.name, qty: 0, revenue: 0 };
      productSales[it.code].qty += it.quantity;
      productSales[it.code].revenue += usdToSyp(it.priceUSD * it.quantity);
    }));
    var topProducts = Object.keys(productSales).map(k => ({
      code: k, ...productSales[k]
    })).sort((a, b) => b.qty - a.qty).slice(0, 10);
  
    // الزبون الأكثر شراءً
    var customerSpend = {};
    ordersHistory.forEach(o => {
      var key = (o.customer?.phone || '') + '|' + (o.customer?.name || '');
      if (!customerSpend[key]) customerSpend[key] = {
        name: o.customer?.name || '—', phone: o.customer?.phone || '—',
        orders: 0, total: 0
      };
      customerSpend[key].orders++;
      customerSpend[key].total += o.grandTotal || 0;
    });
    var topCustomers = Object.values(customerSpend).sort((a, b) => b.total - a.total).slice(0, 10);
  
    return {
      totalOrders, totalRevenueSYP, totalProfitSYP, totalItemsSold,
      topProducts, topCustomers,
      totalProducts: state.products.length,
      lowStockCount: state.products.filter(p => p.stock > 0 && p.stock <= settings.lowStockThreshold).length,
      outOfStockCount: state.products.filter(p => p.stock <= 0).length
    };
  }
  
  function renderStats() {
    var stats = computeStats();
    var grid = document.getElementById('statsGrid');
    if (grid) {
      grid.innerHTML = [
        { icon: '🧾', label: 'إجمالي الطلبات', value: stats.totalOrders },
        { icon: '💰', label: 'إجمالي الإيرادات', value: formatSYP(stats.totalRevenueSYP) + ' ل.س' },
        { icon: '📈', label: 'إجمالي الأرباح', value: formatSYP(stats.totalProfitSYP) + ' ل.س' },
        { icon: '📦', label: 'القطع المباعة', value: stats.totalItemsSold },
        { icon: '🏪', label: 'عدد المنتجات', value: stats.totalProducts },
        { icon: '⚠️', label: 'مخزون منخفض', value: stats.lowStockCount },
        { icon: '❌', label: 'نفذ المخزون', value: stats.outOfStockCount }
      ].map(c => '<div class="stat-card">' +
        '<div class="stat-icon">' + c.icon + '</div>' +
        '<div class="stat-value">' + c.value + '</div>' +
        '<div class="stat-label">' + c.label + '</div></div>').join('');
    }
  
    var tp = document.querySelector('#topProductsTable tbody');
    if (tp) {
      if (stats.topProducts.length === 0) {
        tp.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">لا توجد مبيعات بعد</td></tr>';
      } else {
        tp.innerHTML = stats.topProducts.map((p, i) =>
          '<tr><td>' + (i+1) + '</td><td>' + escapeHtml(p.name) + '</td>' +
          '<td>' + p.qty + '</td><td>' + formatSYP(p.revenue) + ' ل.س</td></tr>').join('');
      }
    }
    var tc = document.querySelector('#topCustomersTable tbody');
    if (tc) {
      if (stats.topCustomers.length === 0) {
        tc.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;">لا توجد طلبات بعد</td></tr>';
      } else {
        tc.innerHTML = stats.topCustomers.map((c, i) =>
          '<tr><td>' + (i+1) + '</td><td>' + escapeHtml(c.name) + '</td>' +
          '<td>' + escapeHtml(c.phone) + '</td><td>' + c.orders + '</td>' +
          '<td>' + formatSYP(c.total) + ' ل.س</td></tr>').join('');
      }
    }
  }
  
  function calculateDailyProfits(from, to) {
    var daily = {};
    ordersHistory.forEach(o => {
      if (!o.timestamp) return;
      var d = o.timestamp.slice(0, 10);
      if (from && d < from) return;
      if (to && d > to) return;
      if (!daily[d]) daily[d] = { orders: 0, revenue: 0, cost: 0, profit: 0 };
      daily[d].orders++;
      daily[d].revenue += o.grandTotal || 0;
      daily[d].profit += o.profitSYP || 0;
      daily[d].cost += usdToSyp(o.costTotalUSD || 0);
    });
    return Object.keys(daily).sort().map(d => ({ date: d, ...daily[d] }));
  }
  
  function renderDailyProfits(from, to) {
    var rows = calculateDailyProfits(from, to);
    var tbody = document.querySelector('#dailyProfitTable tbody');
    if (!tbody) return;
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;">لا توجد بيانات</td></tr>';
    } else {
      tbody.innerHTML = rows.map(r =>
        '<tr><td>' + r.date + '</td><td>' + r.orders + '</td>' +
        '<td>' + formatSYP(r.revenue) + ' ل.س</td>' +
        '<td>' + formatSYP(r.cost) + ' ل.س</td>' +
        '<td style="color:#2e7d32;font-weight:800;">' + formatSYP(r.profit) + ' ل.س</td></tr>').join('');
    }
    var summary = document.getElementById('profitSummary');
    if (summary) {
      var totalRev = rows.reduce((s, r) => s + r.revenue, 0);
      var totalCost = rows.reduce((s, r) => s + r.cost, 0);
      var totalProfit = rows.reduce((s, r) => s + r.profit, 0);
      summary.innerHTML =
        '<div class="stat-card"><div class="stat-icon">💵</div><div class="stat-value">' +
        formatSYP(totalRev) + ' ل.س</div><div class="stat-label">إجمالي الإيرادات</div></div>' +
        '<div class="stat-card"><div class="stat-icon">💸</div><div class="stat-value">' +
        formatSYP(totalCost) + ' ل.س</div><div class="stat-label">إجمالي التكلفة</div></div>' +
        '<div class="stat-card" style="border:2px solid #2e7d32;"><div class="stat-icon">📈</div>' +
        '<div class="stat-value" style="color:#2e7d32;">' + formatSYP(totalProfit) +
        ' ل.س</div><div class="stat-label">صافي الربح</div></div>';
    }
  }
  
  function setupStats() {
    var calcBtn = document.getElementById('calcProfitBtn');
    if (calcBtn) {
      calcBtn.addEventListener('click', () => {
        var from = document.getElementById('profitFrom').value;
        var to = document.getElementById('profitTo').value;
        renderDailyProfits(from, to);
      });
    }
    // اليوم الحالي افتراضياً
    var today = new Date().toISOString().slice(0, 10);
    var fromEl = document.getElementById('profitFrom');
    var toEl = document.getElementById('profitTo');
    if (fromEl) fromEl.value = today;
    if (toEl) toEl.value = today;
    renderStats();
    renderDailyProfits(today, today);
  }