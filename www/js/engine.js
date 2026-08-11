/* ===== Payment Engine =====
   Smart logic for:
   - Schedule generation from a loan
   - Payment allocation (FIFO across unpaid installments)
   - Partial pay + overpay carry-forward + missed-pay accrual
   - Grace period handling
   - Status inference per installment and per loan
*/

const Engine = {

  /* ---------- Schedule Generation ---------- */
  generateSchedule(loan){
    const insts = [];
    const first = Utils.fromYmd(loan.firstInstallmentDate) || Utils.fromYmd(loan.startDate) || new Date();
    const total = Utils.round2(loan.totalAmount);
    const n = Number(loan.installmentCount);
    const perInst = Utils.round2(total / n);
    // Distribute rounding remainder to last installment
    let running = 0;
    for (let i=1; i<=n; i++){
      let amt = perInst;
      if (i===n){
        amt = Utils.round2(total - running);
      }
      running = Utils.round2(running + amt);
      const dueDate = Utils.ymd(Utils.addMonths(first, i-1));
      insts.push({
        id: Utils.uid('ins'),
        loanId: loan.id,
        number: i,
        dueDate,
        amount: amt,
        paidAmount: 0,
        paid: false,
        partial: false,
        paidDate: null,
        fromRepAccount: false, // set when rep pays from his own
        repPaidAmount: 0,      // portion covered by rep, still owed by client
        notes: '',
      });
    }
    return insts;
  },

  /* ---------- Payment Allocation ----------
     Applies payment amount to unpaid installments in order:
     1. Any overdue installments first (oldest first)
     2. Then the current/next installments in schedule order
     3. Any excess carries forward and gets partially applied to future installments
  */
  applyPayment(payment){
    const loan = DB.loan(payment.loanId); if(!loan) return;
    const insts = DB.loanInstallments(payment.loanId);
    // Sort: unpaid overdue first (by dueDate ASC), then remaining by number
    const today = Utils.today();
    const unpaid = insts.filter(i=>!i.paid);
    unpaid.sort((a,b)=>{
      const aOd = Utils.fromYmd(a.dueDate) < today;
      const bOd = Utils.fromYmd(b.dueDate) < today;
      if (aOd && !bOd) return -1;
      if (!aOd && bOd) return 1;
      return a.number - b.number;
    });

    let remaining = Utils.round2(payment.amount);
    payment.allocations = [];

    for (const inst of unpaid){
      if (remaining <= 0.001) break;
      const owedOnThis = Utils.round2(inst.amount - inst.paidAmount);
      if (owedOnThis <= 0.001){ continue; }
      const take = Utils.round2(Math.min(remaining, owedOnThis));
      inst.paidAmount = Utils.round2(inst.paidAmount + take);
      remaining = Utils.round2(remaining - take);
      // If this payment came from rep's own account, track it on the installment
      if (payment.fromRepAccount){
        inst.repPaidAmount = Utils.round2((inst.repPaidAmount||0) + take);
        inst.fromRepAccount = true; // gets flipped off if client later covers
      }
      if (inst.paidAmount >= inst.amount - 0.001){
        inst.paid = true;
        inst.partial = false;
        inst.paidDate = payment.date;
      } else {
        inst.partial = true;
      }
      payment.allocations.push({ installmentId: inst.id, amount: take });
    }

    // Any excess remaining after all installments are paid → save as extra credit on payment
    payment.excess = Utils.round2(Math.max(0, remaining));

    // Loan completion check
    if (insts.every(i=>i.paid)){
      loan.status = 'completed';
    }
  },

  /* ---------- Reverse Payment (delete) ---------- */
  reversePayment(payment){
    const loan = DB.loan(payment.loanId); if(!loan) return;
    for (const a of (payment.allocations||[])){
      const inst = DB.installment(a.installmentId); if(!inst) continue;
      inst.paidAmount = Utils.round2(inst.paidAmount - a.amount);
      if (payment.fromRepAccount){
        inst.repPaidAmount = Utils.round2(Math.max(0, (inst.repPaidAmount||0) - a.amount));
        if (inst.repPaidAmount === 0) inst.fromRepAccount = false;
      }
      if (inst.paidAmount < inst.amount - 0.001){
        inst.paid = false;
        inst.paidDate = null;
        inst.partial = inst.paidAmount > 0;
      }
    }
    // Reopen loan if reversal takes it below 100%
    const insts = DB.loanInstallments(loan.id);
    if (!insts.every(i=>i.paid) && loan.status==='completed') loan.status='active';
  },

  /* ---------- Installment Status ---------- */
  installmentStatus(inst, loan){
    if (inst.paid) return 'done';
    const today = Utils.today();
    const due = Utils.fromYmd(inst.dueDate);
    if (inst.partial) return 'partial';
    if (!due) return 'ok';
    const days = Utils.diffDays(today, due); // positive = past due
    if (days <= 0) return 'ok'; // still upcoming
    const grace = (loan && loan.graceDays!=null) ? loan.graceDays : (DB.settings().graceDays||5);
    if (days <= grace) return 'grace';
    // Overdue past grace
    return 'late';
  },

  /* ---------- Loan Aggregated Status ---------- */
  loanStatus(loanId){
    const loan = DB.loan(loanId); if(!loan) return { code:'active', label:'—' };
    const insts = DB.loanInstallments(loanId);
    if (insts.length && insts.every(i=>i.paid)) return { code:'done', label:'مكتمل' };
    // Count overdue
    const overdue = insts.filter(i=>!i.paid && Engine.installmentStatus(i,loan)==='late');
    if (overdue.length >= 3) return { code:'default', label:'متعثر' };
    if (overdue.length >= 1) return { code:'late', label:'متأخر' };
    const inGrace = insts.some(i=>!i.paid && Engine.installmentStatus(i,loan)==='grace');
    if (inGrace) return { code:'grace', label:'سماحية' };
    const anyPartial = insts.some(i=>i.partial);
    if (anyPartial) return { code:'partial', label:'سداد جزئي' };
    return { code:'ok', label:'منتظم' };
  },

  /* ---------- Loan Metrics ---------- */
  loanMetrics(loanId){
    const loan = DB.loan(loanId); if(!loan) return null;
    const insts = DB.loanInstallments(loanId);
    const totalDue = insts.reduce((s,i)=>s+i.amount, 0);
    const totalPaid = insts.reduce((s,i)=>s+(i.paidAmount||0), 0);
    const remaining = Utils.round2(totalDue - totalPaid);
    const paidCount = insts.filter(i=>i.paid).length;
    const overdueCount = insts.filter(i=>!i.paid && Engine.installmentStatus(i,loan)==='late').length;
    const repPaid = insts.reduce((s,i)=>s+(i.repPaidAmount||0), 0);
    const nextDue = insts.find(i=>!i.paid);
    return {
      totalDue, totalPaid, remaining,
      paidCount, totalCount: insts.length,
      overdueCount, repPaid,
      nextDue, // installment record
      percent: totalDue>0 ? Math.round(totalPaid/totalDue*100) : 0,
    };
  },

  /* ---------- Portfolio Metrics (dashboard) ---------- */
  portfolio(){
    let totalPrincipal=0, totalProfit=0, totalCollected=0, totalRemaining=0, overdueAmount=0, repOwed=0;
    let activeLoans=0, completedLoans=0, defaultedLoans=0;
    let overdueInstCount = 0;
    let dueTodayCount = 0, dueSoonCount = 0;
    const today = Utils.today();
    const soonEnd = new Date(today); soonEnd.setDate(soonEnd.getDate()+7);
    for (const loan of DB.loans()){
      totalPrincipal += loan.principalAmount||0;
      totalProfit += loan.profitAmount||0;
      const m = Engine.loanMetrics(loan.id);
      if (!m) continue;
      totalCollected += m.totalPaid;
      totalRemaining += m.remaining;
      repOwed += m.repPaid;
      overdueAmount += DB.loanInstallments(loan.id)
        .filter(i=>!i.paid && Engine.installmentStatus(i,loan)==='late')
        .reduce((s,i)=>s+(i.amount-i.paidAmount),0);
      overdueInstCount += m.overdueCount;
      const st = Engine.loanStatus(loan.id).code;
      if (st==='done') completedLoans++;
      else if (st==='default') defaultedLoans++;
      else activeLoans++;
      for (const i of DB.loanInstallments(loan.id)){
        if (i.paid) continue;
        const due = Utils.fromYmd(i.dueDate);
        if (!due) continue;
        if (due.getTime() === today.getTime()) dueTodayCount++;
        else if (due > today && due <= soonEnd) dueSoonCount++;
      }
    }
    return {
      clients: DB.clients().length,
      loans: DB.loans().length,
      activeLoans, completedLoans, defaultedLoans,
      totalPrincipal, totalProfit, totalCollected, totalRemaining,
      overdueAmount, overdueInstCount, repOwed,
      dueTodayCount, dueSoonCount,
    };
  },
};

window.Engine = Engine;
