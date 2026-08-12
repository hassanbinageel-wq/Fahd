/* ===== Views ===== */
const V = {

  /* ============================================================
     DASHBOARD
     ============================================================ */
  dashboard(){
    const p = Engine.portfolio();
    const view = $('#view');
    view.innerHTML = `
      <div class="view-head">
        <div class="view-title">📊 لوحة التحكم <span class="sub">${Utils.fmtDate(new Date(),'full')}</span></div>
      </div>

      <div class="stat-grid">
        <div class="stat hi">
          <div class="stat-lbl">إجمالي المتبقي</div>
          <div class="stat-val"><span class="money">${Utils.moneyOnly(p.totalRemaining)}</span> <span class="u">ر.ي</span></div>
          <div class="stat-sub">من ${p.loans} تمويل</div>
        </div>
        <div class="stat ${p.overdueAmount>0?'warn':''}">
          <div class="stat-lbl">متأخرات</div>
          <div class="stat-val"><span class="money">${Utils.moneyOnly(p.overdueAmount)}</span> <span class="u">ر.ي</span></div>
          <div class="stat-sub">${p.overdueInstCount} قسط متأخر</div>
        </div>
        <div class="stat">
          <div class="stat-lbl">مُحصّل حتى الآن</div>
          <div class="stat-val"><span class="money">${Utils.moneyOnly(p.totalCollected)}</span> <span class="u">ر.ي</span></div>
          <div class="stat-sub">${p.completedLoans} تمويل مكتمل</div>
        </div>
        <div class="stat">
          <div class="stat-lbl">دفعات من حسابك</div>
          <div class="stat-val"><span class="money">${Utils.moneyOnly(p.repOwed)}</span> <span class="u">ر.ي</span></div>
          <div class="stat-sub">مستحق لك من العملاء</div>
        </div>
      </div>

      <div class="qa-grid">
        <div class="qa" data-nav="clients-new"><div class="qa-ico">👤</div><div class="qa-lbl">عميل جديد</div></div>
        <div class="qa" data-nav="loans-new"><div class="qa-ico">💼</div><div class="qa-lbl">تمويل جديد</div></div>
        <div class="qa" data-nav="pay-quick"><div class="qa-ico">💰</div><div class="qa-lbl">تسجيل دفعة</div></div>
        <div class="qa" data-nav="reports"><div class="qa-ico">📈</div><div class="qa-lbl">التقارير</div></div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">🔴 أقساط متأخرة</div>
          <button class="btn-ghost small" data-goto="installments-late">عرض الكل</button>
        </div>
        <div id="dashLate" class="card-body pad-0"></div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">📅 مستحقات هذا الأسبوع</div>
          <button class="btn-ghost small" data-goto="installments">عرض الكل</button>
        </div>
        <div id="dashWeek" class="card-body pad-0"></div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title">👥 آخر العملاء</div>
          <button class="btn-ghost small" data-goto="clients">عرض الكل</button>
        </div>
        <div id="dashClients" class="card-body pad-0"></div>
      </div>
    `;

    // Late installments (limit 5)
    const today = Utils.today();
    const lateItems = [];
    for (const inst of DB.installments()){
      if (inst.paid) continue;
      const loan = DB.loan(inst.loanId);
      if (Engine.installmentStatus(inst, loan)==='late'){
        lateItems.push({inst,loan});
      }
    }
    lateItems.sort((a,b)=> new Date(a.inst.dueDate)-new Date(b.inst.dueDate));
    $('#dashLate').innerHTML = lateItems.slice(0,5).map(({inst,loan})=>{
      const c = DB.client(loan.clientId) || {};
      const days = Utils.diffDays(today, Utils.fromYmd(inst.dueDate));
      return `
        <div class="list-item" data-loan="${inst.loanId}">
          <div class="li-avatar">${Utils.esc((c.name||'?').slice(0,1))}</div>
          <div class="li-main">
            <div class="li-title">${Utils.esc(c.name||'عميل')}</div>
            <div class="li-sub">قسط ${inst.number} · متأخر ${days} يوم</div>
          </div>
          <div class="li-right"><div class="amt warn"><span class="money">${Utils.moneyOnly(inst.amount-inst.paidAmount)}</span></div></div>
        </div>
      `;
    }).join('') || `<div class="empty small"><div class="icon">✅</div><p>لا توجد متأخرات</p></div>`;

    // Week ahead
    const soon = new Date(today); soon.setDate(soon.getDate()+7);
    const weekItems = [];
    for (const inst of DB.installments()){
      if (inst.paid) continue;
      const d = Utils.fromYmd(inst.dueDate); if (!d) continue;
      if (d >= today && d <= soon){
        const loan = DB.loan(inst.loanId);
        weekItems.push({inst,loan});
      }
    }
    weekItems.sort((a,b)=> new Date(a.inst.dueDate)-new Date(b.inst.dueDate));
    $('#dashWeek').innerHTML = weekItems.slice(0,5).map(({inst,loan})=>{
      const c = DB.client(loan.clientId) || {};
      return `
        <div class="list-item" data-loan="${inst.loanId}">
          <div class="li-avatar">${Utils.esc((c.name||'?').slice(0,1))}</div>
          <div class="li-main">
            <div class="li-title">${Utils.esc(c.name||'عميل')}</div>
            <div class="li-sub">قسط ${inst.number} · ${Utils.fmtRelative(inst.dueDate)}</div>
          </div>
          <div class="li-right"><div class="amt"><span class="money">${Utils.moneyOnly(inst.amount-inst.paidAmount)}</span></div></div>
        </div>
      `;
    }).join('') || `<div class="empty small"><div class="icon">🎉</div><p>لا توجد أقساط هذا الأسبوع</p></div>`;

    // Recent clients
    const recentClients = [...DB.clients()].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
    $('#dashClients').innerHTML = recentClients.map(c=>{
      const loans = DB.clientLoans(c.id);
      const totalRem = loans.reduce((s,l)=>s+(Engine.loanMetrics(l.id)?.remaining||0), 0);
      return `
        <div class="list-item" data-client="${c.id}">
          <div class="li-avatar">${Utils.esc((c.name||'?').slice(0,1))}</div>
          <div class="li-main">
            <div class="li-title">${Utils.esc(c.name||'—')}</div>
            <div class="li-sub">#${c.clientNumber} · ${loans.length} تمويل</div>
          </div>
          <div class="li-right"><div class="amt"><span class="money">${Utils.moneyOnly(totalRem)}</span></div></div>
        </div>
      `;
    }).join('') || `<div class="empty small"><div class="icon">👤</div><p>لا يوجد عملاء بعد</p><button class="btn-primary small" data-goto="clients-new">إضافة أول عميل</button></div>`;

    // Wire actions
    view.querySelectorAll('[data-nav="clients-new"]').forEach(el=>el.onclick=()=>{ App.go('clients'); setTimeout(()=>V.clientEditor(),100);} );
    view.querySelectorAll('[data-nav="loans-new"]').forEach(el=>el.onclick=()=>{ App.go('loans'); setTimeout(()=>V.loanEditor(),100);} );
    view.querySelectorAll('[data-nav="pay-quick"]').forEach(el=>el.onclick=()=>V.paymentPicker());
    view.querySelectorAll('[data-goto="installments"]').forEach(el=>el.onclick=()=>App.go('installments'));
    view.querySelectorAll('[data-goto="installments-late"]').forEach(el=>el.onclick=()=>{ App.go('installments'); setTimeout(()=>{ const btn=$$('#view .filter-bar .chip').find(c=>c.textContent.includes('متأخر')); if(btn) btn.click();},100);});
    view.querySelectorAll('[data-goto="clients"]').forEach(el=>el.onclick=()=>App.go('clients'));
    view.querySelectorAll('[data-goto="reports"]').forEach(el=>el.onclick=()=>App.go('reports'));
    view.querySelectorAll('[data-loan]').forEach(el=>el.onclick=()=>V.loanDetail(el.dataset.loan));
    view.querySelectorAll('[data-client]').forEach(el=>el.onclick=()=>V.clientDetail(el.dataset.client));
  },

  /* ============================================================
     CLIENTS
     ============================================================ */
  clients(){
    const view = $('#view');
    view.innerHTML = `
      <div class="view-head">
        <div class="view-title">👥 العملاء <span class="sub">(${DB.clients().length})</span></div>
        <div class="view-actions">
          <button class="btn-secondary small" id="expBtn">⬇ تصدير</button>
          <button class="btn-secondary small" id="impBtn">⬆ استيراد</button>
          <button class="btn-primary small" id="newBtn">＋ عميل جديد</button>
        </div>
      </div>
      <div class="search-bar"><input id="q" placeholder="ابحث بالاسم أو الرقم أو الهاتف..."></div>
      <div class="card"><div id="clientList" class="card-body pad-0"></div></div>
    `;
    const render = () => {
      const q = ($('#q').value||'').trim().toLowerCase();
      let items = DB.clients().slice();
      if (q) items = items.filter(c =>
        (c.name||'').toLowerCase().includes(q) ||
        String(c.clientNumber||'').includes(q) ||
        (c.phone||'').includes(q) ||
        (c.idNumber||'').includes(q)
      );
      items.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
      $('#clientList').innerHTML = items.map(c=>{
        const loans = DB.clientLoans(c.id);
        const totalRem = loans.reduce((s,l)=>s+(Engine.loanMetrics(l.id)?.remaining||0), 0);
        const worstStatus = loans.map(l=>Engine.loanStatus(l.id)).reduce((worst,cur)=>{
          const order = { done:0, ok:1, partial:2, grace:3, late:4, default:5 };
          return (order[cur.code]||0) > (order[worst.code]||0) ? cur : worst;
        }, {code:'ok', label:'—'});
        return `
          <div class="list-item" data-id="${c.id}">
            <div class="li-avatar">${Utils.esc((c.name||'?').slice(0,1))}</div>
            <div class="li-main">
              <div class="li-title">${Utils.esc(c.name||'—')} <span class="muted small">#${c.clientNumber}</span></div>
              <div class="li-sub">${Utils.esc(c.phone||'—')} · ${loans.length} تمويل</div>
            </div>
            <div class="li-right">
              <div class="amt"><span class="money">${Utils.moneyOnly(totalRem)}</span></div>
              ${loans.length ? `<div style="margin-top:4px"><span class="pill pill-${worstStatus.code}">${worstStatus.label}</span></div>`:''}
            </div>
          </div>
        `;
      }).join('') || `<div class="empty"><div class="icon">👤</div><p>لا يوجد عملاء بعد</p><button class="btn-primary small" id="empNew">＋ إضافة أول عميل</button></div>`;
      $$('#clientList [data-id]').forEach(el=>el.onclick=()=>V.clientDetail(el.dataset.id));
      const en = $('#empNew'); if (en) en.onclick=()=>V.clientEditor();
    };
    $('#q').oninput = render;
    $('#newBtn').onclick = ()=>V.clientEditor();
    $('#expBtn').onclick = ()=>V.exportClients();
    $('#impBtn').onclick = ()=>V.importClients();
    render();
  },

  clientEditor(existing=null){
    const c = existing || {};
    const s = DB.settings();
    const isNew = !existing;
    const nextNum = isNew ? (s.lastClientNumber+1) : c.clientNumber;
    Utils.modal(`
      <div class="modal-head">
        <div class="modal-title">${isNew?'عميل جديد':'تعديل بيانات العميل'}</div>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-content">
        <form class="form" id="clientForm">
          <button type="button" id="pickBoth" class="btn-primary" style="width:100%;padding:14px;justify-content:center;font-size:15px;margin-bottom:4px">
            📇 استيراد الاسم والرقم من جهات الاتصال
          </button>
          <div class="form-row two">
            <div>
              <div class="form-lbl">رقم العميل</div>
              <input id="clientNumber" type="number" value="${nextNum}" ${isNew?'':'readonly'}>
              <div class="form-hint">رقم دائم لن يتغير مع أي تمويل جديد</div>
            </div>
            <div>
              <div class="form-lbl">الاسم الكامل *</div>
              <input id="name" value="${Utils.esc(c.name||'')}" required>
            </div>
          </div>
          <div class="form-row two">
            <div>
              <div class="form-lbl">هاتف العميل</div>
              <div class="field-with-btn">
                <input id="phone" type="tel" value="${Utils.esc(c.phone||'')}" placeholder="7XXXXXXXX">
                <button type="button" id="pickPhone" title="من جهات الاتصال">📇</button>
              </div>
            </div>
            <div>
              <div class="form-lbl">رقم الهوية / السجل</div>
              <input id="idNumber" value="${Utils.esc(c.idNumber||'')}">
            </div>
          </div>
          <div class="form-row two">
            <div>
              <div class="form-lbl">اسم الكفيل</div>
              <input id="guarantorName" value="${Utils.esc(c.guarantorName||'')}">
            </div>
            <div>
              <div class="form-lbl">هاتف الكفيل</div>
              <div class="field-with-btn">
                <input id="guarantorPhone" type="tel" value="${Utils.esc(c.guarantorPhone||'')}">
                <button type="button" id="pickGuar" title="من جهات الاتصال">📇</button>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-lbl">العنوان</div>
            <input id="address" value="${Utils.esc(c.address||'')}">
          </div>
          <div class="form-row">
            <div class="form-lbl">ملاحظات</div>
            <textarea id="notes" rows="2">${Utils.esc(c.notes||'')}</textarea>
          </div>
        </form>
      </div>
      <div class="modal-foot">
        ${!isNew?`<button class="btn-danger small" id="delBtn">حذف</button>`:''}
        <div class="spacer"></div>
        <button class="btn-ghost" data-close>إلغاء</button>
        <button class="btn-primary" id="saveBtn">حفظ</button>
      </div>
    `);
    $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
    // Big picker fills BOTH name + phone
    $('#pickBoth').onclick = async ()=>{
      const con = await Utils.pickContact();
      if (con){
        if (con.name) $('#name').value = con.name;
        if (con.phone) $('#phone').value = con.phone;
        Utils.toast('تم الاستيراد','ok');
      }
    };
    $('#pickPhone').onclick = async ()=>{
      const con = await Utils.pickContact();
      if (con){ if(!$('#name').value && con.name) $('#name').value=con.name; if (con.phone) $('#phone').value=con.phone; }
    };
    $('#pickGuar').onclick = async ()=>{
      const con = await Utils.pickContact();
      if (con){ if(!$('#guarantorName').value && con.name) $('#guarantorName').value=con.name; if (con.phone) $('#guarantorPhone').value=con.phone; }
    };
    $('#saveBtn').onclick = () => {
      const name = $('#name').value.trim();
      if (!name){ Utils.toast('الاسم مطلوب','err'); return; }
      const payload = {
        clientNumber: Utils.toNum($('#clientNumber').value),
        name,
        phone: $('#phone').value.trim(),
        idNumber: $('#idNumber').value.trim(),
        guarantorName: $('#guarantorName').value.trim(),
        guarantorPhone: $('#guarantorPhone').value.trim(),
        address: $('#address').value.trim(),
        notes: $('#notes').value.trim(),
      };
      if (isNew){
        // Manually setting the number
        const num = payload.clientNumber;
        DB.settings().lastClientNumber = Math.max(DB.settings().lastClientNumber, num);
        const created = DB.addClient(payload);
        created.clientNumber = num;
        DB.save();
        Utils.toast('تم إضافة العميل','ok');
      } else {
        DB.updateClient(c.id, payload);
        Utils.toast('تم الحفظ','ok');
      }
      Utils.closeModal();
      V.clients();
    };
    const del = $('#delBtn');
    if (del) del.onclick = async () => {
      const loans = DB.clientLoans(c.id);
      const msg = loans.length
        ? `العميل عليه ${loans.length} تمويل. سيتم حذف كل شيء نهائياً — متأكد؟`
        : 'حذف هذا العميل؟';
      if (await Utils.confirm(msg, {danger:true, ok:'حذف'})){
        DB.deleteClient(c.id);
        Utils.toast('تم الحذف');
        Utils.closeModal();
        V.clients();
      }
    };
  },

  clientDetail(id){
    const c = DB.client(id); if (!c) return V.clients();
    if (window.App) App.parentRoute = 'clients';
    const loans = DB.clientLoans(id);
    const totalRem = loans.reduce((s,l)=>s+(Engine.loanMetrics(l.id)?.remaining||0), 0);
    const totalPrincipal = loans.reduce((s,l)=>s+l.principalAmount,0);
    const totalPaid = loans.reduce((s,l)=>s+(Engine.loanMetrics(l.id)?.totalPaid||0),0);
    const view = $('#view');
    view.innerHTML = `
      <div class="view-head">
        <div class="view-title">
          <button class="btn-ghost small" id="back">‹ رجوع</button>
          ${Utils.esc(c.name)} <span class="sub">#${c.clientNumber}</span>
        </div>
        <div class="view-actions">
          <button class="btn-secondary small" id="editBtn">✎ تعديل</button>
          <button class="btn-primary small" id="statementBtn">🧾 كشف حساب</button>
          <button class="btn-accent small" id="newLoanBtn">＋ تمويل جديد</button>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="row" style="gap:14px;flex-wrap:wrap">
            <div style="flex:1;min-width:180px">
              <div class="form-lbl">الهاتف</div>
              <div class="row" style="gap:6px">
                <div>${Utils.esc(c.phone||'—')}</div>
                ${c.phone?`
                  <button class="action-tap" data-call="${Utils.esc(c.phone)}">📞</button>
                  <button class="action-tap" data-wa="${Utils.esc(c.phone)}">💬</button>
                `:''}
              </div>
            </div>
            <div style="flex:1;min-width:180px">
              <div class="form-lbl">الهوية</div>
              <div>${Utils.esc(c.idNumber||'—')}</div>
            </div>
          </div>
          ${c.guarantorName?`
            <div class="divider"></div>
            <div class="row" style="gap:14px;flex-wrap:wrap">
              <div style="flex:1;min-width:180px">
                <div class="form-lbl">الكفيل</div>
                <div>${Utils.esc(c.guarantorName)}</div>
              </div>
              <div style="flex:1;min-width:180px">
                <div class="form-lbl">هاتف الكفيل</div>
                <div class="row" style="gap:6px">
                  <div>${Utils.esc(c.guarantorPhone||'—')}</div>
                  ${c.guarantorPhone?`
                    <button class="action-tap" data-call="${Utils.esc(c.guarantorPhone)}">📞</button>
                    <button class="action-tap" data-wa="${Utils.esc(c.guarantorPhone)}">💬</button>
                  `:''}
                </div>
              </div>
            </div>
          `:''}
          ${c.address?`<div class="divider"></div><div class="form-lbl">العنوان</div><div>${Utils.esc(c.address)}</div>`:''}
          ${c.notes?`<div class="divider"></div><div class="form-lbl">ملاحظات</div><div>${Utils.esc(c.notes)}</div>`:''}
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat"><div class="stat-lbl">عدد التمويلات</div><div class="stat-val">${loans.length}</div></div>
        <div class="stat"><div class="stat-lbl">إجمالي التمويل</div><div class="stat-val"><span class="money">${Utils.moneyOnly(totalPrincipal)}</span></div></div>
        <div class="stat"><div class="stat-lbl">مدفوع</div><div class="stat-val"><span class="money">${Utils.moneyOnly(totalPaid)}</span></div></div>
        <div class="stat ${totalRem>0?'hi':''}"><div class="stat-lbl">المتبقي</div><div class="stat-val"><span class="money">${Utils.moneyOnly(totalRem)}</span></div></div>
      </div>

      <div class="card">
        <div class="card-head"><div class="card-title">التمويلات</div></div>
        <div id="loansBody" class="card-body pad-0"></div>
      </div>
    `;
    $('#back').onclick = () => V.clients();
    $('#editBtn').onclick = () => V.clientEditor(c);
    $('#newLoanBtn').onclick = () => V.loanEditor(null, c.id);
    $('#statementBtn').onclick = () => Invoices.clientStatement(c.id);
    $$('[data-call]').forEach(b=>b.onclick=()=>Utils.callPhone(b.dataset.call));
    $$('[data-wa]').forEach(b=>b.onclick=()=>Utils.whatsapp(b.dataset.wa));

    $('#loansBody').innerHTML = loans.length ? loans.map(l=>{
      const m = Engine.loanMetrics(l.id);
      const st = Engine.loanStatus(l.id);
      return `
        <div class="list-item" data-loan="${l.id}">
          <div class="li-avatar" style="background:${st.code==='done'?'#e3f2fd':'#f0e3ba'}">${l.contractNumber}</div>
          <div class="li-main">
            <div class="li-title">عقد ${Utils.esc(l.customContractType||l.contractType)} · ${Utils.money(l.principalAmount)}</div>
            <div class="li-sub">${m.paidCount}/${m.totalCount} أقساط · ${Utils.fmtDate(l.startDate,'short')}</div>
          </div>
          <div class="li-right">
            <div class="amt"><span class="money">${Utils.moneyOnly(m.remaining)}</span></div>
            <div style="margin-top:4px"><span class="pill pill-${st.code}">${st.label}</span></div>
          </div>
        </div>
      `;
    }).join('') : `<div class="empty small"><p>لا توجد تمويلات — <a href="#" id="firstLoan">أضف أول تمويل</a></p></div>`;
    $$('[data-loan]').forEach(el=>el.onclick=()=>V.loanDetail(el.dataset.loan));
    const fl = $('#firstLoan'); if(fl) fl.onclick=(e)=>{e.preventDefault();V.loanEditor(null, c.id);};
  },

  /* ============================================================
     LOANS
     ============================================================ */
  loans(){
    const view = $('#view');
    view.innerHTML = `
      <div class="view-head">
        <div class="view-title">💼 التمويلات <span class="sub">(${DB.loans().length})</span></div>
        <div class="view-actions">
          <button class="btn-secondary small" id="expBtn">⬇ تصدير</button>
          <button class="btn-primary small" id="newBtn">＋ تمويل جديد</button>
        </div>
      </div>
      <div class="search-bar"><input id="q" placeholder="ابحث بالاسم أو رقم العقد..."></div>
      <div class="filter-bar" id="filters">
        <span class="chip active" data-f="all">الكل</span>
        <span class="chip" data-f="ok">🟢 منتظم</span>
        <span class="chip" data-f="partial">🟡 سداد جزئي</span>
        <span class="chip" data-f="grace">🟠 سماحية</span>
        <span class="chip" data-f="late">🔴 متأخر</span>
        <span class="chip" data-f="default">⚫ متعثر</span>
        <span class="chip" data-f="done">🔵 مكتمل</span>
      </div>
      <div class="card"><div id="loanList" class="card-body pad-0"></div></div>
    `;
    let filter = 'all';
    const render = () => {
      const q = ($('#q').value||'').trim().toLowerCase();
      let items = DB.loans().slice();
      items = items.filter(l => {
        const c = DB.client(l.clientId) || {};
        if (q && !((c.name||'').toLowerCase().includes(q) || String(l.contractNumber).includes(q))) return false;
        if (filter!=='all' && Engine.loanStatus(l.id).code !== filter) return false;
        return true;
      });
      items.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
      $('#loanList').innerHTML = items.map(l=>{
        const c = DB.client(l.clientId) || {name:'—'};
        const m = Engine.loanMetrics(l.id);
        const st = Engine.loanStatus(l.id);
        return `
          <div class="list-item" data-id="${l.id}">
            <div class="li-avatar">${l.contractNumber}</div>
            <div class="li-main">
              <div class="li-title">${Utils.esc(c.name)} <span class="muted small">· ${Utils.esc(l.customContractType||l.contractType)}</span></div>
              <div class="li-sub">${m.paidCount}/${m.totalCount} أقساط · بدأ ${Utils.fmtDate(l.startDate,'short')}</div>
            </div>
            <div class="li-right">
              <div class="amt"><span class="money">${Utils.moneyOnly(m.remaining)}</span></div>
              <div style="margin-top:4px"><span class="pill pill-${st.code}">${st.label}</span></div>
            </div>
          </div>
        `;
      }).join('') || `<div class="empty"><div class="icon">💼</div><p>لا توجد تمويلات</p></div>`;
      $$('#loanList [data-id]').forEach(el=>el.onclick=()=>V.loanDetail(el.dataset.id));
    };
    $('#q').oninput = render;
    $$('#filters .chip').forEach(c=>c.onclick=()=>{
      $$('#filters .chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active'); filter=c.dataset.f; render();
    });
    $('#newBtn').onclick = () => V.loanEditor();
    $('#expBtn').onclick = () => V.exportLoans();
    render();
  },

  loanEditor(existing=null, presetClientId=null){
    const l = existing || {};
    const s = DB.settings();
    const isNew = !existing;
    const clients = DB.clients();
    if (isNew && !clients.length){
      Utils.toast('أضف عميلاً أولاً','err');
      return V.clientEditor();
    }
    const types = s.contractTypes;
    const nextContract = isNew ? (s.lastContractNumber+1) : l.contractNumber;
    Utils.modal(`
      <div class="modal-head">
        <div class="modal-title">${isNew?'تمويل جديد':'تعديل التمويل'}</div>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-content">
        <form class="form" id="loanForm">
          <div class="form-row two">
            <div>
              <div class="form-lbl">العميل *</div>
              <select id="clientId" ${isNew?'':'disabled'}>
                <option value="">— اختر —</option>
                ${clients.map(c=>`<option value="${c.id}" ${(presetClientId||l.clientId)===c.id?'selected':''}>${Utils.esc(c.name)} — #${c.clientNumber}</option>`).join('')}
              </select>
            </div>
            <div>
              <div class="form-lbl">رقم العقد</div>
              <input id="contractNumber" type="number" value="${nextContract}">
            </div>
          </div>
          <div class="form-row two">
            <div>
              <div class="form-lbl">نوع العقد</div>
              <select id="contractType">
                ${types.map(t=>`<option ${t===(l.contractType||'أخرى')?'selected':''}>${Utils.esc(t)}</option>`).join('')}
              </select>
            </div>
            <div id="customTypeWrap" class="${(l.contractType||'أخرى')==='أخرى'?'':'hidden'}">
              <div class="form-lbl">اسم العقد المخصص</div>
              <input id="customContractType" value="${Utils.esc(l.customContractType||'')}">
            </div>
          </div>
          <div class="form-row two">
            <div>
              <div class="form-lbl">قيمة التمويل (رأس المال) *</div>
              <div class="amt-input"><input id="principalAmount" type="number" step="0.01" value="${l.principalAmount||''}"><span class="cur">ر.ي</span></div>
            </div>
            <div>
              <div class="form-lbl">قيمة الربح / المرابحة</div>
              <div class="amt-input"><input id="profitAmount" type="number" step="0.01" value="${l.profitAmount||''}"><span class="cur">ر.ي</span></div>
            </div>
          </div>
          <div class="row" style="justify-content:space-between;background:var(--panel-2);padding:10px 12px;border-radius:10px">
            <div><div class="form-lbl">الإجمالي المستحق</div><div class="big" id="totalDisplay"><span class="money">0</span></div></div>
            <div><div class="form-lbl">قيمة القسط الشهري</div><div class="big" id="monthlyDisplay"><span class="money">0</span></div></div>
          </div>
          <div class="form-row two">
            <div>
              <div class="form-lbl">عدد الأقساط *</div>
              <input id="installmentCount" type="number" min="1" value="${l.installmentCount||12}">
            </div>
            <div>
              <div class="form-lbl">مدة السماحية (يوم)</div>
              <input id="graceDays" type="number" min="0" value="${l.graceDays!=null?l.graceDays:s.graceDays}">
            </div>
          </div>
          <div class="form-row two">
            <div>
              <div class="form-lbl">تاريخ العقد</div>
              <input id="startDate" type="date" value="${l.startDate||Utils.ymd(new Date())}">
            </div>
            <div>
              <div class="form-lbl">تاريخ أول قسط</div>
              <input id="firstInstallmentDate" type="date" value="${l.firstInstallmentDate||Utils.ymd(Utils.addMonths(new Date(),1))}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-lbl">ملاحظات</div>
            <textarea id="notes" rows="2">${Utils.esc(l.notes||'')}</textarea>
          </div>
        </form>
      </div>
      <div class="modal-foot">
        ${!isNew?`<button class="btn-danger small" id="delBtn">حذف</button>`:''}
        <div class="spacer"></div>
        <button class="btn-ghost" data-close>إلغاء</button>
        <button class="btn-primary" id="saveBtn">${isNew?'إنشاء وتوليد الأقساط':'حفظ'}</button>
      </div>
    `, {wide:true});

    const recalc = () => {
      const p = Utils.toNum($('#principalAmount').value);
      const pr = Utils.toNum($('#profitAmount').value);
      const n = Math.max(1, Utils.toNum($('#installmentCount').value));
      const total = p+pr;
      const per = total/n;
      $('#totalDisplay').innerHTML = `<span class="money">${Utils.moneyOnly(total)}</span>`;
      $('#monthlyDisplay').innerHTML = `<span class="money">${Utils.moneyOnly(per)}</span>`;
    };
    ['principalAmount','profitAmount','installmentCount'].forEach(id=>$('#'+id).oninput=recalc);
    $('#contractType').onchange = e => {
      $('#customTypeWrap').classList.toggle('hidden', e.target.value!=='أخرى');
    };
    recalc();

    $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
    $('#saveBtn').onclick = () => {
      const clientId = $('#clientId').value;
      const principalAmount = Utils.toNum($('#principalAmount').value);
      if (!clientId){ Utils.toast('اختر العميل','err'); return; }
      if (!principalAmount){ Utils.toast('قيمة التمويل مطلوبة','err'); return; }
      const payload = {
        clientId,
        contractNumber: Utils.toNum($('#contractNumber').value) || undefined,
        contractType: $('#contractType').value,
        customContractType: $('#customContractType').value.trim(),
        principalAmount,
        profitAmount: Utils.toNum($('#profitAmount').value),
        installmentCount: Utils.toNum($('#installmentCount').value)||1,
        graceDays: Utils.toNum($('#graceDays').value),
        startDate: $('#startDate').value,
        firstInstallmentDate: $('#firstInstallmentDate').value,
        notes: $('#notes').value.trim(),
      };
      if (isNew){
        const num = payload.contractNumber;
        if (num) s.lastContractNumber = Math.max(s.lastContractNumber, num-1);
        const created = DB.addLoan(payload);
        if (num) { created.contractNumber = num; DB.save(); }
        Utils.toast('تم إنشاء التمويل وتوليد الأقساط','ok');
        Utils.closeModal();
        V.loanDetail(created.id);
      } else {
        // If installment schedule needs regeneration
        const needRegen = payload.principalAmount!==l.principalAmount ||
                          payload.profitAmount!==l.profitAmount ||
                          payload.installmentCount!==l.installmentCount ||
                          payload.firstInstallmentDate!==l.firstInstallmentDate;
        DB.updateLoan(l.id, payload);
        if (needRegen){
          const hasPayments = DB.loanPayments(l.id).length;
          if (hasPayments){ Utils.toast('تم الحفظ. لإعادة توليد الأقساط بعد تغيير القيمة/العدد، احذف الدفعات أولاً.','err',4000); }
          else DB.regenerateSchedule(l.id);
        }
        Utils.toast('تم الحفظ','ok');
        Utils.closeModal();
        V.loanDetail(l.id);
      }
    };
    const del = $('#delBtn');
    if (del) del.onclick = async () => {
      if (await Utils.confirm('حذف هذا التمويل وكل أقساطه ودفعاته؟',{danger:true, ok:'حذف'})){
        DB.deleteLoan(l.id);
        Utils.closeModal();
        Utils.toast('تم الحذف');
        V.loans();
      }
    };
  },

  loanDetail(id){
    const l = DB.loan(id); if (!l) return V.loans();
    if (window.App) App.parentRoute = 'loans';
    const c = DB.client(l.clientId) || {name:'—'};
    const m = Engine.loanMetrics(id);
    const st = Engine.loanStatus(id);
    const insts = DB.loanInstallments(id);
    const payments = DB.loanPayments(id);
    const view = $('#view');
    view.innerHTML = `
      <div class="view-head">
        <div class="view-title">
          <button class="btn-ghost small" id="back">‹ رجوع</button>
          عقد #${l.contractNumber} <span class="sub">${Utils.esc(c.name)}</span>
        </div>
        <div class="view-actions">
          <button class="btn-secondary small" id="editBtn">✎ تعديل</button>
          <button class="btn-secondary small" id="invBtn">🧾 فاتورة</button>
          <button class="btn-accent small" id="payBtn">💰 تسجيل دفعة</button>
        </div>
      </div>

      <div class="loan-summary">
        <div><div class="lbl">الحالة</div><div class="val"><span class="pill pill-${st.code}">${st.label}</span></div></div>
        <div><div class="lbl">إجمالي المستحق</div><div class="val"><span class="money">${Utils.moneyOnly(m.totalDue)}</span></div></div>
        <div><div class="lbl">مدفوع</div><div class="val"><span class="money">${Utils.moneyOnly(m.totalPaid)}</span></div></div>
        <div><div class="lbl">المتبقي</div><div class="val ${m.remaining>0?'danger':''}"><span class="money">${Utils.moneyOnly(m.remaining)}</span></div></div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="row between" style="margin-bottom:8px"><span class="muted small">التقدم في السداد</span><span class="small"><b>${m.percent}%</b> · ${m.paidCount}/${m.totalCount} قسط</span></div>
          <div class="progress"><div class="progress-fill" style="width:${m.percent}%"></div></div>
          ${m.repPaid>0?`<div class="small" style="margin-top:8px;color:var(--accent-2)">💠 دفعت من حسابك ${Utils.money(m.repPaid)} — مستحقة لك من العميل</div>`:''}
        </div>
      </div>

      <div class="tabs">
        <div class="tab active" data-tab="schedule">جدول الأقساط</div>
        <div class="tab" data-tab="payments">الدفعات (${payments.length})</div>
        <div class="tab" data-tab="details">تفاصيل العقد</div>
      </div>
      <div id="tabBody"></div>
    `;
    $('#back').onclick = () => V.loans();
    $('#editBtn').onclick = () => V.loanEditor(l);
    $('#invBtn').onclick = () => Invoices.loanInvoice(l.id);
    $('#payBtn').onclick = () => V.paymentEditor(l.id);

    const renderTab = tab => {
      $$('.tabs .tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
      const body = $('#tabBody');
      if (tab==='schedule'){
        body.innerHTML = `<div class="card"><div class="card-body pad-0">${insts.map(i=>{
          const s = Engine.installmentStatus(i, l);
          const label = { ok:'منتظم', partial:'سداد جزئي', grace:'سماحية', late:'متأخر', done:'مدفوع', default:'متعثر' }[s]||'—';
          const remain = Utils.round2(i.amount - i.paidAmount);
          return `
            <div class="inst-row" data-i="${i.id}">
              <div class="inst-num">${i.number}</div>
              <div class="inst-info">
                <div class="inst-date">${Utils.fmtDate(i.dueDate,'short')} <span class="muted small">· ${Utils.fmtRelative(i.dueDate)}</span></div>
                <div class="inst-meta">
                  ${i.paid ? `مدفوع في ${Utils.fmtDate(i.paidDate,'short')}`
                    : i.partial ? `مسدد ${Utils.money(i.paidAmount)} من ${Utils.money(i.amount)}`
                    : `المستحق: ${Utils.money(i.amount)}`}
                </div>
                ${i.repPaidAmount>0 ? `<div class="inst-meta rep-paid">💠 دفعت منها ${Utils.money(i.repPaidAmount)} من حسابك</div>`:''}
              </div>
              <div class="inst-right">
                ${i.paid ? '' : `<div class="amt"><span class="money">${Utils.moneyOnly(remain)}</span></div>`}
                <div class="status"><span class="pill pill-${s}">${label}</span></div>
              </div>
            </div>
          `;
        }).join('')}</div></div>`;
        $$('.inst-row').forEach(row=>row.onclick=()=>V.installmentActions(row.dataset.i));
      } else if (tab==='payments'){
        body.innerHTML = payments.length ? `<div class="card"><div class="card-body pad-0">${payments.map(p=>`
          <div class="list-item" data-p="${p.id}">
            <div class="li-avatar">💰</div>
            <div class="li-main">
              <div class="li-title"><span class="money">${Utils.money(p.amount)}</span></div>
              <div class="li-sub">${Utils.fmtDate(p.date,'short')} · ${Utils.esc(p.method)} ${p.fromRepAccount?' · من حسابك':''}</div>
            </div>
            <div class="li-right">
              <div class="small muted">${p.allocations.length} قسط</div>
              ${p.slips.length?`<div class="small">📎 ${p.slips.length}</div>`:''}
            </div>
          </div>
        `).join('')}</div></div>` : `<div class="empty small"><p>لا توجد دفعات مسجلة بعد</p></div>`;
        $$('.list-item[data-p]').forEach(el=>el.onclick=()=>V.paymentDetail(el.dataset.p));
      } else if (tab==='details'){
        body.innerHTML = `
          <div class="card"><div class="card-body">
            <div class="rpt-row"><span class="lbl">العميل</span><span class="val">${Utils.esc(c.name)} #${c.clientNumber}</span></div>
            <div class="rpt-row"><span class="lbl">نوع العقد</span><span class="val">${Utils.esc(l.customContractType||l.contractType)}</span></div>
            <div class="rpt-row"><span class="lbl">رأس المال</span><span class="val"><span class="money">${Utils.money(l.principalAmount)}</span></span></div>
            <div class="rpt-row"><span class="lbl">قيمة الربح</span><span class="val"><span class="money">${Utils.money(l.profitAmount)}</span></span></div>
            <div class="rpt-row"><span class="lbl">القسط الشهري</span><span class="val"><span class="money">${Utils.money(l.monthlyInstallment)}</span></span></div>
            <div class="rpt-row"><span class="lbl">عدد الأقساط</span><span class="val">${l.installmentCount}</span></div>
            <div class="rpt-row"><span class="lbl">فترة السماحية</span><span class="val">${l.graceDays} يوم</span></div>
            <div class="rpt-row"><span class="lbl">تاريخ العقد</span><span class="val">${Utils.fmtDate(l.startDate,'short')}</span></div>
            <div class="rpt-row"><span class="lbl">أول قسط</span><span class="val">${Utils.fmtDate(l.firstInstallmentDate,'short')}</span></div>
            ${l.notes?`<div class="rpt-row"><span class="lbl">ملاحظات</span><span class="val" style="max-width:60%;text-align:end">${Utils.esc(l.notes)}</span></div>`:''}
          </div></div>
        `;
      }
    };
    $$('.tabs .tab').forEach(t=>t.onclick=()=>renderTab(t.dataset.tab));
    renderTab('schedule');
  },

  installmentActions(instId){
    const inst = DB.installment(instId); if(!inst) return;
    const loan = DB.loan(inst.loanId);
    const c = DB.client(loan.clientId) || {};
    Utils.sheet(`
      <div class="card-title" style="margin-bottom:8px">قسط ${inst.number} — ${Utils.esc(c.name)}</div>
      <div class="rpt-row"><span class="lbl">تاريخ الاستحقاق</span><span class="val">${Utils.fmtDate(inst.dueDate)}</span></div>
      <div class="rpt-row"><span class="lbl">قيمة القسط</span><span class="val"><span class="money">${Utils.money(inst.amount)}</span></span></div>
      <div class="rpt-row"><span class="lbl">المدفوع</span><span class="val"><span class="money">${Utils.money(inst.paidAmount)}</span></span></div>
      <div class="rpt-row"><span class="lbl">المتبقي</span><span class="val"><span class="money">${Utils.money(inst.amount-inst.paidAmount)}</span></span></div>
      ${inst.repPaidAmount>0?`<div class="rpt-row"><span class="lbl">💠 دفعت من حسابك</span><span class="val">${Utils.money(inst.repPaidAmount)}</span></div>`:''}
      <div style="margin-top:14px;display:grid;gap:8px">
        ${!inst.paid ? `<button class="btn-primary" id="payThis">تسجيل دفعة لهذا القسط</button>` : ''}
        <button class="btn-secondary" id="viewLoan">عرض التمويل</button>
        ${c.phone ? `<button class="btn-secondary" id="waRem">💬 تذكير عبر واتساب</button>`:''}
      </div>
    `);
    const pt = $('#payThis'); if(pt) pt.onclick = ()=>{ Utils.closeSheet(); V.paymentEditor(inst.loanId, inst.amount-inst.paidAmount); };
    $('#viewLoan').onclick = ()=>{ Utils.closeSheet(); V.loanDetail(inst.loanId); };
    const wa = $('#waRem'); if (wa) wa.onclick = ()=>{
      const msg = `السلام عليكم ${c.name}\nتذكير بقسط رقم ${inst.number} بقيمة ${Utils.money(inst.amount-inst.paidAmount)}\nتاريخ الاستحقاق: ${Utils.fmtDate(inst.dueDate)}\n\n${DB.settings().repName}`;
      Utils.whatsapp(c.phone, msg);
    };
  },

  paymentPicker(){
    const loans = DB.loans().filter(l => Engine.loanStatus(l.id).code!=='done');
    if (!loans.length){ Utils.toast('لا توجد تمويلات نشطة','err'); return; }
    Utils.sheet(`
      <div class="card-title" style="margin-bottom:10px">اختر التمويل</div>
      <input id="qp" placeholder="بحث..." style="margin-bottom:10px">
      <div id="qpList" style="max-height:60vh;overflow-y:auto"></div>
    `);
    const render = () => {
      const q = ($('#qp').value||'').toLowerCase();
      const items = loans.filter(l=>{
        const c = DB.client(l.clientId) || {};
        return !q || (c.name||'').toLowerCase().includes(q) || String(l.contractNumber).includes(q);
      });
      $('#qpList').innerHTML = items.map(l=>{
        const c = DB.client(l.clientId) || {};
        const m = Engine.loanMetrics(l.id);
        return `<div class="list-item" data-l="${l.id}">
          <div class="li-avatar">${l.contractNumber}</div>
          <div class="li-main"><div class="li-title">${Utils.esc(c.name)}</div><div class="li-sub">متبقي ${Utils.money(m.remaining)}</div></div>
        </div>`;
      }).join('');
      $$('#qpList .list-item').forEach(el=>el.onclick=()=>{Utils.closeSheet();V.paymentEditor(el.dataset.l);});
    };
    $('#qp').oninput = render; render();
  },

  paymentEditor(loanId, defaultAmount=null){
    const loan = DB.loan(loanId); if(!loan) return;
    const c = DB.client(loan.clientId) || {};
    const m = Engine.loanMetrics(loanId);
    const s = DB.settings();
    const suggested = defaultAmount!=null ? defaultAmount : (m.nextDue ? m.nextDue.amount - m.nextDue.paidAmount : 0);
    Utils.modal(`
      <div class="modal-head">
        <div class="modal-title">تسجيل دفعة — ${Utils.esc(c.name)}</div>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-content">
        <form class="form" id="payForm">
          <div class="row between" style="background:var(--panel-2);padding:10px 12px;border-radius:10px">
            <div><div class="form-lbl">القسط القادم</div><div>${m.nextDue?`قسط ${m.nextDue.number} · ${Utils.money(m.nextDue.amount-m.nextDue.paidAmount)}`:'—'}</div></div>
            <div><div class="form-lbl">إجمالي المتبقي</div><div class="big"><span class="money">${Utils.moneyOnly(m.remaining)}</span></div></div>
          </div>
          <div class="form-row">
            <div class="form-lbl">قيمة الدفعة *</div>
            <div class="amt-input"><input id="amount" type="number" step="0.01" value="${suggested||''}" autofocus><span class="cur">ر.ي</span></div>
            <div class="form-hint">قابل لدفع أكثر من قسط أو دفعة جزئية — يتم التوزيع تلقائياً</div>
          </div>
          <div class="form-row two">
            <div>
              <div class="form-lbl">تاريخ الدفعة</div>
              <input id="date" type="date" value="${Utils.ymd(new Date())}">
            </div>
            <div>
              <div class="form-lbl">طريقة الدفع</div>
              <select id="method">
                <option>نقد</option>
                <option>تحويل بنكي</option>
                <option>حوالة</option>
                <option>محفظة مالية</option>
              </select>
            </div>
          </div>
          <div class="form-row" id="bankAcctWrap">
            <div class="form-lbl">الحساب المستلم</div>
            <select id="bankAcct">
              <option value="">— اختر —</option>
              ${s.bankAccounts.map(a=>`<option value="${a.id}">${Utils.esc(a.bankName)} — ${Utils.esc(a.accountNumber||'')}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="row" style="gap:12px">
              <label class="row" style="gap:6px"><input type="checkbox" id="fromRepAccount"> دفعت أنا من حسابي الشخصي بالنيابة عن العميل</label>
            </div>
            <div class="form-hint">في حالة تحديدها، ستُسجَّل كمبلغ مستحق لك من العميل</div>
          </div>
          <div class="form-row" id="repAcctWrap" style="display:none">
            <div class="form-lbl">حسابك الذي دفعت منه</div>
            <select id="repAcct">
              <option value="">— اختر —</option>
              ${s.repAccounts.map(a=>`<option value="${a.id}">${Utils.esc(a.bankName)} — ${Utils.esc(a.accountNumber||'')}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-lbl">إيصالات / صور الحوالة</div>
            <div class="thumb-grid" id="slips"></div>
          </div>
          <div class="form-row">
            <div class="form-lbl">ملاحظات</div>
            <textarea id="notes" rows="2"></textarea>
          </div>
        </form>
      </div>
      <div class="modal-foot">
        <div class="spacer"></div>
        <button class="btn-ghost" data-close>إلغاء</button>
        <button class="btn-primary" id="saveBtn">حفظ الدفعة</button>
      </div>
    `, {wide:true});

    let slips = [];
    const renderSlips = () => {
      $('#slips').innerHTML = slips.map((s,i)=>`
        <div class="thumb"><img src="${s}"><button class="rm" data-i="${i}">×</button></div>
      `).join('') + `<div class="thumb add" id="addCam">📷</div><div class="thumb add" id="addFile">＋</div>`;
      $$('#slips .rm').forEach(b=>b.onclick=()=>{ slips.splice(Number(b.dataset.i),1); renderSlips(); });
      $('#addCam').onclick = async ()=>{ const d = await Utils.pickImage({camera:true}); if(d){ slips.push(d); renderSlips(); }};
      $('#addFile').onclick = async ()=>{ const d = await Utils.pickImage(); if(d){ slips.push(d); renderSlips(); }};
    };
    renderSlips();

    $('#fromRepAccount').onchange = e => {
      $('#repAcctWrap').style.display = e.target.checked ? '' : 'none';
    };

    $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
    $('#saveBtn').onclick = () => {
      const amount = Utils.toNum($('#amount').value);
      if (!amount){ Utils.toast('قيمة الدفعة مطلوبة','err'); return; }
      if (amount > m.remaining+.01){
        if (!confirm(`المبلغ (${Utils.money(amount)}) أكبر من المتبقي (${Utils.money(m.remaining)}). المتابعة؟`)) return;
      }
      DB.addPayment({
        loanId, amount,
        date: $('#date').value,
        method: $('#method').value,
        bankAccountId: $('#bankAcct').value || null,
        repAccountId: $('#repAcct').value || null,
        fromRepAccount: $('#fromRepAccount').checked,
        slips,
        notes: $('#notes').value.trim(),
      });
      Utils.toast('تم حفظ الدفعة','ok');
      Utils.closeModal();
      V.loanDetail(loanId);
    };
  },

  paymentDetail(payId){
    const p = DB.payments().find(x=>x.id===payId); if(!p) return;
    const loan = DB.loan(p.loanId);
    const c = DB.client(loan.clientId) || {};
    Utils.modal(`
      <div class="modal-head">
        <div class="modal-title">تفاصيل الدفعة</div>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-content">
        <div class="rpt-row"><span class="lbl">العميل</span><span class="val">${Utils.esc(c.name)}</span></div>
        <div class="rpt-row"><span class="lbl">التمويل</span><span class="val">عقد #${loan.contractNumber}</span></div>
        <div class="rpt-row"><span class="lbl">القيمة</span><span class="val"><span class="money">${Utils.money(p.amount)}</span></span></div>
        <div class="rpt-row"><span class="lbl">التاريخ</span><span class="val">${Utils.fmtDate(p.date)}</span></div>
        <div class="rpt-row"><span class="lbl">طريقة الدفع</span><span class="val">${Utils.esc(p.method)}${p.fromRepAccount?' · من حسابك':''}</span></div>
        ${p.notes?`<div class="rpt-row"><span class="lbl">ملاحظات</span><span class="val">${Utils.esc(p.notes)}</span></div>`:''}
        <div class="divider"></div>
        <div class="form-lbl" style="margin-bottom:6px">تم توزيع الدفعة على:</div>
        ${p.allocations.map(a=>{
          const inst = DB.installment(a.installmentId);
          return `<div class="rpt-row"><span class="lbl">قسط ${inst?.number||'?'}</span><span class="val"><span class="money">${Utils.money(a.amount)}</span></span></div>`;
        }).join('')}
        ${p.excess>0?`<div class="rpt-row"><span class="lbl">فائض غير موزع</span><span class="val" style="color:var(--warn)">${Utils.money(p.excess)}</span></div>`:''}
        ${p.slips.length?`
          <div class="divider"></div>
          <div class="form-lbl">الإيصالات</div>
          <div class="slip-list">${p.slips.map(s=>`<div class="slip" data-src="${s}"><img src="${s}"></div>`).join('')}</div>
        `:''}
      </div>
      <div class="modal-foot">
        <button class="btn-danger small" id="delBtn">حذف الدفعة</button>
        <div class="spacer"></div>
        <button class="btn-primary" data-close>إغلاق</button>
      </div>
    `);
    $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
    $$('.slip').forEach(el=>el.onclick=()=>{
      const src = el.dataset.src;
      const w = window.open('','_blank'); w.document.write(`<img src="${src}" style="max-width:100%">`);
    });
    $('#delBtn').onclick = async () => {
      if (await Utils.confirm('حذف هذه الدفعة سيتراجع عن كل التوزيعات — متأكد؟',{danger:true, ok:'حذف'})){
        DB.deletePayment(p.id);
        Utils.toast('تم الحذف');
        Utils.closeModal();
        V.loanDetail(loan.id);
      }
    };
  },

  /* ============================================================
     INSTALLMENTS — Unified view
     ============================================================ */
  installments(){
    const view = $('#view');
    view.innerHTML = `
      <div class="view-head">
        <div class="view-title">📅 الأقساط</div>
        <div class="view-actions">
          <button class="btn-secondary small" id="expBtn">⬇ تصدير</button>
        </div>
      </div>
      <div class="search-bar"><input id="q" placeholder="بحث بالعميل..."></div>
      <div class="filter-bar" id="filters">
        <span class="chip active" data-f="all">الكل</span>
        <span class="chip" data-f="upcoming">القادمة</span>
        <span class="chip" data-f="today">اليوم</span>
        <span class="chip" data-f="week">هذا الأسبوع</span>
        <span class="chip" data-f="grace">🟠 سماحية</span>
        <span class="chip" data-f="late">🔴 متأخر</span>
        <span class="chip" data-f="partial">🟡 جزئي</span>
        <span class="chip" data-f="paid">🔵 مدفوع</span>
      </div>
      <div class="card"><div id="list" class="card-body pad-0"></div></div>
    `;
    let filter = 'all';
    const render = () => {
      const q = ($('#q').value||'').toLowerCase();
      const today = Utils.today();
      const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate()+7);
      let items = DB.installments().slice().map(i=>{
        const loan = DB.loan(i.loanId);
        const client = DB.client(loan.clientId) || {};
        return { i, loan, client, status: Engine.installmentStatus(i, loan) };
      });
      if (q) items = items.filter(x=> (x.client.name||'').toLowerCase().includes(q) || String(x.loan.contractNumber).includes(q));
      items = items.filter(x=>{
        const due = Utils.fromYmd(x.i.dueDate);
        if (filter==='all') return true;
        if (filter==='upcoming') return !x.i.paid && due>=today;
        if (filter==='today') return !x.i.paid && due && due.getTime()===today.getTime();
        if (filter==='week') return !x.i.paid && due && due>=today && due<=weekEnd;
        if (filter==='paid') return x.i.paid;
        return x.status===filter;
      });
      items.sort((a,b)=> new Date(a.i.dueDate)-new Date(b.i.dueDate));
      const labelOf = s => ({ok:'منتظم',partial:'سداد جزئي',grace:'سماحية',late:'متأخر',done:'مدفوع'}[s]||'—');
      $('#list').innerHTML = items.map(({i,loan,client,status})=>`
        <div class="inst-row" data-loan="${loan.id}" data-i="${i.id}">
          <div class="inst-num">${i.number}</div>
          <div class="inst-info">
            <div class="inst-date">${Utils.esc(client.name||'—')} · قسط ${i.number}</div>
            <div class="inst-meta">${Utils.fmtDate(i.dueDate,'short')} · ${Utils.fmtRelative(i.dueDate)}</div>
          </div>
          <div class="inst-right">
            <div class="amt"><span class="money">${Utils.moneyOnly(i.paid?i.amount:(i.amount-i.paidAmount))}</span></div>
            <div class="status"><span class="pill pill-${status}">${labelOf(status)}</span></div>
          </div>
        </div>
      `).join('') || `<div class="empty small"><p>لا توجد أقساط في هذا التصنيف</p></div>`;
      $$('#list .inst-row').forEach(el=>el.onclick=()=>V.installmentActions(el.dataset.i));
    };
    $('#q').oninput = render;
    $$('#filters .chip').forEach(c=>c.onclick=()=>{
      $$('#filters .chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active'); filter=c.dataset.f; render();
    });
    $('#expBtn').onclick = () => V.exportInstallments();
    render();
  },

  /* ============================================================
     CALENDAR
     ============================================================ */
  calendar(){
    const view = $('#view');
    let cursor = new Date();
    cursor.setDate(1);
    const render = () => {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const firstDow = new Date(y,m,1).getDay(); // Sun=0
      const daysInMonth = new Date(y,m+1,0).getDate();
      const cells = [];
      const start = 6; // Saturday first (Arabic convention)
      const off = (firstDow - start + 7) % 7;
      const prevDays = new Date(y,m,0).getDate();
      for (let k=0; k<off; k++) cells.push({d: prevDays-off+k+1, other:true, ym:new Date(y,m-1,1)});
      for (let k=1; k<=daysInMonth; k++) cells.push({d:k, other:false, ym:new Date(y,m,1)});
      while (cells.length%7) cells.push({d: cells.length-off-daysInMonth+1, other:true, ym:new Date(y,m+1,1)});
      const today = Utils.today();
      const monthInsts = DB.installments().filter(i=>{
        const dd = Utils.fromYmd(i.dueDate);
        return dd && dd.getFullYear()===y && dd.getMonth()===m;
      });
      // Month aggregates
      const monthDue = monthInsts.reduce((s,i)=>s+i.amount, 0);
      const monthPaid = monthInsts.reduce((s,i)=>s+(i.paidAmount||0), 0);
      const monthLate = monthInsts.filter(i=>!i.paid && Engine.installmentStatus(i, DB.loan(i.loanId))==='late').length;
      const monthUpcoming = monthInsts.filter(i=>!i.paid).length;

      view.innerHTML = `
        <div class="view-head">
          <div class="view-title">🗓️ التقويم</div>
        </div>
        <div class="cal-card">
          <div class="cal-toolbar">
            <button class="cal-nav" id="prev" aria-label="السابق">‹</button>
            <div class="cal-month">${Utils.fmtDate(cursor,'month')}</div>
            <button class="cal-nav" id="next" aria-label="التالي">›</button>
          </div>
          <div class="cal-summary">
            <div class="cal-sum-item">
              <div class="cal-sum-lbl">مستحق</div>
              <div class="cal-sum-val"><span class="money">${Utils.moneyOnly(monthDue)}</span></div>
            </div>
            <div class="cal-sum-item">
              <div class="cal-sum-lbl">مدفوع</div>
              <div class="cal-sum-val ok"><span class="money">${Utils.moneyOnly(monthPaid)}</span></div>
            </div>
            <div class="cal-sum-item">
              <div class="cal-sum-lbl">متأخر</div>
              <div class="cal-sum-val ${monthLate>0?'danger':''}">${monthLate}</div>
            </div>
            <div class="cal-sum-item">
              <div class="cal-sum-lbl">أقساط</div>
              <div class="cal-sum-val">${monthInsts.length}</div>
            </div>
          </div>
          <div class="cal-grid-new">
            ${['س','ح','ن','ث','ر','خ','ج'].map((h,i)=>`<div class="cal-head-new ${i===6?'weekend':''}">${h}</div>`).join('')}
            ${cells.map((c,idx)=>{
              const cd = new Date(c.ym.getFullYear(), c.ym.getMonth(), c.d);
              const isToday = !c.other && cd.getTime()===today.getTime();
              const dow = idx % 7;
              const isWeekend = dow === 6; // Friday column
              const dayInsts = c.other ? [] : monthInsts.filter(i => Utils.fromYmd(i.dueDate).getDate()===c.d);
              let statusClass = '';
              if (dayInsts.length){
                const anyLate = dayInsts.some(i=>!i.paid && Engine.installmentStatus(i, DB.loan(i.loanId))==='late');
                const anyGrace = dayInsts.some(i=>!i.paid && Engine.installmentStatus(i, DB.loan(i.loanId))==='grace');
                const allPaid = dayInsts.every(i=>i.paid);
                if (anyLate) statusClass = 'has-late';
                else if (anyGrace) statusClass = 'has-grace';
                else if (allPaid) statusClass = 'has-done';
                else statusClass = 'has-upcoming';
              }
              return `<div class="cal-cell-new ${c.other?'other':''} ${isToday?'today':''} ${isWeekend?'weekend':''} ${statusClass}" data-date="${Utils.ymd(cd)}">
                <div class="cal-num-new">${c.d}</div>
                ${dayInsts.length ? `<div class="cal-cnt">${dayInsts.length}</div>` : ''}
              </div>`;
            }).join('')}
          </div>
          <div class="cal-legend">
            <span><span class="dot" style="background:var(--primary)"></span>مستحقة</span>
            <span><span class="dot" style="background:var(--grace)"></span>سماحية</span>
            <span><span class="dot" style="background:var(--late)"></span>متأخر</span>
            <span><span class="dot" style="background:var(--done)"></span>مدفوع</span>
          </div>
        </div>
        <div class="cal-toolbar-bottom">
          <button class="btn-secondary small" id="todayBtn">📍 اليوم</button>
        </div>
        <div id="dayList" style="margin-top:12px"></div>
      `;
      $('#prev').onclick = () => { cursor.setMonth(cursor.getMonth()-1); render(); };
      $('#next').onclick = () => { cursor.setMonth(cursor.getMonth()+1); render(); };
      $('#todayBtn').onclick = () => { cursor = new Date(); cursor.setDate(1); render(); setTimeout(()=>showDay(Utils.ymd(new Date())), 100); };
      $$('.cal-cell-new').forEach(el => el.onclick = () => showDay(el.dataset.date));
    };
    const showDay = ymd => {
      const items = DB.installments().filter(i=>i.dueDate===ymd);
      $('#dayList').innerHTML = items.length ? `
        <div class="card">
          <div class="card-head"><div class="card-title">📅 ${Utils.fmtDate(ymd)}</div><span class="muted small">${items.length} قسط</span></div>
          <div class="card-body pad-0">
            ${items.map(i=>{
              const loan = DB.loan(i.loanId); const c = DB.client(loan.clientId)||{};
              const s = Engine.installmentStatus(i,loan);
              return `<div class="inst-row" data-i="${i.id}">
                <div class="inst-num">${i.number}</div>
                <div class="inst-info"><div class="inst-date">${Utils.esc(c.name)}</div><div class="inst-meta">قسط ${i.number}</div></div>
                <div class="inst-right"><div class="amt"><span class="money">${Utils.moneyOnly(i.amount-i.paidAmount)}</span></div><div class="status"><span class="pill pill-${s}">${ {ok:'منتظم',partial:'جزئي',grace:'سماحية',late:'متأخر',done:'مدفوع'}[s]}</span></div></div>
              </div>`;
            }).join('')}
          </div>
        </div>
      ` : `<div class="empty small"><div class="icon">📅</div><p>لا توجد أقساط في هذا اليوم</p></div>`;
      $$('#dayList .inst-row').forEach(r=>r.onclick=()=>V.installmentActions(r.dataset.i));
      // Scroll to the day list
      setTimeout(() => $('#dayList')?.scrollIntoView({behavior:'smooth', block:'start'}), 100);
    };
    render();
  },

  /* ============================================================
     REMINDERS
     ============================================================ */
  reminders(){
    const view = $('#view');
    const today = Utils.today();
    const inRange = i => {
      if (i.paid) return false;
      const d = Utils.fromYmd(i.dueDate);
      const diff = Utils.diffDays(d, today);
      return diff >= -30 && diff <= (DB.settings().remindDaysBefore||3);
    };
    const items = DB.installments().filter(inRange).map(i=>{
      const loan = DB.loan(i.loanId); const c = DB.client(loan.clientId)||{};
      const s = Engine.installmentStatus(i, loan);
      return {i, loan, c, s};
    });
    items.sort((a,b)=> new Date(a.i.dueDate)-new Date(b.i.dueDate));
    view.innerHTML = `
      <div class="view-head">
        <div class="view-title">🔔 التذكيرات <span class="sub">(${items.length})</span></div>
        <div class="view-actions">
          <button class="btn-secondary small" id="setBtn">⚙ الإعداد</button>
        </div>
      </div>
      <div class="card"><div class="card-body">
        <p class="small muted">أقساط قريبة الاستحقاق أو متأخرة تحتاج تذكير — اضغط على أي عميل لإرسال رسالة واتساب جاهزة.</p>
      </div></div>
      <div class="card"><div class="card-body pad-0">
        ${items.length ? items.map(({i,loan,c,s})=>{
          const label = {ok:'قريب',grace:'سماحية',late:'متأخر',partial:'جزئي'}[s]||'—';
          return `
            <div class="list-item">
              <div class="li-avatar">${Utils.esc((c.name||'?').slice(0,1))}</div>
              <div class="li-main">
                <div class="li-title">${Utils.esc(c.name||'—')}</div>
                <div class="li-sub">قسط ${i.number} · ${Utils.fmtDate(i.dueDate,'short')} · ${Utils.fmtRelative(i.dueDate)}</div>
              </div>
              <div class="li-right" style="display:flex;gap:6px;align-items:center">
                <div>
                  <div class="amt"><span class="money">${Utils.moneyOnly(i.amount-i.paidAmount)}</span></div>
                  <div style="margin-top:4px"><span class="pill pill-${s}">${label}</span></div>
                </div>
              </div>
              <div style="display:flex;gap:4px">
                ${c.phone?`<button class="action-tap" data-wa='${JSON.stringify({p:c.phone,i:i.id})}'>💬</button>`:''}
                ${c.phone?`<button class="action-tap" data-call="${Utils.esc(c.phone)}">📞</button>`:''}
              </div>
            </div>
          `;
        }).join('') : `<div class="empty"><div class="icon">✅</div><p>لا توجد تذكيرات نشطة</p></div>`}
      </div></div>
    `;
    $$('[data-call]').forEach(b=>b.onclick=()=>Utils.callPhone(b.dataset.call));
    $$('[data-wa]').forEach(b=>b.onclick=()=>{
      const {p,i:instId} = JSON.parse(b.dataset.wa);
      const inst = DB.installment(instId);
      const client = DB.client(DB.loan(inst.loanId).clientId);
      const msg = `السلام عليكم ${client.name}\n\nتذكير بقسط رقم ${inst.number} بقيمة ${Utils.money(inst.amount-inst.paidAmount)} ريال يمني\nتاريخ الاستحقاق: ${Utils.fmtDate(inst.dueDate)}\n\nنرجو التكرم بالسداد في أقرب فرصة.\n\n${DB.settings().repName||''}`;
      Utils.whatsapp(p, msg);
    });
    $('#setBtn').onclick = () => App.go('settings');
  },

  /* ============================================================
     REPORTS
     ============================================================ */
  reports(){
    const p = Engine.portfolio();
    const view = $('#view');
    view.innerHTML = `
      <div class="view-head">
        <div class="view-title">📈 التقارير</div>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title">نظرة عامة</div></div>
        <div class="card-body">
          <div class="rpt-row"><span class="lbl">عدد العملاء</span><span class="val">${p.clients}</span></div>
          <div class="rpt-row"><span class="lbl">عدد التمويلات</span><span class="val">${p.loans}</span></div>
          <div class="rpt-row"><span class="lbl">تمويلات نشطة</span><span class="val">${p.activeLoans}</span></div>
          <div class="rpt-row"><span class="lbl">تمويلات مكتملة</span><span class="val" style="color:var(--done)">${p.completedLoans}</span></div>
          <div class="rpt-row"><span class="lbl">تمويلات متعثرة</span><span class="val" style="color:var(--default)">${p.defaultedLoans}</span></div>
          <div class="divider"></div>
          <div class="rpt-row"><span class="lbl">إجمالي رأس المال</span><span class="val"><span class="money">${Utils.money(p.totalPrincipal)}</span></span></div>
          <div class="rpt-row"><span class="lbl">إجمالي الأرباح</span><span class="val"><span class="money">${Utils.money(p.totalProfit)}</span></span></div>
          <div class="rpt-row"><span class="lbl">إجمالي المُحصَّل</span><span class="val" style="color:var(--ok)"><span class="money">${Utils.money(p.totalCollected)}</span></span></div>
          <div class="rpt-row"><span class="lbl">إجمالي المتبقي</span><span class="val"><span class="money">${Utils.money(p.totalRemaining)}</span></span></div>
          <div class="rpt-row"><span class="lbl">إجمالي المتأخرات</span><span class="val" style="color:var(--danger)"><span class="money">${Utils.money(p.overdueAmount)}</span></span></div>
          <div class="rpt-row"><span class="lbl">مدفوع من حساب المندوب</span><span class="val" style="color:var(--accent-2)"><span class="money">${Utils.money(p.repOwed)}</span></span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div class="card-title">تقارير تفصيلية</div></div>
        <div class="card-body">
          <div style="display:grid;gap:8px">
            <button class="btn-secondary" id="rptClients">👥 كشف حساب موحد لجميع العملاء</button>
            <button class="btn-secondary" id="rptLate">🔴 تقرير المتأخرات</button>
            <button class="btn-secondary" id="rptRep">💠 دفعات المندوب المستحقة</button>
            <button class="btn-secondary" id="rptCollections">📆 تحصيلات الشهر</button>
          </div>
        </div>
      </div>
    `;
    $('#rptClients').onclick = () => V.reportClients();
    $('#rptLate').onclick = () => V.reportLate();
    $('#rptRep').onclick = () => V.reportRep();
    $('#rptCollections').onclick = () => V.reportCollections();
  },

  reportLate(){
    const items = [];
    for (const inst of DB.installments()){
      if (inst.paid) continue;
      const loan = DB.loan(inst.loanId);
      if (Engine.installmentStatus(inst,loan)==='late'){
        const c = DB.client(loan.clientId)||{};
        items.push({inst,loan,c, days: Utils.diffDays(Utils.today(), Utils.fromYmd(inst.dueDate))});
      }
    }
    items.sort((a,b)=> b.days-a.days);
    Utils.modal(`
      <div class="modal-head"><div class="modal-title">تقرير المتأخرات (${items.length})</div><button class="modal-close" data-close>×</button></div>
      <div class="modal-content">
        ${items.length ? `
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:var(--panel-2)"><th style="padding:8px;text-align:start">العميل</th><th style="padding:8px;text-align:start">قسط</th><th style="padding:8px;text-align:start">التاريخ</th><th style="padding:8px;text-align:start">التأخير</th><th style="padding:8px;text-align:end">المتبقي</th></tr></thead>
            <tbody>
            ${items.map(({inst,c,days})=>`
              <tr style="border-bottom:1px solid var(--line-2)">
                <td style="padding:8px">${Utils.esc(c.name||'—')}</td>
                <td style="padding:8px">${inst.number}</td>
                <td style="padding:8px">${Utils.fmtDate(inst.dueDate,'short')}</td>
                <td style="padding:8px;color:var(--danger)"><b>${days} يوم</b></td>
                <td style="padding:8px;text-align:end"><span class="money">${Utils.money(inst.amount-inst.paidAmount)}</span></td>
              </tr>
            `).join('')}
            </tbody>
          </table>
        ` : `<div class="empty small">✅ لا توجد متأخرات</div>`}
      </div>
      <div class="modal-foot">
        <button class="btn-secondary" id="expBtn">تصدير Excel</button>
        <div class="spacer"></div>
        <button class="btn-primary" data-close>إغلاق</button>
      </div>
    `, {wide:true});
    $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
    $('#expBtn').onclick = () => {
      Utils.exportExcel(items.map(({inst,loan,c,days})=>({
        العميل: c.name, هاتف: c.phone, عقد: loan.contractNumber, قسط: inst.number,
        الاستحقاق: inst.dueDate, أيام_التأخير: days, المتبقي: inst.amount-inst.paidAmount,
      })), 'المتأخرات', 'تقرير-المتأخرات.xlsx');
    };
  },
  reportRep(){
    const items = [];
    for (const inst of DB.installments()){
      if (!inst.repPaidAmount) continue;
      const loan = DB.loan(inst.loanId); const c = DB.client(loan.clientId)||{};
      items.push({inst, loan, c});
    }
    Utils.modal(`
      <div class="modal-head"><div class="modal-title">دفعات المندوب المستحقة (${items.length})</div><button class="modal-close" data-close>×</button></div>
      <div class="modal-content">
        ${items.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--panel-2)"><th style="padding:8px;text-align:start">العميل</th><th style="padding:8px">قسط</th><th style="padding:8px">التاريخ</th><th style="padding:8px;text-align:end">المدفوع من حسابك</th></tr></thead>
          <tbody>${items.map(({inst,c})=>`<tr style="border-bottom:1px solid var(--line-2)"><td style="padding:8px">${Utils.esc(c.name)}</td><td style="padding:8px">${inst.number}</td><td style="padding:8px">${Utils.fmtDate(inst.dueDate,'short')}</td><td style="padding:8px;text-align:end;color:var(--accent-2)"><b><span class="money">${Utils.money(inst.repPaidAmount)}</span></b></td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="3" style="padding:10px"><b>الإجمالي</b></td><td style="padding:10px;text-align:end"><b><span class="money">${Utils.money(items.reduce((s,x)=>s+x.inst.repPaidAmount,0))}</span></b></td></tr></tfoot>
        </table>`:`<div class="empty small"><p>لا توجد دفعات من حسابك</p></div>`}
      </div>
      <div class="modal-foot"><div class="spacer"></div><button class="btn-primary" data-close>إغلاق</button></div>
    `,{wide:true});
    $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
  },
  reportCollections(){
    const monthYmd = Utils.ymd(new Date()).slice(0,7); // YYYY-MM
    const items = DB.payments().filter(p => (p.date||'').startsWith(monthYmd));
    items.sort((a,b)=> new Date(b.date)-new Date(a.date));
    const total = items.reduce((s,x)=>s+x.amount,0);
    Utils.modal(`
      <div class="modal-head"><div class="modal-title">تحصيلات ${Utils.fmtDate(new Date(),'month')}</div><button class="modal-close" data-close>×</button></div>
      <div class="modal-content">
        <div class="big" style="text-align:center;padding:12px;background:var(--panel-2);border-radius:10px;margin-bottom:12px"><span class="money">${Utils.money(total)}</span></div>
        ${items.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--panel-2)"><th style="padding:8px;text-align:start">التاريخ</th><th style="padding:8px;text-align:start">العميل</th><th style="padding:8px">طريقة</th><th style="padding:8px;text-align:end">القيمة</th></tr></thead>
          <tbody>${items.map(p=>{const l=DB.loan(p.loanId);const c=DB.client(l.clientId)||{};return `<tr style="border-bottom:1px solid var(--line-2)"><td style="padding:8px">${Utils.fmtDate(p.date,'short')}</td><td style="padding:8px">${Utils.esc(c.name)}</td><td style="padding:8px">${Utils.esc(p.method)}</td><td style="padding:8px;text-align:end"><b><span class="money">${Utils.money(p.amount)}</span></b></td></tr>`;}).join('')}</tbody>
        </table>` : `<div class="empty small"><p>لا توجد تحصيلات هذا الشهر</p></div>`}
      </div>
      <div class="modal-foot">
        <button class="btn-secondary" id="exp">تصدير Excel</button>
        <div class="spacer"></div>
        <button class="btn-primary" data-close>إغلاق</button>
      </div>
    `,{wide:true});
    $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
    $('#exp').onclick = () => {
      Utils.exportExcel(items.map(p=>{const l=DB.loan(p.loanId);const c=DB.client(l.clientId)||{};return {التاريخ:p.date,العميل:c.name,عقد:l.contractNumber,طريقة:p.method,القيمة:p.amount,ملاحظات:p.notes};}),'تحصيلات','تحصيلات-'+monthYmd+'.xlsx');
    };
  },
  reportClients(){
    const rows = DB.clients().map(c=>{
      const loans = DB.clientLoans(c.id);
      const totals = loans.reduce((acc,l)=>{
        const m = Engine.loanMetrics(l.id);
        acc.due += m.totalDue; acc.paid += m.totalPaid; acc.rem += m.remaining; acc.rep += m.repPaid; return acc;
      }, {due:0,paid:0,rem:0,rep:0});
      return { c, loans, ...totals };
    });
    rows.sort((a,b)=> b.rem-a.rem);
    Utils.modal(`
      <div class="modal-head"><div class="modal-title">كشف حساب موحد — العملاء</div><button class="modal-close" data-close>×</button></div>
      <div class="modal-content">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:var(--panel-2)"><th style="padding:8px;text-align:start">#</th><th style="padding:8px;text-align:start">العميل</th><th style="padding:8px">تمويل</th><th style="padding:8px;text-align:end">إجمالي</th><th style="padding:8px;text-align:end">مدفوع</th><th style="padding:8px;text-align:end">متبقي</th></tr></thead>
          <tbody>${rows.map(r=>`<tr style="border-bottom:1px solid var(--line-2)"><td style="padding:8px">${r.c.clientNumber}</td><td style="padding:8px">${Utils.esc(r.c.name)}</td><td style="padding:8px">${r.loans.length}</td><td style="padding:8px;text-align:end"><span class="money">${Utils.money(r.due)}</span></td><td style="padding:8px;text-align:end"><span class="money">${Utils.money(r.paid)}</span></td><td style="padding:8px;text-align:end"><b><span class="money">${Utils.money(r.rem)}</span></b></td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class="modal-foot"><button class="btn-secondary" id="exp">تصدير Excel</button><div class="spacer"></div><button class="btn-primary" data-close>إغلاق</button></div>
    `,{wide:true});
    $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
    $('#exp').onclick = () => {
      Utils.exportExcel(rows.map(r=>({رقم:r.c.clientNumber,العميل:r.c.name,هاتف:r.c.phone,عدد_التمويلات:r.loans.length,الإجمالي:r.due,مدفوع:r.paid,متبقي:r.rem,مدفوع_من_حساب_المندوب:r.rep})),'العملاء','كشف-العملاء.xlsx');
    };
  },

  /* ============================================================
     SETTINGS
     ============================================================ */
  settings(){
    const s = DB.settings();
    const view = $('#view');
    view.innerHTML = `
      <div class="view-head"><div class="view-title">⚙️ الإعدادات</div></div>

      <div class="card"><div class="card-head"><div class="card-title">بيانات المندوب</div></div>
        <div class="card-body">
          <div class="form-row"><div class="form-lbl">اسم المندوب</div><input id="setRepName" value="${Utils.esc(s.repName)}"></div>
          <div class="form-row"><div class="form-lbl">هاتف المندوب</div><input id="setRepPhone" value="${Utils.esc(s.repPhone)}"></div>
          <div class="form-row"><div class="form-lbl">العنوان / المكتب</div><input id="setRepAddress" value="${Utils.esc(s.repAddress)}"></div>
        </div>
      </div>

      <div class="card"><div class="card-head"><div class="card-title">القيم الافتراضية</div></div>
        <div class="card-body">
          <div class="form-row two">
            <div><div class="form-lbl">فترة السماحية (يوم)</div><input id="setGrace" type="number" value="${s.graceDays}"></div>
            <div><div class="form-lbl">تذكير قبل الاستحقاق (يوم)</div><input id="setRemind" type="number" value="${s.remindDaysBefore}"></div>
          </div>
          <div class="form-row"><div class="form-lbl">تذييل الفاتورة</div><input id="setFooter" value="${Utils.esc(s.invoiceFooter)}"></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div class="card-title">أنواع العقود</div><button class="btn-primary small" id="addType">＋</button></div>
        <div class="card-body pad-0" id="typesList"></div>
      </div>

      <div class="card">
        <div class="card-head"><div class="card-title">حسابات الاستلام البنكية</div><button class="btn-primary small" id="addBank">＋</button></div>
        <div class="card-body pad-0" id="banksList"></div>
      </div>

      <div class="card">
        <div class="card-head"><div class="card-title">حسابات المندوب الشخصية</div><button class="btn-primary small" id="addRepAcct">＋</button></div>
        <div class="card-body pad-0" id="repAcctList"></div>
      </div>

      <div class="card"><div class="card-head"><div class="card-title">الأمان</div></div>
        <div class="card-body">
          <button class="btn-secondary" id="pwBtn">🔒 تغيير كلمة المرور</button>
        </div>
      </div>

      <div class="card"><div class="card-head"><div class="card-title">النسخ الاحتياطي</div></div>
        <div class="card-body" style="display:grid;gap:8px">
          <button class="btn-secondary" id="expAll">⬇ تصدير كل البيانات (JSON)</button>
          <button class="btn-secondary" id="impAll">⬆ استيراد نسخة احتياطية</button>
          <button class="btn-danger" id="resetAll">🗑️ حذف كل البيانات</button>
        </div>
      </div>

      <div class="card"><div class="card-body" style="text-align:center;color:var(--muted);font-size:12px">فهد التميمي · v1.0.0 · تطوير hsn.pmt</div></div>
    `;

    const bindSave = (sel, key, transform=v=>v) => {
      $(sel).onblur = () => { DB.updateSettings({ [key]: transform($(sel).value) }); Utils.toast('تم الحفظ','ok', 900); };
    };
    bindSave('#setRepName','repName',v=>v.trim());
    bindSave('#setRepPhone','repPhone',v=>v.trim());
    bindSave('#setRepAddress','repAddress',v=>v.trim());
    bindSave('#setGrace','graceDays',v=>Utils.toNum(v));
    bindSave('#setRemind','remindDaysBefore',v=>Utils.toNum(v));
    bindSave('#setFooter','invoiceFooter',v=>v);

    // Contract types
    const renderTypes = () => {
      $('#typesList').innerHTML = s.contractTypes.map((t,i)=>`
        <div class="list-item"><div class="li-avatar">📋</div>
          <div class="li-main"><div class="li-title">${Utils.esc(t)}</div></div>
          <div class="li-right"><button class="btn-ghost small" data-rm="${i}">حذف</button></div>
        </div>
      `).join('');
      $$('[data-rm]').forEach(b=>b.onclick=()=>{
        s.contractTypes.splice(Number(b.dataset.rm),1); DB.save(); renderTypes();
      });
    };
    renderTypes();
    $('#addType').onclick = ()=>{
      const t = prompt('اسم نوع العقد:');
      if (t){ s.contractTypes.push(t.trim()); DB.save(); renderTypes(); }
    };

    // Banks
    const renderBanks = () => {
      $('#banksList').innerHTML = s.bankAccounts.length ? s.bankAccounts.map(a=>`
        <div class="list-item">
          <div class="li-avatar">🏦</div>
          <div class="li-main">
            <div class="li-title">${Utils.esc(a.bankName)}</div>
            <div class="li-sub">${Utils.esc(a.accountName||'')} · ${Utils.esc(a.accountNumber||'')}</div>
          </div>
          <div class="li-right"><button class="btn-ghost small" data-edit="${a.id}">✎</button> <button class="btn-ghost small" data-rm="${a.id}">×</button></div>
        </div>
      `).join('') : `<div class="empty small">لم يتم إضافة حسابات بنكية بعد</div>`;
      $$('#banksList [data-rm]').forEach(b=>b.onclick=()=>{
        s.bankAccounts = s.bankAccounts.filter(a=>a.id!==b.dataset.rm); DB.save(); renderBanks();
      });
      $$('#banksList [data-edit]').forEach(b=>b.onclick=()=>bankEditor(s.bankAccounts.find(a=>a.id===b.dataset.edit)));
    };
    const bankEditor = (existing) => {
      const a = existing || {id:Utils.uid('ba')};
      Utils.modal(`
        <div class="modal-head"><div class="modal-title">${existing?'تعديل':'إضافة'} حساب بنكي</div><button class="modal-close" data-close>×</button></div>
        <div class="modal-content"><form class="form">
          <div class="form-row"><div class="form-lbl">اسم البنك</div><input id="bBank" value="${Utils.esc(a.bankName||'')}"></div>
          <div class="form-row"><div class="form-lbl">اسم صاحب الحساب</div><input id="bName" value="${Utils.esc(a.accountName||'')}"></div>
          <div class="form-row"><div class="form-lbl">رقم الحساب</div><input id="bNum" value="${Utils.esc(a.accountNumber||'')}"></div>
          <div class="form-row"><div class="form-lbl">IBAN (اختياري)</div><input id="bIban" value="${Utils.esc(a.iban||'')}"></div>
        </form></div>
        <div class="modal-foot"><div class="spacer"></div><button class="btn-ghost" data-close>إلغاء</button><button class="btn-primary" id="saveB">حفظ</button></div>
      `);
      $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
      $('#saveB').onclick = () => {
        Object.assign(a, { bankName:$('#bBank').value.trim(), accountName:$('#bName').value.trim(), accountNumber:$('#bNum').value.trim(), iban:$('#bIban').value.trim() });
        if (!existing) s.bankAccounts.push(a);
        DB.save(); Utils.closeModal(); renderBanks();
      };
    };
    renderBanks();
    $('#addBank').onclick = () => bankEditor();

    // Rep accounts (identical structure)
    const renderRep = () => {
      $('#repAcctList').innerHTML = s.repAccounts.length ? s.repAccounts.map(a=>`
        <div class="list-item">
          <div class="li-avatar">💠</div>
          <div class="li-main"><div class="li-title">${Utils.esc(a.bankName)}</div><div class="li-sub">${Utils.esc(a.accountNumber||'')}</div></div>
          <div class="li-right"><button class="btn-ghost small" data-edit="${a.id}">✎</button> <button class="btn-ghost small" data-rm="${a.id}">×</button></div>
        </div>
      `).join('') : `<div class="empty small">لم يتم إضافة حسابات بعد</div>`;
      $$('#repAcctList [data-rm]').forEach(b=>b.onclick=()=>{
        s.repAccounts = s.repAccounts.filter(a=>a.id!==b.dataset.rm); DB.save(); renderRep();
      });
      $$('#repAcctList [data-edit]').forEach(b=>b.onclick=()=>repEditor(s.repAccounts.find(a=>a.id===b.dataset.edit)));
    };
    const repEditor = (existing) => {
      const a = existing || {id:Utils.uid('ra')};
      Utils.modal(`
        <div class="modal-head"><div class="modal-title">${existing?'تعديل':'إضافة'} حساب المندوب</div><button class="modal-close" data-close>×</button></div>
        <div class="modal-content"><form class="form">
          <div class="form-row"><div class="form-lbl">اسم البنك / المحفظة</div><input id="rBank" value="${Utils.esc(a.bankName||'')}"></div>
          <div class="form-row"><div class="form-lbl">رقم الحساب</div><input id="rNum" value="${Utils.esc(a.accountNumber||'')}"></div>
        </form></div>
        <div class="modal-foot"><div class="spacer"></div><button class="btn-ghost" data-close>إلغاء</button><button class="btn-primary" id="saveR">حفظ</button></div>
      `);
      $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
      $('#saveR').onclick = () => {
        Object.assign(a, { bankName:$('#rBank').value.trim(), accountNumber:$('#rNum').value.trim() });
        if (!existing) s.repAccounts.push(a);
        DB.save(); Utils.closeModal(); renderRep();
      };
    };
    renderRep();
    $('#addRepAcct').onclick = () => repEditor();

    // Password
    $('#pwBtn').onclick = () => {
      Utils.modal(`
        <div class="modal-head"><div class="modal-title">تغيير كلمة المرور</div><button class="modal-close" data-close>×</button></div>
        <div class="modal-content"><form class="form">
          ${s.passwordHash?`<div class="form-row"><div class="form-lbl">كلمة المرور الحالية</div><input id="oldPw" type="password"></div>`:''}
          <div class="form-row"><div class="form-lbl">كلمة المرور الجديدة</div><input id="newPw" type="password"></div>
          <div class="form-row"><div class="form-lbl">تأكيد</div><input id="newPw2" type="password"></div>
        </form></div>
        <div class="modal-foot"><div class="spacer"></div><button class="btn-ghost" data-close>إلغاء</button><button class="btn-primary" id="savePw">حفظ</button></div>
      `);
      $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
      $('#savePw').onclick = async () => {
        if (s.passwordHash){
          const old = await Utils.sha256($('#oldPw').value);
          if (old !== s.passwordHash){ Utils.toast('كلمة المرور الحالية خطأ','err'); return; }
        }
        const p1 = $('#newPw').value; const p2 = $('#newPw2').value;
        if (!p1 || p1.length<4){ Utils.toast('كلمة المرور قصيرة','err'); return; }
        if (p1!==p2){ Utils.toast('كلمتا المرور غير متطابقتين','err'); return; }
        s.passwordHash = await Utils.sha256(p1);
        DB.save();
        Utils.closeModal();
        Utils.toast('تم تحديث كلمة المرور','ok');
      };
    };

    $('#expAll').onclick = async () => {
      const filename = `fahd-tamimi-backup-${Utils.ymd(new Date())}.json`;
      await Utils.saveFile(DB.exportAll(), filename, 'application/json');
    };
    $('#impAll').onclick = async () => {
      const file = await Utils.pickFile('.json');
      if (!file) return;
      const text = await file.text();
      if (!await Utils.confirm('استيراد النسخة سيستبدل كل البيانات الحالية. متأكد؟',{danger:true, ok:'استيراد'})) return;
      if (DB.importAll(text)){ Utils.toast('تم الاستيراد','ok'); V.settings(); }
      else Utils.toast('ملف غير صالح','err');
    };
    $('#resetAll').onclick = async () => {
      if (!await Utils.confirm('سيتم مسح كل البيانات (العملاء والتمويلات والدفعات) بشكل نهائي. متأكد؟',{danger:true, ok:'حذف الكل'})) return;
      DB.resetAll(); Utils.toast('تم المسح'); location.reload();
    };
  },

  /* ============================================================
     EXPORT / IMPORT (Clients, Loans, Installments)
     ============================================================ */
  exportClients(){
    const rows = DB.clients().map(c=>({
      رقم_العميل: c.clientNumber, الاسم: c.name, الهاتف: c.phone, الهوية: c.idNumber,
      الكفيل: c.guarantorName, هاتف_الكفيل: c.guarantorPhone, العنوان: c.address, ملاحظات: c.notes
    }));
    Utils.exportExcel(rows, 'العملاء', 'العملاء.xlsx');
  },
  async importClients(){
    const data = await Utils.importExcel(); if (!data) return;
    const sheet = Object.values(data)[0]; if (!sheet || !sheet.length){ Utils.toast('الملف فارغ','err'); return; }
    let added = 0;
    for (const r of sheet){
      const name = r['الاسم']||r['name']; if (!name) continue;
      DB.addClient({
        clientNumber: r['رقم_العميل']||r['رقم العميل']||undefined,
        name, phone: String(r['الهاتف']||r['phone']||''),
        idNumber: r['الهوية']||r['id']||'', guarantorName: r['الكفيل']||'',
        guarantorPhone: String(r['هاتف_الكفيل']||r['هاتف الكفيل']||''),
        address: r['العنوان']||'', notes: r['ملاحظات']||''
      }); added++;
    }
    Utils.toast(`تم استيراد ${added} عميل`,'ok');
    V.clients();
  },
  exportLoans(){
    const rows = DB.loans().map(l=>{
      const c = DB.client(l.clientId)||{}; const m = Engine.loanMetrics(l.id); const st = Engine.loanStatus(l.id);
      return { عقد: l.contractNumber, العميل: c.name, نوع: l.customContractType||l.contractType,
        رأس_المال: l.principalAmount, الربح: l.profitAmount, الإجمالي: l.totalAmount,
        عدد_الأقساط: l.installmentCount, القسط_الشهري: l.monthlyInstallment,
        تاريخ_البدء: l.startDate, أول_قسط: l.firstInstallmentDate,
        مدفوع: m.totalPaid, متبقي: m.remaining, الحالة: st.label };
    });
    Utils.exportExcel(rows, 'التمويلات', 'التمويلات.xlsx');
  },
  exportInstallments(){
    const rows = DB.installments().map(i=>{
      const l = DB.loan(i.loanId); const c = DB.client(l.clientId)||{};
      const s = Engine.installmentStatus(i,l);
      return { عقد: l.contractNumber, العميل: c.name, قسط: i.number, الاستحقاق: i.dueDate,
        القيمة: i.amount, المدفوع: i.paidAmount, المتبقي: i.amount-i.paidAmount,
        الحالة: {ok:'منتظم',partial:'جزئي',grace:'سماحية',late:'متأخر',done:'مدفوع'}[s]||'—',
        من_حساب_المندوب: i.repPaidAmount||0 };
    });
    Utils.exportExcel(rows, 'الأقساط', 'الأقساط.xlsx');
  },
};
window.V = V;
