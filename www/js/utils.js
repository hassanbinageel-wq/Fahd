/* ===== Utilities ===== */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const Utils = {
  /* ---------- IDs ---------- */
  uid(prefix='id'){ return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7); },

  /* ---------- Numbers ---------- */
  toNum(v){ const n = Number(String(v||0).replace(/[,،٬\s]/g,'').replace(/[٠-٩]/g, d=>d.charCodeAt(0)-1632)); return isFinite(n)?n:0; },
  round2(n){ return Math.round((Number(n)||0)*100)/100; },
  money(n, showCurr=true){
    const num = Math.round(Number(n)||0);
    const s = num.toLocaleString('en-US');
    return showCurr ? s+' ر.ي' : s;
  },
  moneyOnly(n){ return this.money(n,false); },

  /* ---------- Dates ---------- */
  today(){ const d=new Date(); d.setHours(0,0,0,0); return d; },
  ymd(d){ if(!d) return ''; const x=(d instanceof Date)?d:new Date(d); if(isNaN(x)) return ''; const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,'0'),dd=String(x.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; },
  fromYmd(s){ if(!s) return null; const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); },
  addMonths(d, n){ const x=new Date(d); const day=x.getDate(); x.setDate(1); x.setMonth(x.getMonth()+n); const last=new Date(x.getFullYear(),x.getMonth()+1,0).getDate(); x.setDate(Math.min(day,last)); return x; },
  addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+Number(n||0)); return x; },
  diffDays(a,b){ const A=new Date(a); A.setHours(0,0,0,0); const B=new Date(b); B.setHours(0,0,0,0); return Math.round((A-B)/86400000); },
  fmtDate(d, style='full'){
    if(!d) return '—';
    const x = (d instanceof Date)?d:new Date(d);
    if (isNaN(x)) return '—';
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    if (style==='short') return `${x.getDate()}/${x.getMonth()+1}/${x.getFullYear()}`;
    if (style==='month') return `${months[x.getMonth()]} ${x.getFullYear()}`;
    return `${x.getDate()} ${months[x.getMonth()]} ${x.getFullYear()}`;
  },
  fmtRelative(d){
    if(!d) return '';
    const days = this.diffDays(new Date(), d);
    if (days===0) return 'اليوم';
    if (days===1) return 'أمس';
    if (days===-1) return 'غداً';
    if (days>0 && days<7) return `قبل ${days} أيام`;
    if (days<0 && days>-7) return `بعد ${-days} أيام`;
    return this.fmtDate(d,'short');
  },

  /* ---------- Storage ---------- */
  ls: {
    get(k, def=null){
      try { const v = localStorage.getItem(k); return v===null? def : JSON.parse(v); }
      catch(e){ return def; }
    },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ Utils.toast('تعذر الحفظ — المساحة ممتلئة','err'); return false; } },
    del(k){ localStorage.removeItem(k); }
  },

  /* ---------- Hashing (SHA-256) ---------- */
  async sha256(text){
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
  },

  /* ---------- HTML escape ---------- */
  esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); },

  /* ---------- Toast ---------- */
  toast(msg, kind='', dur=2400){
    const el = $('#toast'); if(!el) return;
    el.textContent = msg;
    el.className = 'toast on ' + (kind||'');
    clearTimeout(el._t);
    el._t = setTimeout(()=>{ el.className='toast'; }, dur);
  },

  /* ---------- Modal ---------- */
  modal(html, opts={}){
    const m = $('#modal');
    const c = $('#modalContent');
    c.innerHTML = html;
    m.classList.remove('hidden');
    if (opts.wide) $('.modal-body', m).classList.add('wide'); else $('.modal-body', m).classList.remove('wide');
    if (opts.full) $('.modal-body', m).classList.add('full'); else $('.modal-body', m).classList.remove('full');
    document.body.style.overflow='hidden';
    // Scrim close
    $('.modal-scrim', m).onclick = () => { if (opts.persistent) return; Utils.closeModal(); };
    // Reset scroll position so modal starts from the top (in case content is tall)
    setTimeout(() => {
      const scrollable = m.querySelector('.modal-content');
      if (scrollable) scrollable.scrollTop = 0;
      // Blur any active input so the mobile keyboard doesn't fire mid-animation
      if (document.activeElement && document.activeElement.blur) {
        try { document.activeElement.blur(); } catch(e){}
      }
    }, 60);
    return c;
  },
  closeModal(){
    $('#modal').classList.add('hidden');
    $('#modalContent').innerHTML='';
    document.body.style.overflow='';
  },

  /* ---------- Sheet ---------- */
  sheet(html){
    const s = $('#sheet'); const c = $('#sheetContent');
    c.innerHTML = html; s.classList.remove('hidden');
    document.body.style.overflow='hidden';
    $('.sheet-scrim', s).onclick = () => Utils.closeSheet();
    setTimeout(() => {
      const scrollable = s.querySelector('.sheet-body');
      if (scrollable) scrollable.scrollTop = 0;
    }, 60);
    return c;
  },
  closeSheet(){ $('#sheet').classList.add('hidden'); $('#sheetContent').innerHTML=''; document.body.style.overflow=''; },

  /* ---------- Confirm ---------- */
  confirm(msg, {ok='تأكيد', cancel='إلغاء', danger=false}={}){
    return new Promise(resolve=>{
      const c = Utils.modal(`
        <div class="modal-head"><div class="modal-title">تأكيد</div><button class="modal-close" data-cancel>×</button></div>
        <div class="modal-content"><p style="margin:0;font-size:15px">${Utils.esc(msg)}</p></div>
        <div class="modal-foot">
          <button class="btn-ghost" data-cancel>${Utils.esc(cancel)}</button>
          <button class="${danger?'btn-danger':'btn-primary'}" data-ok>${Utils.esc(ok)}</button>
        </div>
      `);
      c.parentElement.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{Utils.closeModal();resolve(false);});
      c.parentElement.querySelector('[data-ok]').onclick=()=>{Utils.closeModal();resolve(true);};
    });
  },

  /* ---------- Camera / File ---------- */
  pickImage({camera=false}={}){
    return new Promise(resolve=>{
      const inp = document.createElement('input');
      inp.type='file'; inp.accept='image/*';
      if (camera) inp.capture='environment';
      inp.onchange = async () => {
        const f = inp.files && inp.files[0]; if(!f) return resolve(null);
        const compressed = await Utils.compressImage(f, 1400, .8);
        resolve(compressed);
      };
      inp.click();
    });
  },
  compressImage(file, maxDim=1400, quality=.85){
    return new Promise(resolve=>{
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let {width,height} = img;
          if (width>maxDim || height>maxDim){
            if (width>height){ height = Math.round(height*maxDim/width); width=maxDim; }
            else { width = Math.round(width*maxDim/height); height=maxDim; }
          }
          const c = document.createElement('canvas');
          c.width=width; c.height=height;
          c.getContext('2d').drawImage(img,0,0,width,height);
          resolve(c.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },
  pickFile(accept='.xlsx,.xls,.csv,.json'){
    return new Promise(resolve=>{
      const inp = document.createElement('input');
      inp.type='file'; inp.accept=accept;
      inp.onchange = () => resolve(inp.files && inp.files[0] || null);
      inp.click();
    });
  },

  /* ---------- Contacts ---------- */
  async pickContact(){
    // 1) Capacitor native plugin (Android/iOS) — PRIMARY
    try {
      const C = window.Capacitor?.Plugins?.Contacts;
      if (C){
        // Request permission
        try {
          const perm = await C.requestPermissions();
          const granted = perm?.contacts === 'granted' || perm?.contacts === true;
          if (!granted){
            Utils.toast('يجب السماح بالوصول لجهات الاتصال من إعدادات التطبيق','err',3500);
            return null;
          }
        } catch(pe){ /* older plugin versions skip perms */ }

        // Try pickContact API
        try {
          const r = await C.pickContact({ projection: { name: true, phones: true } });
          if (r?.contact){
            return {
              name: r.contact.name?.display || r.contact.name?.given || '',
              phone: (r.contact.phones||[])[0]?.number || '',
            };
          }
        } catch(pe){
          // pickContact not available on this version → fall back to getContacts list picker
          const list = await C.getContacts({ projection: { name: true, phones: true } });
          const contacts = list?.contacts || [];
          if (!contacts.length){ Utils.toast('لا توجد جهات اتصال','err'); return null; }
          return await Utils._contactListPicker(contacts);
        }
      }
    } catch(e){ console.warn('capacitor contacts failed', e); }

    // 2) Web Contact Picker (Chrome mobile HTTPS only)
    try {
      if ('contacts' in navigator && 'ContactsManager' in window){
        const res = await navigator.contacts.select(['name','tel'], {multiple:false});
        if (res && res[0]){
          return { name: (res[0].name && res[0].name[0]) || '', phone: (res[0].tel && res[0].tel[0]) || '' };
        }
      }
    } catch(e){ console.warn('web contacts failed', e); }

    // 3) Nothing works
    Utils.toast('اختيار جهات الاتصال غير متاح — اكتب الاسم والرقم يدوياً','err',3500);
    return null;
  },
  /* Fallback list picker when getContacts returns array */
  _contactListPicker(contacts){
    return new Promise(resolve => {
      const html = `
        <div class="card-title" style="margin-bottom:10px">اختر جهة الاتصال</div>
        <input id="cpSearch" placeholder="بحث..." style="margin-bottom:10px;padding:12px 14px;border:1.5px solid var(--line);border-radius:14px;width:100%">
        <div id="cpList" style="max-height:60vh;overflow-y:auto"></div>
      `;
      Utils.sheet(html);
      const render = () => {
        const q = ($('#cpSearch').value||'').toLowerCase();
        const filtered = contacts.filter(c => {
          const n = (c.name?.display||c.name?.given||'').toLowerCase();
          const p = (c.phones||[]).map(x=>x.number).join(' ');
          return !q || n.includes(q) || p.includes(q);
        }).slice(0, 100);
        $('#cpList').innerHTML = filtered.map((c,i)=>`
          <div class="list-item" data-i="${contacts.indexOf(c)}">
            <div class="li-avatar">${Utils.esc((c.name?.display||'?').slice(0,1))}</div>
            <div class="li-main">
              <div class="li-title">${Utils.esc(c.name?.display||c.name?.given||'—')}</div>
              <div class="li-sub">${Utils.esc((c.phones||[])[0]?.number||'')}</div>
            </div>
          </div>
        `).join('') || `<div class="empty small"><p>لا توجد نتائج</p></div>`;
        $$('#cpList .list-item').forEach(el=>el.onclick=()=>{
          const c = contacts[Number(el.dataset.i)];
          Utils.closeSheet();
          resolve({
            name: c.name?.display||c.name?.given||'',
            phone: (c.phones||[])[0]?.number||'',
          });
        });
      };
      $('#cpSearch').oninput = render; render();
      // Cancel case — closing the sheet resolves null
      const scrim = $('#sheet .sheet-scrim');
      if (scrim) scrim.addEventListener('click', ()=>resolve(null), {once:true});
    });
  },
  callPhone(num){
    if(!num) return;
    const clean = String(num).replace(/[^\d+]/g,'');
    window.location.href = 'tel:'+clean;
  },
  whatsapp(num, text=''){
    if(!num) return;
    let clean = String(num).replace(/[^\d]/g,'');
    if (clean.startsWith('00')) clean = clean.slice(2);
    if (clean.startsWith('0')) clean = '967'+clean.slice(1); // default to Yemen if leading 0
    window.open(`https://wa.me/${clean}${text?'?text='+encodeURIComponent(text):''}`,'_blank');
  },

  /* ---------- Universal file save (works on Capacitor Android + web) ---------- */
  isNative(){
    return !!(window.Capacitor && (window.Capacitor.isNativePlatform?.() || (window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web')));
  },
  _blobToBase64(blob){
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  },
  _bufToBase64(buf){
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i=0; i<bytes.length; i+=chunk){
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk));
    }
    return btoa(bin);
  },
  _strToBase64(s){
    return btoa(unescape(encodeURIComponent(s)));
  },
  /**
   * saveFile(data, filename, mime) — saves data to Documents on Android/iOS,
   * or triggers a browser download on web. On native, after saving it also
   * opens the system Share sheet so the user can send it via WhatsApp/Mail/etc.
   * data can be: Blob, ArrayBuffer, Uint8Array, or a UTF-8 string.
   */
  async saveFile(data, filename, mime='application/octet-stream'){
    // Native path — Capacitor Filesystem + Share
    if (Utils.isNative() && window.Capacitor?.Plugins?.Filesystem){
      const FS = window.Capacitor.Plugins.Filesystem;
      const Share = window.Capacitor.Plugins.Share;
      try {
        // Convert everything to base64
        let base64;
        if (data instanceof Blob) base64 = await Utils._blobToBase64(data);
        else if (data instanceof ArrayBuffer) base64 = Utils._bufToBase64(data);
        else if (data instanceof Uint8Array) base64 = Utils._bufToBase64(data.buffer);
        else base64 = Utils._strToBase64(String(data));

        // Sanitize filename — Arabic + safe chars only
        const safeName = String(filename).replace(/[\\\/:*?"<>|]/g, '_');

        // Save under Documents so it shows in the Files app
        const res = await FS.writeFile({
          path: safeName,
          data: base64,
          directory: 'DOCUMENTS',
          recursive: true,
        });
        const uri = res && res.uri;
        Utils.toast(`تم الحفظ في مستنداتك: ${safeName}`, 'ok', 3200);

        // Auto-open Share sheet so the user can send it
        if (Share && uri){
          setTimeout(async () => {
            try {
              await Share.share({
                title: safeName,
                url: uri,
                dialogTitle: 'مشاركة الملف',
              });
            } catch(shareErr){ /* user cancelled */ }
          }, 400);
        }
        return uri;
      } catch (e){
        console.error('saveFile native failed', e);
        Utils.toast('تعذر الحفظ: ' + (e.message || e), 'err', 4000);
        return null;
      }
    }

    // Web fallback — blob download
    try {
      let blob;
      if (data instanceof Blob) blob = data;
      else if (data instanceof ArrayBuffer) blob = new Blob([data], {type: mime});
      else if (data instanceof Uint8Array) blob = new Blob([data], {type: mime});
      else blob = new Blob([data], {type: mime});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
      return url;
    } catch(e){
      console.error('saveFile web failed', e);
      Utils.toast('تعذر الحفظ: ' + (e.message || e), 'err', 4000);
      return null;
    }
  },

  /* ---------- Excel/CSV ---------- */
  async exportExcel(rows, sheetName='Sheet1', filename='export.xlsx'){
    try {
      if (!rows || !rows.length){ Utils.toast('لا توجد بيانات للتصدير','err'); return; }
      await Vendor.need('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      // Write to array buffer instead of using XLSX.writeFile (which uses <a download>)
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      await Utils.saveFile(buf, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch(e){
      console.error(e);
      Utils.toast('تعذر تصدير Excel — تحقق من الإنترنت لتحميل المكتبة','err', 4000);
    }
  },
  async exportCSV(rows, filename='export.csv'){
    try {
      if(!rows.length){ Utils.toast('لا توجد بيانات للتصدير','err'); return; }
      const keys = Object.keys(rows[0]);
      const esc = v => { const s = String(v==null?'':v); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
      const csv = '\uFEFF' + [keys.join(','), ...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n');
      await Utils.saveFile(csv, filename, 'text/csv;charset=utf-8');
    } catch(e){
      console.error(e);
      Utils.toast('تعذر تصدير CSV','err');
    }
  },
  async importExcel(){
    const file = await Utils.pickFile('.xlsx,.xls,.csv');
    if(!file) return null;
    await Vendor.need('xlsx');
    return new Promise(resolve=>{
      const rd = new FileReader();
      rd.onload = e => {
        const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
        const out = {};
        wb.SheetNames.forEach(n => out[n] = XLSX.utils.sheet_to_json(wb.Sheets[n]));
        resolve(out);
      };
      rd.readAsArrayBuffer(file);
    });
  },

  /* ---------- PDF (from element) ---------- */
  async elementToPDF(el, filename='doc.pdf'){
    try {
      Utils.toast('جاري إنشاء PDF...','',1500);
      await Vendor.need('html2canvas');
      await Vendor.need('jspdf');
      // Give the vendor scripts a tick to attach to window
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(el, {scale:2, backgroundColor:'#ffffff', useCORS:true, logging:false});
      const img = canvas.toDataURL('image/jpeg', .92);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const h = canvas.height * pw / canvas.width;
      if (h <= ph){ pdf.addImage(img,'JPEG',0,0,pw,h); }
      else {
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        const pxPerMm = canvas.width/pw;
        pageCanvas.height = Math.floor(ph*pxPerMm);
        const ctx = pageCanvas.getContext('2d');
        let sy=0, remaining=canvas.height, first=true;
        while (remaining>0){
          const slice = Math.min(pageCanvas.height, remaining);
          ctx.fillStyle='#fff'; ctx.fillRect(0,0,pageCanvas.width,pageCanvas.height);
          ctx.drawImage(canvas, 0, sy, canvas.width, slice, 0, 0, canvas.width, slice);
          if(!first) pdf.addPage();
          pdf.addImage(pageCanvas.toDataURL('image/jpeg',.92),'JPEG',0,0,pw, slice/pxPerMm);
          sy += slice; remaining -= slice; first=false;
        }
      }
      // Output as ArrayBuffer instead of pdf.save() (which uses <a download>)
      const buf = pdf.output('arraybuffer');
      await Utils.saveFile(buf, filename, 'application/pdf');
    } catch(e){
      console.error(e);
      Utils.toast('تعذر إنشاء PDF: ' + (e.message || e), 'err', 4000);
    }
  },
  async elementToShare(el, filename='doc.png'){
    try {
      Utils.toast('جاري إنشاء الصورة...','',1500);
      await Vendor.need('html2canvas');
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(el, {scale:2, backgroundColor:'#ffffff'});
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      if (!blob){ throw new Error('empty image'); }
      await Utils.saveFile(blob, filename, 'image/png');
    } catch(e){
      console.error(e);
      Utils.toast('تعذر إنشاء الصورة: ' + (e.message || e),'err',4000);
    }
  },
};
window.Utils = Utils; window.$ = $; window.$$ = $$;
