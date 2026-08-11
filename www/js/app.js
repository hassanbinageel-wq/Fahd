/* ===== App Boot ===== */
const App = {
  currentRoute: 'dashboard',

  routes: {
    dashboard: () => V.dashboard(),
    clients: () => V.clients(),
    loans: () => V.loans(),
    installments: () => V.installments(),
    calendar: () => V.calendar(),
    invoices: () => V.reports(),
    reminders: () => V.reminders(),
    reports: () => V.reports(),
    settings: () => V.settings(),
  },

  go(route){
    if (!this.routes[route]) return;
    this.currentRoute = route;
    $$('#drawer .drawer-nav li').forEach(el => el.classList.toggle('active', el.dataset.route===route));
    this.closeDrawer();
    $('#view').scrollTop = 0;
    window.scrollTo(0,0);
    this.routes[route]();
    this.updateReminderBell();
  },

  openDrawer(){ $('#drawer').classList.add('open'); $('#drawerScrim').classList.add('on'); },
  closeDrawer(){ $('#drawer').classList.remove('open'); $('#drawerScrim').classList.remove('on'); },

  updateReminderBell(){
    const today = Utils.today();
    let count = 0;
    for (const i of DB.installments()){
      if (i.paid) continue;
      const d = Utils.fromYmd(i.dueDate); if (!d) continue;
      const diff = Utils.diffDays(d, today);
      if (diff <= (DB.settings().remindDaysBefore||3)) count++;
    }
    const dot = $('#reminderDot');
    if (dot) dot.classList.toggle('hidden', count===0);
  },

  async showLock(mode='login'){
    const s = DB.settings();
    const lock = $('#lock');
    const pw = $('#lockPw');
    const btn = $('#lockBtn');
    const err = $('#lockErr');
    pw.value = ''; err.textContent = '';
    lock.classList.remove('hidden');
    $('#app')?.classList.add('hidden');

    if (!s.passwordHash){
      // First-launch onboarding
      const h1 = lock.querySelector('h1');
      const sub = lock.querySelector('.lock-sub');
      sub.innerHTML = 'ضع كلمة مرور للدخول أو <a href="#" id="skipPw">تخطي</a>';
      btn.textContent = 'حفظ وبدء';
      return new Promise(resolve => {
        $('#skipPw')?.addEventListener('click', e => {
          e.preventDefault();
          lock.classList.add('hidden');
          $('#app').classList.remove('hidden');
          resolve();
        });
        const save = async () => {
          const p = pw.value.trim();
          if (p && p.length>=4){
            s.passwordHash = await Utils.sha256(p);
            DB.save();
          }
          lock.classList.add('hidden');
          $('#app').classList.remove('hidden');
          resolve();
        };
        btn.onclick = save;
        pw.onkeydown = e => { if (e.key==='Enter') save(); };
        pw.focus();
      });
    }

    // Standard login
    return new Promise(resolve => {
      const tryUnlock = async () => {
        const p = pw.value;
        const h = await Utils.sha256(p);
        if (h === s.passwordHash){
          lock.classList.add('hidden');
          $('#app').classList.remove('hidden');
          resolve();
        } else {
          err.textContent = 'كلمة المرور خاطئة';
          pw.value = ''; pw.focus();
        }
      };
      btn.onclick = tryUnlock;
      pw.onkeydown = e => { if (e.key==='Enter') tryUnlock(); };
      pw.focus();
    });
  },

  async boot(){
    DB.load();

    // Splash fade
    setTimeout(() => { const s=$('#splash'); if(s) s.classList.add('fade'); }, 900);
    setTimeout(() => { const s=$('#splash'); if(s) s.classList.add('hidden'); }, 1400);

    // Wire top-bar + drawer
    $('#menuBtn').onclick = () => this.openDrawer();
    $('#drawerScrim').onclick = () => this.closeDrawer();
    $$('#drawer .drawer-nav li').forEach(el => el.onclick = () => this.go(el.dataset.route));
    $('#reminderBtn').onclick = () => this.go('reminders');
    $('#lockAppBtn').onclick = () => {
      if (!DB.settings().passwordHash){ Utils.toast('لم يتم ضبط كلمة مرور — اذهب للإعدادات','err'); return; }
      this.showLock('login');
    };

    // Show lock + boot
    setTimeout(async () => {
      await this.showLock();
      if (!DB.clients().length){
        setTimeout(()=>Utils.toast('ابدأ بإضافة أول عميل من القائمة الجانبية 👥','', 4500), 400);
      }
      this.go('dashboard');
    }, 1500);

    // Auto-lock on background >5m
    let hiddenAt = null;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden){ hiddenAt = Date.now(); }
      else {
        if (hiddenAt && Date.now()-hiddenAt > 5*60*1000 && DB.settings().passwordHash){
          this.showLock('login');
        }
        hiddenAt = null;
      }
    });

    // Register SW (non-blocking)
    if ('serviceWorker' in navigator){
      try { await navigator.serviceWorker.register('sw.js'); } catch(e){}
    }
  },
};
window.App = App;
document.addEventListener('DOMContentLoaded', () => App.boot());
