/* GoBuddie – Restored full app logic + floating label enhancement */

const store = {
  bills: [],
  reminders: [],
  points: 0,
  monthlyBudget: 0,
  otpMonth: null,
  funds: 2000
};

const el = (id) => document.getElementById(id);

/* ---------------- Tabs ---------------- */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.setAttribute('aria-selected', 'false'));
    btn.setAttribute('aria-selected', 'true');
    const tabId = `tab-${btn.dataset.tab}`;
    document.querySelectorAll('.tab').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
  });
});

/* ---------------- Helpers ---------------- */
function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function buildMonthDays(ym) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0);
  const days = [];
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
  }
  return days;
}
function createBill(name, amount, due, scheduled = false, category = '') {
  const bill = { id: crypto.randomUUID(), name, amount, due, scheduled, prioritized: false, category };
  store.bills.push(bill);
  store.reminders.push({ billId: bill.id, when: due, note: `Reminder: ${name} due` });
  return bill;
}
function findBill(name, amount, due) {
  return store.bills.find(b => b.name.toLowerCase() === name.toLowerCase() && b.amount === amount && b.due === due);
}
function findBillById(id) {
  return store.bills.find(b => b.id === id);
}

/* ---------------- Chat ---------------- */
const chatLog = el('chat-log');
const chatForm = el('chat-form');
const chatInput = el('chat-input');

function addMsg(role, text) {
  if (!chatLog) return;
  const row = document.createElement('div');
  row.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = role === 'user' ? 'You' : 'System';
  row.appendChild(meta);
  row.appendChild(bubble);
  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

document.querySelectorAll('.quick-actions .chip').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!chatInput || !chatForm) return;
    chatInput.value = btn.dataset.msg;
    chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
  });
});

if (chatForm) {
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const text = (chatInput?.value || '').trim();
    if (!text) return;
    addMsg('user', text);
    processChat(text);
    chatInput.value = '';
  });
}

function processChat(text) {
  let m = text.match(/^add\s+(.+?)\s+(\d+(?:\.\d+)?)\s+due\s+(\d{4}-\d{2}-\d{2})$/i);
  if (m) {
    const bill = createBill(m[1], Number(m[2]), m[3], false);
    addMsg('system', `Added bill: ${bill.name} ₱${bill.amount.toFixed(0)} due ${bill.due}.`);
    renderAll();
    return;
  }
  m = text.match(/^schedule\s+payment\s+(.+?)\s+(\d+(?:\.\d+)?)\s+on\s+(\d{4}-\d{2}-\d{2})$/i);
  if (m) {
    const [_, name, amtStr, date] = m;
    const amt = Number(amtStr);
    const bill = findBill(name, amt, date);
    if (bill) {
      bill.scheduled = true;
      addMsg('system', `Scheduled ${bill.name} on ${date}.`);
    } else {
      createBill(name, amt, date, true);
      addMsg('system', `Created & scheduled ${name} ₱${amt} for ${date}.`);
    }
    renderAll();
    return;
  }
  m = text.match(/^prioritize\s+bills\s+if\s+monthly\s+budget\s+is\s+(\d+(?:\.\d+)?)$/i);
  if (m) {
    store.monthlyBudget = Number(m[1]);
    prioritizeByBudget();
    addMsg('system', `Prioritized bills for monthly budget ₱${store.monthlyBudget}.`);
    renderAll();
    return;
  }
  if (/^show\s+reminders$/i.test(text)) {
    const summary = store.reminders.map(r => {
      const bill = store.bills.find(b => b.id === r.billId);
      return `${bill?.name ?? 'Bill'} on ${r.when}`;
    });
    addMsg('system', summary.length ? `Reminders:\n- ${summary.join('\n- ')}` : 'No reminders yet.');
    renderAll();
    return;
  }
  if (/^renew\s+otp$/i.test(text)) {
    store.otpMonth = currentMonthStr();
    addMsg('system', `OTP renewed for ${store.otpMonth}.`);
    const status = document.getElementById('otp-status');
    if (status) status.textContent = `Active ${store.otpMonth}`;
    return;
  }
  addMsg('system', 'Commands:\n- Add Meralco 1500 due YYYY-MM-DD\n- Schedule payment Meralco 1500 on YYYY-MM-DD\n- Prioritize bills if monthly budget is 3000\n- Show reminders\n- Renew OTP');
}

/* ---------------- Calendar ---------------- */
const calendarGrid = el('calendar-grid');
const calendarMonth = el('calendar-month');
const monthlyBudgetInput = el('monthly-budget');
const recalcBtn = el('recalculate-priority');

if (calendarMonth) calendarMonth.value = currentMonthStr();
if (recalcBtn) {
  recalcBtn.addEventListener('click', () => {
    store.monthlyBudget = Number(monthlyBudgetInput?.value || 0);
    prioritizeByBudget();
    renderAll();
  });
}

function renderCalendar() {
  if (!calendarGrid) return;
  const ym = (calendarMonth && calendarMonth.value) || currentMonthStr();
  if (monthlyBudgetInput) monthlyBudgetInput.value = store.monthlyBudget || '';
  calendarGrid.innerHTML = '';
  buildMonthDays(ym).forEach(day => {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    const dateLabel = document.createElement('div');
    dateLabel.className = 'date';
    dateLabel.textContent = day.dateStr;
    cell.appendChild(dateLabel);
    store.bills.filter(b => b.due === day.dateStr).forEach(b => {
      const tag = document.createElement('div');
      tag.className = 'bill';
      if (b.scheduled) tag.classList.add('scheduled');
      if (b.prioritized) tag.classList.add('prioritized');
      if (!b.prioritized && store.monthlyBudget > 0) tag.classList.add('overflow');
      tag.textContent = `${b.name} ₱${b.amount}`;
      cell.appendChild(tag);
    });
    calendarGrid.appendChild(cell);
  });
}

/* ---------------- Prioritization ---------------- */
function prioritizeByBudget() {
  const ym = (calendarMonth && calendarMonth.value) || currentMonthStr();
  const monthBills = store.bills.filter(b => b.due.startsWith(ym));
  const sorted = [...monthBills].sort((a, b) =>
    (b.scheduled - a.scheduled) ||
    (a.amount - b.amount) ||
    (new Date(a.due) - new Date(b.due))
  );
  let acc = 0;
  sorted.forEach(b => {
    if (acc + b.amount <= store.monthlyBudget) {
      b.prioritized = true;
      acc += b.amount;
    } else {
      b.prioritized = false;
    }
  });
}

/* ---------------- Dashboard ---------------- */
function renderDashboard() {
  const fundsEl = el('funds-balance');
  if (fundsEl) fundsEl.textContent = `₱${store.funds.toFixed(0)}`;

  const ym = (calendarMonth && calendarMonth.value) || currentMonthStr();
  const bills = store.bills.filter(b => b.due.startsWith(ym));
  const scheduledCount = bills.filter(b => b.scheduled).length;
  const prioritizedSum = bills.filter(b => b.prioritized).reduce((s, b) => s + b.amount, 0);
  const remaining = Math.max(0, (store.monthlyBudget || 0) - prioritizedSum);

  if (el('stat-total-bills')) el('stat-total-bills').textContent = bills.length;
  if (el('stat-scheduled')) el('stat-scheduled').textContent = scheduledCount;
  if (el('stat-remaining')) el('stat-remaining').textContent = `₱${remaining.toFixed(0)}`;

  const onTimeRate = Math.min(100, Math.round((scheduledCount / Math.max(1, bills.length)) * 100));
  const trustScore = Math.round(600 + onTimeRate * 3);
  if (el('stat-on-time')) el('stat-on-time').textContent = `${onTimeRate}%`;
  if (el('stat-trust')) el('stat-trust').textContent = trustScore;
  const trustBar = document.getElementById('trust-bar');
  if (trustBar) trustBar.style.width = `${onTimeRate}%`;

  if (el('stat-points')) el('stat-points').textContent = store.points;

  const remindersUl = el('reminders-list');
  if (remindersUl) {
    remindersUl.innerHTML = '';
    store.reminders.filter(r => r.when.startsWith(ym)).forEach(r => {
      const b = store.bills.find(x => x.id === r.billId);
      const li = document.createElement('li');
      li.textContent = `${b?.name ?? 'Bill'} — ${r.when}`;
      remindersUl.appendChild(li);
    });
  }

  const recentTableBody = document.querySelector('#recent-bills-table tbody');
  if (recentTableBody) {
    recentTableBody.innerHTML = '';
    const recent = [...store.bills].sort((a, b) => new Date(b.due) - new Date(a.due)).slice(0, 10);
    recent.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.name}</td>
        <td>${b.category || '—'}</td>
        <td>₱${b.amount}</td>
        <td>${b.due}</td>
        <td>${b.scheduled ? 'Yes' : 'No'}</td>
        <td>
          <button class="btn schedule" data-id="${b.id}">${b.scheduled ? 'Unschedule' : 'Schedule'}</button>
          <button class="btn primary pay" data-id="${b.id}">Pay</button>
          <button class="btn delete" data-id="${b.id}">Delete</button>
        </td>
      `;
      recentTableBody.appendChild(tr);
    });

    // Actions
    recentTableBody.querySelectorAll('.btn.schedule').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const bill = findBillById(id);
        if (bill) {
          bill.scheduled = !bill.scheduled;
          prioritizeByBudget();
          renderAll();
        }
      });
    });

    recentTableBody.querySelectorAll('.btn.pay').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const bill = findBillById(id);
        if (!bill) return;
        if (store.funds < bill.amount) {
          alert('Insufficient funds. Top up first.');
          return;
        }
        store.funds -= bill.amount;
        bill.scheduled = true;
        addMsg('system', `Paid ${bill.name} for ₱${bill.amount}. Remaining funds: ₱${store.funds.toFixed(0)}`);
        renderAll();
      });
    });

    recentTableBody.querySelectorAll('.btn.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        store.bills = store.bills.filter(x => x.id !== id);
        store.reminders = store.reminders.filter(r => r.billId !== id);
        prioritizeByBudget();
        renderAll();
      });
    });
  }
}

/* ---------------- Points & Funds ---------------- */
const claimBtn = document.getElementById('claim-streak');
if (claimBtn) {
  claimBtn.addEventListener('click', () => {
    store.points += 10;
    addMsg('system', 'Streak claimed! +10 points.');
    renderDashboard();
  });
}

const topupBtn = document.getElementById('funds-topup-btn');
if (topupBtn) {
  topupBtn.addEventListener('click', () => {
    const amt = Number(document.getElementById('funds-topup')?.value || 0);
    if (amt <= 0) return;
    store.funds += amt;
    addMsg('system', `Top up: ₱${amt.toFixed(0)}. New balance: ₱${store.funds.toFixed(0)}`);
    document.getElementById('funds-topup').value = '';
    renderDashboard();
  });
}

/* ---------------- Budgeting ---------------- */
const calcBudgetBtn = document.getElementById('calc-budget');
if (calcBudgetBtn) {
  calcBudgetBtn.addEventListener('click', e => {
    e.preventDefault();
    const income = Number(el('income')?.value || 0);
    const savings = Number(el('savings-goal')?.value || 0);
    const essentialsCap = Number(el('essentials-cap')?.value || 50);
    const wantsCap = Number(el('wants-cap')?.value || 30);
    const debtCap = Number(el('debt-cap')?.value || 20);
    const capsSum = essentialsCap + wantsCap + debtCap;
    const afterSavings = Math.max(0, income - savings);
    const essentials = Math.round(afterSavings * (essentialsCap / capsSum));
    const wants = Math.round(afterSavings * (wantsCap / capsSum));
    const debt = Math.round(afterSavings * (debtCap / capsSum));
    store.monthlyBudget = essentials + debt;
    if (monthlyBudgetInput) monthlyBudgetInput.value = store.monthlyBudget;
    prioritizeByBudget();
    const plan = document.getElementById('budget-plan');
    if (plan) {
      plan.innerHTML = `
        <p>Income: ₱${income} • Savings: ₱${savings}</p>
        <ul>
          <li>Essentials: ₱${essentials}</li>
          <li>Wants: ₱${wants}</li>
          <li>Debt Repayment: ₱${debt}</li>
        </ul>
        <p><strong>Bill Budget:</strong> ₱${store.monthlyBudget}</p>
      `;
    }
    renderAll();
  });
}

/* ---------------- Tips ---------------- */
const tipBank = [
  'Move high-interest debt to a lower-rate loan.',
  'Set reminders 3 days before due dates.',
  'Automate payments for recurring bills.',
  'Use sinking funds for annual expenses.',
  'If budget is tight, prioritize essentials + debt.'
];
function renderTips() {
  const list = document.getElementById('tips-list');
  if (!list) return;
  list.innerHTML = '';
  tipBank.forEach(t => {
    const div = document.createElement('div');
    div.className = 'tip';
    div.textContent = t;
    list.appendChild(div);
  });
}

/* ---------------- Quick Add ---------------- */
const quickAddForm = document.getElementById('quick-add-form');
if (quickAddForm) {
  quickAddForm.addEventListener('submit', e => {
    e.preventDefault();
    const category = (document.getElementById('qa-category')?.value || '').trim();
    const biller = (document.getElementById('qa-biller')?.value || '').trim();
    const nameTyped = (document.getElementById('qa-name')?.value || '').trim();
    const name = nameTyped || biller || 'Untitled bill';
    const amount = Number(document.getElementById('qa-amount')?.value || 0);
    const due = document.getElementById('qa-due')?.value || '';
    if (!name || !amount || !due) return;
    createBill(name, amount, due, false, category);
    prioritizeByBudget();
    renderAll();
    quickAddForm.reset();
    initFloatingLabels(); // ensure labels reset state
  });
}

/* ---------------- OTP ---------------- */
const otpBtn = document.getElementById('renew-otp-btn');
if (otpBtn) {
  otpBtn.addEventListener('click', () => {
    store.otpMonth = currentMonthStr();
    const status = document.getElementById('otp-status');
    if (status) status.textContent = `Active ${store.otpMonth}`;
    addMsg('system', `OTP renewed for ${store.otpMonth}`);
  });
}

/* ---------------- Floating Labels Enhancer ---------------- */
function initFloatingLabels() {
  document.querySelectorAll('.field').forEach(field => {
    const control = field.querySelector('input, select, textarea');
    if (!control) return;
    const update = () => {
      const hasValue = control.type === 'date'
        ? !!control.value
        : !!(control.value && control.value.trim && control.value.trim().length > 0);
      field.classList.toggle('filled', hasValue);
    };
    update();
    control.addEventListener('input', update);
    control.addEventListener('change', update);
    control.addEventListener('blur', update);
  });
}

/* ---------------- Seed Demo Data ---------------- */
(function seed() {
  const ym = currentMonthStr();
  createBill('Meralco', 1500, `${ym}-05`, false, 'Utilities');
  createBill('Globe', 999, `${ym}-10`, false, 'Telco');
  createBill('Water', 600, `${ym}-15`, true, 'Utilities');
  store.monthlyBudget = 3000;
  prioritizeByBudget();
})();

/* ---------------- Render All ---------------- */
function renderAll() {
  renderCalendar();
  renderDashboard();
  renderTips();
  initFloatingLabels();
}
renderAll();

/* ---------------- Jump Calendar Button ---------------- */
document.querySelectorAll('[data-goto="calendar"]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.setAttribute('aria-selected', 'false'));
    const calendarTabBtn = document.querySelector('[data-tab="calendar"]');
    if (calendarTabBtn) calendarTabBtn.setAttribute('aria-selected', 'true');
    document.querySelectorAll('.tab').forEach(p => p.classList.remove('active'));
    const calPane = document.getElementById('tab-calendar');
    if (calPane) calPane.classList.add('active');
  });
});
