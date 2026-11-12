var Storage = {
    get: function(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set: function(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { console.error('Storage error', e); return false; }
    },
    remove: function(key) {
      try { localStorage.removeItem(key); } catch (e) {}
    }
  };