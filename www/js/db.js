/* ===== Data Store =====
   Everything is in-memory JSON, persisted to localStorage on every mutation.
   Structure:
   db = {
     settings: {...},
     clients: [{...}],
     loans: [{...}],
     installments: [{...}],
     payments: [{...}],
     reminders: [{...}]
   }
*/

const DB = {
  data: null,
  KEY: 'fahd_tamimi_v1',

  defaultSettings(){
    return {
      appName: 'فهد التميمي',
      repName: '',
      repPhone: '',
      repAddress: '',
      passwordHash: null,          // set on first launch
      graceDays: 5,
      contractTypes: ['تضامن زراعي','طاقة','ريادة','استدامة','تعليم','استهلاكي','أخرى'],
      bankAccounts: [],            // [{id,bankName,accountName,accountNumber,iban}]
      repAccounts: [],             // rep's own personal/mobile-wallet accounts
      lastClientNumber: 1000,      // permanent counter — never reset
      lastContractNumber: 0,       // per loan
      lastInvoiceNumber: 0,
      defaultInstallmentDay: 1,    // (legacy) day of month for first installment
      installmentIntervalMode: 'days',  // 'days' | 'month'
      installmentIntervalDays: 30,      // used when mode = 'days'
      defaultProfitRate: 0,        // percentage
      remindDaysBefore: 3,
      invoiceFooter: 'شكراً لتعاملكم معنا',
      logoDataUrl: null,           // optional invoice logo
    };
  },

  fresh(){
    return {
      version: 1,
      settings: this.defaultSettings(),
      clients: [],
      loans: [],
      installments: [],
      payments: [],
      reminders: [],
    };
  },

  load(){
    const saved = Utils.ls.get(this.KEY);
    if (saved && saved.version){
      this.data = saved;
      // migration: ensure any newly added fields exist
      const def = this.defaultSettings();
      Object.keys(def).forEach(k => {
        if (this.data.settings[k] === undefined) this.data.settings[k] = def[k];
      });
    } else {
      this.data = this.fresh();
      this.save();
    }
    return this.data;
  },
  save(){ Utils.ls.set(this.KEY, this.data); },

  /* ---------- CLIENTS ---------- */
  clients(){ return this.data.clients; },
  client(id){ return this.data.clients.find(c=>c.id===id); },
  nextClientNumber(){
    const n = (this.data.settings.lastClientNumber || 1000) + 1;
    this.data.settings.lastClientNumber = n;
    return n;
  },
  addClient(c){
    const item = {
      id: Utils.uid('cli'),
      clientNumber: c.clientNumber || this.nextClientNumber(),
      name: c.name || '',
      phone: c.phone || '',
      guarantorName: c.guarantorName || '',
      guarantorPhone: c.guarantorPhone || '',
      idNumber: c.idNumber || '',
      address: c.address || '',
      notes: c.notes || '',
      createdAt: new Date().toISOString(),
    };
    this.data.clients.push(item); this.save();
    return item;
  },
  updateClient(id, patch){
    const c = this.client(id); if(!c) return null;
    Object.assign(c, patch); this.save(); return c;
  },
  deleteClient(id){
    // Also cascade — delete loans, installments, payments
    const loans = this.data.loans.filter(l=>l.clientId===id).map(l=>l.id);
    this.data.installments = this.data.installments.filter(i=>!loans.includes(i.loanId));
    this.data.payments = this.data.payments.filter(p=>!loans.includes(p.loanId));
    this.data.loans = this.data.loans.filter(l=>l.clientId!==id);
    this.data.clients = this.data.clients.filter(c=>c.id!==id);
    this.save();
  },

  /* ---------- LOANS ---------- */
  loans(){ return this.data.loans; },
  loan(id){ return this.data.loans.find(l=>l.id===id); },
  clientLoans(clientId){ return this.data.loans.filter(l=>l.clientId===clientId); },
  nextContractNumber(){
    const n = (this.data.settings.lastContractNumber || 0) + 1;
    this.data.settings.lastContractNumber = n;
    return n;
  },
  addLoan(l){
    const item = {
      id: Utils.uid('lon'),
      clientId: l.clientId,
      contractNumber: l.contractNumber || this.nextContractNumber(),
      contractType: l.contractType || 'أخرى',
      customContractType: l.customContractType || '',
      principalAmount: Utils.round2(l.principalAmount),
      profitAmount: Utils.round2(l.profitAmount || 0),
      totalAmount: Utils.round2((Number(l.principalAmount)||0)+(Number(l.profitAmount)||0)),
      installmentCount: Number(l.installmentCount)||1,
      monthlyInstallment: 0, // computed
      startDate: l.startDate,
      firstInstallmentDate: l.firstInstallmentDate || l.startDate,
      graceDays: l.graceDays != null ? Number(l.graceDays) : this.data.settings.graceDays,
      installmentIntervalMode: l.installmentIntervalMode || this.data.settings.installmentIntervalMode || 'days',
      installmentIntervalDays: l.installmentIntervalDays != null ? Number(l.installmentIntervalDays) : (this.data.settings.installmentIntervalDays || 30),
      status: 'active', // active | completed | defaulted
      notes: l.notes || '',
      createdAt: new Date().toISOString(),
    };
    item.monthlyInstallment = Utils.round2(item.totalAmount / item.installmentCount);
    this.data.loans.push(item);
    // Generate installment schedule
    const insts = Engine.generateSchedule(item);
    this.data.installments.push(...insts);
    this.save();
    return item;
  },
  updateLoan(id, patch){
    const l = this.loan(id); if(!l) return null;
    Object.assign(l, patch);
    if (patch.principalAmount!=null || patch.profitAmount!=null){
      l.totalAmount = Utils.round2((Number(l.principalAmount)||0)+(Number(l.profitAmount)||0));
      l.monthlyInstallment = Utils.round2(l.totalAmount / l.installmentCount);
    }
    this.save(); return l;
  },
  deleteLoan(id){
    this.data.installments = this.data.installments.filter(i=>i.loanId!==id);
    this.data.payments = this.data.payments.filter(p=>p.loanId!==id);
    this.data.loans = this.data.loans.filter(l=>l.id!==id);
    this.save();
  },

  /* ---------- INSTALLMENTS ---------- */
  installments(){ return this.data.installments; },
  loanInstallments(loanId){
    return this.data.installments.filter(i=>i.loanId===loanId).sort((a,b)=>a.number-b.number);
  },
  installment(id){ return this.data.installments.find(i=>i.id===id); },
  updateInstallment(id, patch){
    const i = this.installment(id); if(!i) return null;
    Object.assign(i, patch); this.save(); return i;
  },
  regenerateSchedule(loanId){
    const loan = this.loan(loanId); if(!loan) return;
    this.data.installments = this.data.installments.filter(i=>i.loanId!==loanId);
    const insts = Engine.generateSchedule(loan);
    this.data.installments.push(...insts);
    this.save();
  },

  /* ---------- PAYMENTS ---------- */
  payments(){ return this.data.payments; },
  loanPayments(loanId){ return this.data.payments.filter(p=>p.loanId===loanId).sort((a,b)=> new Date(b.date)-new Date(a.date)); },
  addPayment(p){
    const item = {
      id: Utils.uid('pay'),
      loanId: p.loanId,
      amount: Utils.round2(p.amount),
      date: p.date || Utils.ymd(new Date()),
      method: p.method || 'نقد',       // نقد | تحويل بنكي | حوالة | من حساب المندوب
      bankAccountId: p.bankAccountId || null,
      repAccountId: p.repAccountId || null,
      fromRepAccount: !!p.fromRepAccount,
      slips: p.slips || [],           // [dataUrl]
      notes: p.notes || '',
      allocations: [],                // filled by Engine.applyPayment
      createdAt: new Date().toISOString(),
    };
    this.data.payments.push(item);
    // Apply distribution logic
    Engine.applyPayment(item);
    this.save();
    return item;
  },
  deletePayment(id){
    const p = this.data.payments.find(p=>p.id===id);
    if (!p) return;
    Engine.reversePayment(p);
    this.data.payments = this.data.payments.filter(x=>x.id!==id);
    this.save();
  },

  /* ---------- REMINDERS ---------- */
  reminders(){ return this.data.reminders; },
  addReminder(r){
    const item = { id: Utils.uid('rem'), ...r, createdAt: new Date().toISOString(), done:false };
    this.data.reminders.push(item); this.save(); return item;
  },
  updateReminder(id, patch){
    const r = this.data.reminders.find(x=>x.id===id); if(!r) return;
    Object.assign(r,patch); this.save(); return r;
  },
  deleteReminder(id){ this.data.reminders = this.data.reminders.filter(r=>r.id!==id); this.save(); },

  /* ---------- SETTINGS ---------- */
  settings(){ return this.data.settings; },
  updateSettings(patch){ Object.assign(this.data.settings, patch); this.save(); return this.data.settings; },

  /* ---------- Backup ---------- */
  exportAll(){ return JSON.stringify(this.data, null, 2); },
  importAll(json){
    try {
      const parsed = typeof json==='string' ? JSON.parse(json) : json;
      if (!parsed || !parsed.version) throw new Error('bad file');
      this.data = parsed; this.save(); return true;
    } catch(e){ return false; }
  },
  resetAll(){ this.data = this.fresh(); this.save(); },
};

window.DB = DB;
