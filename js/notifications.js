/* ============================================================
   notifications.js — الإشعارات + الأصوات
   ============================================================ */

   var notifications = Storage.get(CONFIG.STORAGE_KEYS.NOTIFS, []);

   function persistNotifs() {
     Storage.set(CONFIG.STORAGE_KEYS.NOTIFS, notifications);
   }
   
   /* ============================================================
      نظام الصوت — Web Audio API (بدون ملفات خارجية)
      ============================================================ */
   var AudioNotifier = {
     ctx: null,
     enabled: true,
   
     init: function() {
       try {
         if (!this.ctx) {
           this.ctx = new (window.AudioContext || window.webkitAudioContext)();
         }
         if (this.ctx.state === 'suspended') this.ctx.resume();
       } catch (e) {
         console.warn('AudioContext غير مدعوم:', e);
         this.enabled = false;
       }
     },
   
     /* نغمة "طلب جديد" — ثلاث نوتات صاعدة */
     playNewOrder: function() {
       if (!this.enabled) return;
       this.init();
       if (!this.ctx) return;
       try {
         var t = this.ctx.currentTime;
         var notes = [523.25, 659.25, 783.99]; // C5, E5, G5
         notes.forEach((freq, i) => {
           var osc = this.ctx.createOscillator();
           var gain = this.ctx.createGain();
           osc.type = 'sine';
           osc.frequency.value = freq;
           var start = t + i * 0.15;
           var end = start + 0.2;
           gain.gain.setValueAtTime(0, start);
           gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
           gain.gain.exponentialRampToValueAtTime(0.001, end);
           osc.connect(gain);
           gain.connect(this.ctx.destination);
           osc.start(start);
           osc.stop(end);
         });
       } catch (e) { console.warn(e); }
     },
   
     /* نغمة "مخزون منخفض" — نوتتان منخفضتان */
     playLowStock: function() {
       if (!this.enabled) return;
       this.init();
       if (!this.ctx) return;
       try {
         var t = this.ctx.currentTime;
         [392, 329.63].forEach((freq, i) => {
           var osc = this.ctx.createOscillator();
           var gain = this.ctx.createGain();
           osc.type = 'triangle';
           osc.frequency.value = freq;
           var start = t + i * 0.22;
           var end = start + 0.18;
           gain.gain.setValueAtTime(0, start);
           gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
           gain.gain.exponentialRampToValueAtTime(0.001, end);
           osc.connect(gain);
           gain.connect(this.ctx.destination);
           osc.start(start);
           osc.stop(end);
         });
       } catch (e) { console.warn(e); }
     }
   };
   
   /* تفعيل الصوت عند أول تفاعل من المستخدم */
   document.addEventListener('click', function onceClick() {
     AudioNotifier.init();
     document.removeEventListener('click', onceClick);
   }, { once: true });
   
   /* ============================================================
      وظائف الإشعارات
      ============================================================ */
   
   function pushNotification(type, title, message) {
     notifications.unshift({
       id: Date.now() + Math.random(),
       type: type,
       title: title,
       message: message,
       date: new Date().toISOString(),
       read: false
     });
     if (notifications.length > 200) notifications = notifications.slice(0, 200);
     persistNotifs();
     updateNotifBadge();
   
     // 🔊 تشغيل الصوت حسب النوع
     if (type === 'order') AudioNotifier.playNewOrder();
     else if (type === 'low_stock') AudioNotifier.playLowStock();
   
     if (typeof renderNotifsList === 'function') renderNotifsList();
   }
   
   function updateNotifBadge() {
     var unread = notifications.filter(n => !n.read).length;
     var badge = document.getElementById('notifCount');
     if (badge) {
       badge.textContent = unread;
       badge.style.display = unread > 0 ? 'inline-block' : 'none';
     }
   }
   
   function markAllRead() {
     notifications.forEach(n => n.read = true);
     persistNotifs();
     updateNotifBadge();
   }
   
   function renderNotifsList() {
     var box = document.getElementById('notifsList');
     if (!box) return;
     if (notifications.length === 0) {
       box.innerHTML = '<div class="empty-cart-msg">لا توجد إشعارات</div>';
       return;
     }
     box.innerHTML = notifications.map(n => {
       var cls = n.read ? '' : 'notif-unread';
       var icon = n.type === 'low_stock' ? '⚠️' : n.type === 'order' ? '🧾' : 'ℹ️';
       return '<div class="notif-item ' + cls + '">' +
         '<div class="notif-icon">' + icon + '</div>' +
         '<div class="notif-content">' +
           '<strong>' + escapeHtml(n.title) + '</strong>' +
           '<p>' + escapeHtml(n.message) + '</p>' +
           '<small>' + new Date(n.date).toLocaleString('ar-EG') + '</small>' +
         '</div>' +
       '</div>';
     }).join('');
   }
   
   function printNotifications() {
     var area = document.getElementById('notifsPrintArea');
     if (!area) return;
     var rows = notifications.map((n, i) => {
       var icon = n.type === 'low_stock' ? '⚠️' : n.type === 'order' ? '🧾' : 'ℹ️';
       return '<tr><td>' + (i + 1) + '</td><td>' + icon + '</td><td>' + escapeHtml(n.title) +
         '</td><td>' + escapeHtml(n.message) + '</td><td>' +
         new Date(n.date).toLocaleString('ar-EG') + '</td></tr>';
     }).join('');
     area.innerHTML = '<style>@page{size:A4;margin:10mm;} ' +
       'body{font-family:sans-serif;} ' +
       '#notifsPrintArea table{width:100%;border-collapse:collapse;font-size:10pt;} ' +
       '#notifsPrintArea th,#notifsPrintArea td{border:1px solid #999;padding:6px;text-align:right;} ' +
       '#notifsPrintArea th{background:' + invoiceDesign.darkColor + ';color:#fff;} ' +
       '#notifsPrintArea h2{color:' + invoiceDesign.accentColor + ';}</style>' +
       '<h2>' + escapeHtml(invoiceDesign.storeName) + ' — الإشعارات</h2>' +
       '<p style="font-size:9pt;color:#555;">التاريخ: ' + new Date().toLocaleString('ar-EG') + '</p>' +
       '<table><thead><tr><th>#</th><th>النوع</th><th>العنوان</th><th>التفاصيل</th><th>التاريخ</th></tr></thead>' +
       '<tbody>' + rows + '</tbody></table>';
     document.body.classList.add('printing-notifs');
     setTimeout(() => {
       window.print();
       setTimeout(() => {
         document.body.classList.remove('printing-notifs');
         area.innerHTML = '';
       }, 500);
     }, 150);
   }
   
   function checkLowStock() {
     state.products.forEach(p => {
       if (p.stock > 0 && p.stock <= settings.lowStockThreshold) {
         var exists = notifications.some(n =>
           n.type === 'low_stock' && n.productId === p.id &&
           (Date.now() - new Date(n.date).getTime()) < 24 * 60 * 60 * 1000
         );
         if (!exists) {
           pushNotification('low_stock', '⚠️ مخزون منخفض: ' + p.name,
             'الكمية المتبقية: ' + p.stock + ' — يُرجى إعادة التزويد');
           notifications[0].productId = p.id;
         }
       }
       if (p.stock <= 0) {
         var exists0 = notifications.some(n =>
           n.type === 'low_stock' && n.productId === (p.id + '_out') &&
           (Date.now() - new Date(n.date).getTime()) < 24 * 60 * 60 * 1000
         );
         if (!exists0) {
           pushNotification('low_stock', '❌ نفذ المخزون: ' + p.name, 'المنتج غير متوفر حالياً');
           notifications[0].productId = p.id + '_out';
         }
       }
     });
     persistNotifs();
   }