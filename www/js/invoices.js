/* ===== Invoices =====
   Two templates:
   1. Internal-rep version — shows bank/rep deposit slips
   2. Client version — hides slips
   3. Client statement — all loans + installments summary
*/

const Invoices = {

  nextInvoiceNumber(){
    const n = (DB.settings().lastInvoiceNumber||0) + 1;
    DB.settings().lastInvoiceNumber = n;
    DB.save();
    return n;
  },

  loanInvoice(loanId){
    const loan = DB.loan(loanId); if (!loan) return;
    const client = DB.client(loan.clientId) || {};
    const insts = DB.loanInstallments(loanId);
    const payments = DB.loanPayments(loanId);
    const m = Engine.loanMetrics(loanId);
    const s = DB.settings();

    let mode = 'internal';   // internal | client
    let invNumber = this.nextInvoiceNumber();

    const render = () => {
      const showSlips = mode==='internal';
      Utils.modal(`
        <div class="modal-head">
          <div class="modal-title">فاتورة عقد #${loan.contractNumber}</div>
          <button class="modal-close" data-close>×</button>
        </div>
        <div class="modal-content" style="background:#f0eee6">
          <div class="row" style="margin-bottom:12px;gap:8px">
            <span class="chip ${mode==='internal'?'active':''}" data-m="internal">📋 نسخة داخلية (المندوب)</span>
            <span class="chip ${mode==='client'?'active':''}" data-m="client">👤 نسخة العميل</span>
          </div>
          <div id="invPreview" class="invoice-preview">
            <div class="inv-head">
              <div>
                <div class="inv-title">فاتورة تمويل</div>
                <div style="font-size:11px;color:#666">رقم الفاتورة: ${invNumber}</div>
              </div>
              <div style="text-align:end">
                <div style="font-weight:700;color:#0b3b2e">${Utils.esc(s.repName||'فهد التميمي')}</div>
                ${s.repPhone?`<div style="font-size:11px;color:#666">${Utils.esc(s.repPhone)}</div>`:''}
                ${s.repAddress?`<div style="font-size:11px;color:#666">${Utils.esc(s.repAddress)}</div>`:''}
                <div style="font-size:11px;color:#666;margin-top:4px">${Utils.fmtDate(new Date())}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;font-size:11px">
              <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #eee">
                <div style="color:#666;margin-bottom:6px;font-weight:700">بيانات العميل</div>
                <div><b>${Utils.esc(client.name||'—')}</b> · #${client.clientNumber}</div>
                ${client.phone?`<div>📞 ${Utils.esc(client.phone)}</div>`:''}
                ${client.idNumber?`<div>🆔 ${Utils.esc(client.idNumber)}</div>`:''}
                ${client.address?`<div>📍 ${Utils.esc(client.address)}</div>`:''}
              </div>
              <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #eee">
                <div style="color:#666;margin-bottom:6px;font-weight:700">بيانات العقد</div>
                <div>رقم العقد: <b>${loan.contractNumber}</b></div>
                <div>النوع: ${Utils.esc(loan.customContractType||loan.contractType)}</div>
                <div>التاريخ: ${Utils.fmtDate(loan.startDate,'short')}</div>
                <div>الحالة: ${Engine.loanStatus(loanId).label}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px">
              <div style="background:#0b3b2e;color:#fff;padding:8px;border-radius:6px;text-align:center">
                <div style="font-size:10px;opacity:.8">رأس المال</div>
                <div style="font-weight:700"><span class="money">${Utils.money(loan.principalAmount)}</span></div>
              </div>
              <div style="background:#c9a24a;color:#0b3b2e;padding:8px;border-radius:6px;text-align:center">
                <div style="font-size:10px">الربح</div>
                <div style="font-weight:700"><span class="money">${Utils.money(loan.profitAmount)}</span></div>
              </div>
              <div style="background:#14523f;color:#fff;padding:8px;border-radius:6px;text-align:center">
                <div style="font-size:10px;opacity:.8">إجمالي</div>
                <div style="font-weight:700"><span class="money">${Utils.money(loan.totalAmount)}</span></div>
              </div>
              <div style="background:#fff;border:1px solid #eee;padding:8px;border-radius:6px;text-align:center">
                <div style="font-size:10px;color:#666">قسط شهري</div>
                <div style="font-weight:700"><span class="money">${Utils.money(loan.monthlyInstallment)}</span></div>
              </div>
            </div>

            <div style="margin-top:14px">
              <div style="color:#0b3b2e;font-weight:700;margin-bottom:6px">جدول الأقساط</div>
              <table>
                <thead><tr><th>#</th><th>الاستحقاق</th><th style="text-align:end">القيمة</th><th style="text-align:end">المدفوع</th><th style="text-align:end">المتبقي</th><th>الحالة</th></tr></thead>
                <tbody>
                  ${insts.map(i=>{
                    const st = Engine.installmentStatus(i,loan);
                    const label = {ok:'منتظم',partial:'جزئي',grace:'سماحية',late:'متأخر',done:'مدفوع'}[st]||'—';
                    return `<tr class="${i.paid?'paid':''}"><td>${i.number}</td><td>${Utils.fmtDate(i.dueDate,'short')}</td><td style="text-align:end"><span class="money">${Utils.money(i.amount)}</span></td><td style="text-align:end"><span class="money">${Utils.money(i.paidAmount)}</span></td><td style="text-align:end"><span class="money">${Utils.money(i.amount-i.paidAmount)}</span></td><td>${label}</td></tr>`;
                  }).join('')}
                </tbody>
                <tfoot>
                  <tr style="background:#f5f2ea"><td colspan="2"><b>الإجمالي</b></td><td style="text-align:end"><b><span class="money">${Utils.money(m.totalDue)}</span></b></td><td style="text-align:end"><b><span class="money">${Utils.money(m.totalPaid)}</span></b></td><td style="text-align:end"><b><span class="money">${Utils.money(m.remaining)}</span></b></td><td></td></tr>
                </tfoot>
              </table>
            </div>

            ${payments.length ? `
              <div style="margin-top:14px">
                <div style="color:#0b3b2e;font-weight:700;margin-bottom:6px">سجل الدفعات</div>
                <table>
                  <thead><tr><th>التاريخ</th><th>الطريقة</th>${showSlips?'<th>المصدر</th>':''}<th style="text-align:end">القيمة</th></tr></thead>
                  <tbody>
                    ${payments.map(p=>{
                      let src = '—';
                      if (p.bankAccountId){ const a = s.bankAccounts.find(x=>x.id===p.bankAccountId); if(a) src=`${a.bankName} · ${a.accountNumber||''}`; }
                      if (p.fromRepAccount){ src = 'حساب المندوب'+ (p.repAccountId?(' — '+((s.repAccounts.find(x=>x.id===p.repAccountId)||{}).accountNumber||'')):'' ); }
                      return `<tr><td>${Utils.fmtDate(p.date,'short')}</td><td>${Utils.esc(p.method)}</td>${showSlips?`<td>${Utils.esc(src)}</td>`:''}<td style="text-align:end"><b><span class="money">${Utils.money(p.amount)}</span></b></td></tr>`;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `:''}

            ${showSlips && payments.some(p=>p.slips.length) ? `
              <div style="margin-top:14px">
                <div style="color:#0b3b2e;font-weight:700;margin-bottom:6px">إيصالات الدفع (نسخة المندوب فقط)</div>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
                  ${payments.flatMap(p=>p.slips.map((sl,idx)=>`<img src="${sl}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;border:1px solid #ccc">`)).join('')}
                </div>
              </div>
            `:''}

            ${s.bankAccounts.length ? `
              <div style="margin-top:14px;padding:10px;background:#fff;border-radius:6px;border:1px solid #eee">
                <div style="color:#0b3b2e;font-weight:700;margin-bottom:6px;font-size:11px">حسابات السداد</div>
                ${s.bankAccounts.map(a=>`
                  <div style="font-size:11px;padding:4px 0;border-bottom:1px dashed #eee">
                    <b>${Utils.esc(a.bankName)}</b> — ${Utils.esc(a.accountName||'')} — <b>${Utils.esc(a.accountNumber||'')}</b>${a.iban?` — IBAN: ${Utils.esc(a.iban)}`:''}
                  </div>
                `).join('')}
              </div>
            `:''}

            <div style="margin-top:14px;text-align:center;color:#0b3b2e;font-size:11px;padding:10px;border-top:2px solid #c9a24a">
              ${Utils.esc(s.invoiceFooter||'شكراً لتعاملكم معنا')}
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-secondary" id="pdfBtn">📄 حفظ PDF</button>
          <button class="btn-secondary" id="printBtn">🖨️ طباعة</button>
          <button class="btn-secondary" id="shareBtn">📤 مشاركة</button>
          <div class="spacer"></div>
          <button class="btn-ghost" data-close>إغلاق</button>
        </div>
      `, {wide:true});

      $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
      $$('.modal [data-m]').forEach(c=>c.onclick=()=>{ mode=c.dataset.m; render(); });
      $('#pdfBtn').onclick = () => Utils.elementToPDF($('#invPreview'), `فاتورة-${loan.contractNumber}-${mode}.pdf`);
      $('#printBtn').onclick = () => window.print();
      $('#shareBtn').onclick = () => Utils.elementToShare($('#invPreview'), `فاتورة-${loan.contractNumber}.png`);
    };
    render();
  },

  clientStatement(clientId){
    const c = DB.client(clientId); if (!c) return;
    const loans = DB.clientLoans(clientId);
    const s = DB.settings();
    const totalPrincipal = loans.reduce((s,l)=>s+l.principalAmount,0);
    const totalProfit = loans.reduce((s,l)=>s+l.profitAmount,0);
    const totalDue = loans.reduce((sum,l)=>{const m=Engine.loanMetrics(l.id);return sum+m.totalDue;},0);
    const totalPaid = loans.reduce((sum,l)=>{const m=Engine.loanMetrics(l.id);return sum+m.totalPaid;},0);
    const totalRem = loans.reduce((sum,l)=>{const m=Engine.loanMetrics(l.id);return sum+m.remaining;},0);

    Utils.modal(`
      <div class="modal-head">
        <div class="modal-title">كشف حساب — ${Utils.esc(c.name)}</div>
        <button class="modal-close" data-close>×</button>
      </div>
      <div class="modal-content" style="background:#f0eee6">
        <div id="stmtPreview" class="invoice-preview">
          <div class="inv-head">
            <div>
              <div class="inv-title">كشف حساب عميل</div>
              <div style="font-size:11px;color:#666">${Utils.fmtDate(new Date())}</div>
            </div>
            <div style="text-align:end">
              <div style="font-weight:700;color:#0b3b2e">${Utils.esc(s.repName||'فهد التميمي')}</div>
              ${s.repPhone?`<div style="font-size:11px;color:#666">${Utils.esc(s.repPhone)}</div>`:''}
            </div>
          </div>
          <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #eee;margin-top:12px">
            <div style="font-size:14px;font-weight:700">${Utils.esc(c.name)} <span style="color:#666;font-size:11px">#${c.clientNumber}</span></div>
            <div style="font-size:11px;color:#666">${Utils.esc(c.phone||'')} · ${Utils.esc(c.idNumber||'')}</div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px">
            <div style="background:#0b3b2e;color:#fff;padding:8px;border-radius:6px;text-align:center">
              <div style="font-size:10px;opacity:.8">إجمالي</div>
              <div style="font-weight:700"><span class="money">${Utils.money(totalDue)}</span></div>
            </div>
            <div style="background:#1f8a4c;color:#fff;padding:8px;border-radius:6px;text-align:center">
              <div style="font-size:10px;opacity:.8">مدفوع</div>
              <div style="font-weight:700"><span class="money">${Utils.money(totalPaid)}</span></div>
            </div>
            <div style="background:#c62828;color:#fff;padding:8px;border-radius:6px;text-align:center">
              <div style="font-size:10px;opacity:.8">متبقي</div>
              <div style="font-weight:700"><span class="money">${Utils.money(totalRem)}</span></div>
            </div>
          </div>

          <div style="margin-top:14px">
            <div style="color:#0b3b2e;font-weight:700;margin-bottom:6px">التمويلات (${loans.length})</div>
            <table>
              <thead><tr><th>عقد</th><th>النوع</th><th>البدء</th><th style="text-align:end">الإجمالي</th><th style="text-align:end">مدفوع</th><th style="text-align:end">متبقي</th><th>الحالة</th></tr></thead>
              <tbody>
                ${loans.map(l=>{
                  const m = Engine.loanMetrics(l.id); const st = Engine.loanStatus(l.id);
                  return `<tr><td>${l.contractNumber}</td><td>${Utils.esc(l.customContractType||l.contractType)}</td><td>${Utils.fmtDate(l.startDate,'short')}</td><td style="text-align:end"><span class="money">${Utils.money(m.totalDue)}</span></td><td style="text-align:end"><span class="money">${Utils.money(m.totalPaid)}</span></td><td style="text-align:end"><b><span class="money">${Utils.money(m.remaining)}</span></b></td><td>${st.label}</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top:14px;text-align:center;color:#0b3b2e;font-size:11px;padding:10px;border-top:2px solid #c9a24a">
            ${Utils.esc(s.invoiceFooter||'شكراً لتعاملكم معنا')}
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn-secondary" id="pdfBtn">📄 حفظ PDF</button>
        <button class="btn-secondary" id="printBtn">🖨️ طباعة</button>
        <button class="btn-secondary" id="shareBtn">📤 مشاركة</button>
        <div class="spacer"></div>
        <button class="btn-ghost" data-close>إغلاق</button>
      </div>
    `, {wide:true});
    $$('.modal [data-close]').forEach(b=>b.onclick=()=>Utils.closeModal());
    $('#pdfBtn').onclick = () => Utils.elementToPDF($('#stmtPreview'), `كشف-حساب-${c.name}.pdf`);
    $('#printBtn').onclick = () => window.print();
    $('#shareBtn').onclick = () => Utils.elementToShare($('#stmtPreview'), `كشف-حساب-${c.name}.png`);
  },
};
window.Invoices = Invoices;
