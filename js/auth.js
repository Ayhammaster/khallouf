var AUTH = {
    users: [
      { username: 'admin', password: '1234', role: 'admin' },
      { username: 'cashier', password: '0000', role: 'cashier' }
    ],
    current: null,
    login(u, p) {
      var f = this.users.find(x => x.username === u && x.password === p);
      if (f) {
        this.current = f;
        Storage.set(CONFIG.STORAGE_KEYS.AUTH, { username: f.username, role: f.role });
        return true;
      }
      return false;
    },
    logout() {
      this.current = null;
      Storage.remove(CONFIG.STORAGE_KEYS.AUTH);
    },
    restore() {
      var saved = Storage.get(CONFIG.STORAGE_KEYS.AUTH, null);
      if (saved) {
        var u = this.users.find(x => x.username === saved.username);
        if (u) { this.current = u; return true; }
      }
      return false;
    }
  };
  
  function initLoginScreen() {
    var screen = document.getElementById('loginScreen');
    var adminApp = document.getElementById('adminApp');
    var userInput = document.getElementById('loginUser');
    var passInput = document.getElementById('loginPass');
    var errorBox = document.getElementById('loginError');
    var btn = document.getElementById('loginBtn');
  
    function showApp() {
      screen.style.display = 'none';
      adminApp.style.display = 'block';
      if (typeof initAdmin === 'function') initAdmin();
    }
    function attempt() {
      var u = userInput.value.trim(), p = passInput.value;
      errorBox.classList.remove('show');
      if (!u || !p) { errorBox.textContent = 'أدخل البيانات'; errorBox.classList.add('show'); return; }
      if (AUTH.login(u, p)) showApp();
      else {
        errorBox.textContent = 'بيانات غير صحيحة';
        errorBox.classList.add('show');
        passInput.value = ''; passInput.focus();
      }
    }
    btn.addEventListener('click', attempt);
    userInput.addEventListener('keydown', e => { if (e.key === 'Enter') passInput.focus(); });
    passInput.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
  
    if (AUTH.restore()) showApp();
  
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (!confirm('تسجيل الخروج؟')) return;
        AUTH.logout();
        location.reload();
      });
    }
  }
  if (document.body.dataset.page === 'admin') {
    document.addEventListener('DOMContentLoaded', initLoginScreen);
  }