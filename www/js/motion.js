/* ===== Motion Helpers =====
   - countUp: animates a number from 0 to target with easing
   - staggerReveal: applies staggered entrance animation to a set of elements
   - rippleAttach: adds click ripple to buttons
   - MutationObserver auto-applies motion to freshly rendered views
*/
const Motion = {

  /* ---------- Count-up numbers ---------- */
  countUp(el, opts={}){
    const target = Number(el.dataset.countTo || el.textContent.replace(/[^\d.-]/g,'')) || 0;
    const duration = opts.duration || 900;
    const decimals = opts.decimals != null ? opts.decimals : 0;
    const suffix = opts.suffix || '';
    const prefix = opts.prefix || '';
    const start = performance.now();
    const from = opts.from || 0;
    // Ease out cubic
    const ease = t => 1 - Math.pow(1 - t, 3);
    const format = n => {
      const rounded = decimals ? n.toFixed(decimals) : Math.round(n);
      return prefix + Number(rounded).toLocaleString('en-US') + suffix;
    };
    const step = now => {
      const p = Math.min(1, (now - start) / duration);
      const val = from + (target - from) * ease(p);
      el.textContent = format(val);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  /* Apply count-up to all `.money` spans inside a container */
  countUpMoney(container){
    container = container || document;
    container.querySelectorAll('.money').forEach(el => {
      if (el.dataset.counted) return;
      const num = Number(el.textContent.replace(/[^\d.-]/g,''));
      if (!isFinite(num) || num === 0) return;
      el.dataset.counted = '1';
      Motion.countUp(el, { duration: 700 });
    });
  },

  /* ---------- Staggered reveal ---------- */
  staggerReveal(elements, opts={}){
    const step = opts.step || 40;
    const startDelay = opts.startDelay || 0;
    elements.forEach((el, i) => {
      el.style.animationDelay = (startDelay + i * step) + 'ms';
    });
  },

  /* Apply stagger to common lists inside container */
  autoStagger(container){
    container = container || document;
    // Stat cards / QA tiles
    Motion.staggerReveal(container.querySelectorAll('.stat'), { step: 60 });
    Motion.staggerReveal(container.querySelectorAll('.qa'), { step: 50, startDelay: 150 });
    // Cards
    Motion.staggerReveal(container.querySelectorAll('.card'), { step: 70 });
    // List items
    container.querySelectorAll('.card-body').forEach(cb => {
      Motion.staggerReveal(cb.querySelectorAll('.list-item, .inst-row'), { step: 30 });
    });
    // Form rows
    container.querySelectorAll('.form').forEach(f => {
      Motion.staggerReveal(f.querySelectorAll('.form-row'), { step: 40 });
    });
  },

  /* ---------- Ripple effect ---------- */
  rippleAttach(el){
    el.addEventListener('click', e => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty('--rx', x + 'px');
      el.style.setProperty('--ry', y + 'px');
      el.classList.remove('rippling');
      void el.offsetWidth; // force reflow to restart animation
      el.classList.add('rippling');
      setTimeout(() => el.classList.remove('rippling'), 500);
    });
  },

  autoRipple(container){
    container = container || document;
    container.querySelectorAll('.btn-primary, .btn-secondary, .btn-accent, .btn-danger').forEach(b => {
      if (!b.dataset.rippled){
        Motion.rippleAttach(b);
        b.dataset.rippled = '1';
      }
    });
  },

  /* ---------- Progress bar animation ---------- */
  animateProgress(container){
    container = container || document;
    container.querySelectorAll('.progress-fill').forEach(el => {
      const w = el.style.width;
      if (!w) return;
      el.style.setProperty('--w', w);
    });
  },

  /* ---------- Master hook: run after every view render ---------- */
  applyAll(container){
    container = container || document;
    Motion.autoStagger(container);
    Motion.autoRipple(container);
    Motion.animateProgress(container);
    // Delay count-up slightly so stagger animation looks natural
    setTimeout(() => Motion.countUpMoney(container), 200);
  },

  /* ---------- Observe view container for changes ---------- */
  observe(){
    const view = $('#view');
    if (!view) return;
    // Whenever the view children change, re-apply motion
    const obs = new MutationObserver(() => {
      Motion.applyAll(view);
    });
    obs.observe(view, { childList: true, subtree: false });
    // Also observe modal & sheet
    const mc = $('#modalContent');
    if (mc){
      new MutationObserver(() => Motion.applyAll($('#modal'))).observe(mc, {childList:true});
    }
    const sc = $('#sheetContent');
    if (sc){
      new MutationObserver(() => Motion.applyAll($('#sheet'))).observe(sc, {childList:true});
    }
  },
};

window.Motion = Motion;
document.addEventListener('DOMContentLoaded', () => {
  // Wait for App boot to wire things up
  setTimeout(() => Motion.observe(), 100);
});
