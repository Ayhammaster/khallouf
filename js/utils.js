function usdToSyp(usd) { return usd * state.exchangeRate; }
function formatSYP(syp) { return Math.round(syp).toLocaleString('en-US'); }
function formatUSD(usd) { return Number(usd).toFixed(2); }
function getCategoryById(id) { return state.categories.find(c => c.id === id); }
function getProductById(id) { return state.products.find(p => p.id === id); }
function nextProductId() { return state.products.length ? Math.max(...state.products.map(p => p.id)) + 1 : 1; }

function getAvailableStock(productId) {
  var p = getProductById(productId);
  if (!p) return 0;
  var c = state.cart.find(i => i.id === productId);
  return p.stock - (c ? c.quantity : 0);
}
function generateProductCode() {
  var max = state.products.reduce((m, p) => {
    var match = p.code ? p.code.match(/(\d+)$/) : null;
    return match ? Math.max(m, parseInt(match[1])) : m;
  }, 0);
  return 'MK-ADM-' + String(max + 1).padStart(4, '0');
}
function generateInvoiceNumber() {
  var now = new Date();
  var d = '' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0');
  state.invoiceCounter += 1;
  persistState();
  return 'INV-' + d + '-' + state.invoiceCounter;
}
function highlightText(text, q) {
  if (!q) return text;
  var esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp('('+esc+')','gi'), '<mark class="highlight">$1</mark>');
}
var _toastTimer;
function showToast(msg) {
  var t = document.getElementById('toastMsg');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}
function calculateShipping(subtotalSYP) {
  if (subtotalSYP <= 0) return 0;
  if (subtotalSYP >= state.shipping.threshold) return 0;
  return state.shipping.fee;
}
function downloadImage(dataUrl, filename) {
  var a = document.createElement('a');
  a.download = filename; a.href = dataUrl; a.click();
}
function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}