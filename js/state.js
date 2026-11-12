/* ============================================================
   state.js — حالة التطبيق والبيانات الافتراضية
   ============================================================ */

   var defaultState = {
    categories: [
      { id: 'cat_1', name: 'بقوليات', emoji: '🫘' },
      { id: 'cat_2', name: 'معلبات', emoji: '🥫' },
      { id: 'cat_3', name: 'توابل', emoji: '🧂' }
    ],
    products: [
      { id: 1, code: 'MK-ADM-0001', name: 'عدس أحمر', unit: 'كيس 1 كجم', priceUSD: 0.85, costUSD: 0.60, stock: 50, categoryId: 'cat_1', image: '' },
      { id: 2, code: 'MK-ADM-0002', name: 'فاصوليا بيضاء', unit: 'كيس 1 كجم', priceUSD: 0.95, costUSD: 0.70, stock: 30, categoryId: 'cat_1', image: '' },
      { id: 3, code: 'MK-ADM-0003', name: 'حمص حب', unit: 'كيس 1 كجم', priceUSD: 0.92, costUSD: 0.65, stock: 0, categoryId: 'cat_1', image: '' },
      { id: 4, code: 'MK-ADM-0004', name: 'لوبيا جافة', unit: 'كيس 1 كجم', priceUSD: 1.02, costUSD: 0.75, stock: 25, categoryId: 'cat_1', image: '' },
      { id: 5, code: 'MK-ADM-0005', name: 'فول مدمس', unit: 'علبة 400 جم', priceUSD: 0.50, costUSD: 0.30, stock: 80, categoryId: 'cat_2', image: '' },
      { id: 6, code: 'MK-ADM-0006', name: 'ترمس', unit: 'كيس 1 كجم', priceUSD: 1.20, costUSD: 0.90, stock: 5, categoryId: 'cat_1', image: '' },
      { id: 7, code: 'MK-ADM-0007', name: 'عدس أصفر', unit: 'كيس 1 كجم', priceUSD: 0.87, costUSD: 0.62, stock: 40, categoryId: 'cat_1', image: '' },
      { id: 8, code: 'MK-ADM-0008', name: 'فاصوليا حمراء', unit: 'كيس 1 كجم', priceUSD: 0.98, costUSD: 0.72, stock: 0, categoryId: 'cat_1', image: '' },
      { id: 9, code: 'MK-ADM-0009', name: 'فلفل أسود مطحون', unit: 'علبة 100 جم', priceUSD: 1.50, costUSD: 1.00, stock: 35, categoryId: 'cat_3', image: '' },
      { id: 10, code: 'MK-ADM-0010', name: 'كمون مطحون', unit: 'علبة 100 جم', priceUSD: 1.10, costUSD: 0.75, stock: 8, categoryId: 'cat_3', image: '' }
    ],
    cart: [],
    exchangeRate: 15000,
    currentCategoryFilter: 'all',
    searchQuery: '',
    invoiceCounter: 1001,
    shipping: { threshold: 100000, fee: 15000 }
  };
  
  var state = Storage.get(CONFIG.STORAGE_KEYS.STATE, null) || JSON.parse(JSON.stringify(defaultState));
  
  function persistState() {
    Storage.set(CONFIG.STORAGE_KEYS.STATE, state);
  }
  
  /* Settings (whatsapp, notifications) */
  var settings = Storage.get(CONFIG.STORAGE_KEYS.SETTINGS, {
    whatsappNumber: CONFIG.STORE_WHATSAPP_DEFAULT,
    lowStockThreshold: CONFIG.LOW_STOCK_THRESHOLD
  });
  function persistSettings() {
    Storage.set(CONFIG.STORAGE_KEYS.SETTINGS, settings);
  }
  
  /* Orders history */
  var ordersHistory = Storage.get(CONFIG.STORAGE_KEYS.ORDERS, []);
  
  /* ترحيل الطلبات القديمة: إضافة حقل read إن لم يكن موجوداً */
  ordersHistory.forEach(o => {
    if (typeof o.read !== 'boolean') o.read = false;
  });
  
  function persistOrders() {
    Storage.set(CONFIG.STORAGE_KEYS.ORDERS, ordersHistory);
  }
  
  /* Invoice design */
  var invoiceDesign = Storage.get(CONFIG.STORAGE_KEYS.DESIGN, null) ||
    JSON.parse(JSON.stringify(CONFIG.DEFAULT_DESIGN));
  function persistInvoiceDesign() {
    Storage.set(CONFIG.STORAGE_KEYS.DESIGN, invoiceDesign);
  }
  
  /* ============================================================
     مزامنة الطلبات بين التبويبات (admin + customer)
     ============================================================ */
  window.addEventListener('storage', function(e) {
    if (e.key === CONFIG.STORAGE_KEYS.ORDERS && e.newValue) {
      try {
        var updated = JSON.parse(e.newValue);
        if (Array.isArray(updated) && updated.length > ordersHistory.length) {
          var newest = updated[updated.length - 1];
          ordersHistory = updated;
          if (typeof renderOrdersTable === 'function') renderOrdersTable();
          if (typeof updateOrdersBadge === 'function') updateOrdersBadge();
          if (typeof AudioNotifier !== 'undefined') AudioNotifier.playNewOrder();
          if (typeof showToast === 'function') {
            showToast('🔔 طلب جديد: ' + newest.invoiceNumber);
          }
        }
      } catch (err) { /* ignore */ }
    }
  });