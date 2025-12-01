/* GoBuddie – Core App with Enhanced Features */

/* ================ Constants ================ */
const STORAGE_KEY = 'gobuddie-state-v2';
const STORAGE_VERSION = 2;

/* ================ Store ================ */
const store = {
  bills: [],
  reminders: [],
  points: 0,
  monthlyBudget: 0,
  otpMonth: null,
  funds: 2000,
  useWeightedPrioritization: false,
  lastSaved: null
};

/* ================ Toast Manager ================ */
const toastManager = {
  queue: [],
  container: null,
  init() {
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('role', 'status');
    document.body.appendChild(this.container);
  },
  show(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

/* ================ Persistence ================ */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    // Migrate older versions
    if (!data.version || data.version < STORAGE_VERSION) {
      // Fill defaults for missing fields
      data.bills = (data.bills || []).map(b => ({
        ...b,
        amountRemaining: b.amountRemaining ?? b.amount,
        recurringRule: b.recurringRule ?? { interval: 'none', autoGenerate: false },
        status: b.status ?? (b.scheduled ? 'scheduled' : 'pending'),
        createdAt: b.createdAt ?? new Date().toISOString(),
        updatedAt: b.updatedAt ?? new Date().toISOString()
      }));
      data.useWeightedPrioritization = data.useWeightedPrioritization ?? false;
    }
    Object.assign(store, {
      bills: data.bills || [],
      reminders: data.reminders || [],
      points: data.points || 0,
      monthlyBudget: data.monthlyBudget || 0,
      funds: data.funds ?? 2000,
      otpMonth: data.otpMonth || null,
      useWeightedPrioritization: data.useWeightedPrioritization ?? false,
      lastSaved: data.lastSaved || null
    });
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
}

function saveState() {
  try {
    store.lastSaved = new Date().toISOString();
    const data = {
      version: STORAGE_VERSION,
      bills: store.bills,
      reminders: store.reminders,
      points: store.points,
      monthlyBudget: store.monthlyBudget,
      funds: store.funds,
      otpMonth: store.otpMonth,
      useWeightedPrioritization: store.useWeightedPrioritization,
      lastSaved: store.lastSaved
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    updateLastSavedDisplay();
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

function resetData() {
  if (!confirm('Are you sure you want to reset all data? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  store.bills = [];
  store.reminders = [];
  store.points = 0;
  store.monthlyBudget = 0;
  store.funds = 2000;
  store.otpMonth = null;
  store.useWeightedPrioritization = false;
  store.lastSaved = null;
  toastManager.show('All data has been reset', 'info');
  renderAll();
}

function updateLastSavedDisplay() {
  const el = document.getElementById('last-saved');
  if (el && store.lastSaved) {
    const d = new Date(store.lastSaved);
    el.textContent = `Last saved: ${d.toLocaleString()}`;
  } else if (el) {
    el.textContent = 'Not saved yet';
  }
}

/* ================ Export / Import ================ */
function exportData() {
  const data = {
    version: STORAGE_VERSION,
    bills: store.bills,
    reminders: store.reminders,
    points: store.points,
    monthlyBudget: store.monthlyBudget,
    funds: store.funds,
    otpMonth: store.otpMonth,
    useWeightedPrioritization: store.useWeightedPrioritization,
    exportedAt: new Date().toISOString()
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href = url;
  a.download = `gobuddie-export-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toastManager.show('Data exported successfully', 'success');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      // Validate basic structure
      if (!data.bills || !Array.isArray(data.bills)) {
        throw new Error('Invalid data structure');
      }
      const action = confirm('Merge with existing data? Click Cancel to replace all data.');
      if (action) {
        // Merge
        data.bills.forEach(b => {
          if (!store.bills.find(x => x.id === b.id)) {
            store.bills.push({
              ...b,
              amountRemaining: b.amountRemaining ?? b.amount,
              recurringRule: b.recurringRule ?? { interval: 'none', autoGenerate: false },
              status: b.status ?? 'pending',
              createdAt: b.createdAt ?? new Date().toISOString(),
              updatedAt: b.updatedAt ?? new Date().toISOString()
            });
          }
        });
      } else {
        // Replace
        store.bills = (data.bills || []).map(b => ({
          ...b,
          amountRemaining: b.amountRemaining ?? b.amount,
          recurringRule: b.recurringRule ?? { interval: 'none', autoGenerate: false },
          status: b.status ?? 'pending',
          createdAt: b.createdAt ?? new Date().toISOString(),
          updatedAt: b.updatedAt ?? new Date().toISOString()
        }));
        store.reminders = data.reminders || [];
        store.points = data.points || 0;
        store.monthlyBudget = data.monthlyBudget || 0;
        store.funds = data.funds ?? 2000;
        store.otpMonth = data.otpMonth || null;
        store.useWeightedPrioritization = data.useWeightedPrioritization ?? false;
      }
      saveState();
      toastManager.show('Data imported successfully', 'success');
      renderAll();
    } catch (err) {
      toastManager.show('Failed to import data: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

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
function createBill(name, amount, due, scheduled = false, category = '', recurringRule = { interval: 'none', autoGenerate: false }) {
  const now = new Date().toISOString();
  const bill = {
    id: crypto.randomUUID(),
    name,
    amount,
    amountRemaining: amount,
    due,
    scheduled,
    prioritized: false,
    category,
    recurringRule,
    status: scheduled ? 'scheduled' : 'pending',
    createdAt: now,
    updatedAt: now
  };
  store.bills.push(bill);
  store.reminders.push({ billId: bill.id, when: due, note: `Reminder: ${name} due` });
  saveState();
  toastManager.show(`Bill added: ${name}`, 'success');
  return bill;
}

function updateBill(id, updates) {
  const bill = findBillById(id);
  if (!bill) return null;
  Object.assign(bill, updates, { updatedAt: new Date().toISOString() });
  saveState();
  return bill;
}

function deleteBill(id) {
  const bill = findBillById(id);
  if (!bill) return;
  if (!confirm(`Are you sure you want to delete "${bill.name}"?`)) return false;
  store.bills = store.bills.filter(x => x.id !== id);
  store.reminders = store.reminders.filter(r => r.billId !== id);
  saveState();
  toastManager.show(`Bill deleted: ${bill.name}`, 'info');
  return true;
}

/* ================ Recurring Bills ================ */
function getNextMonthDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  // Clamp to last day of next month if needed
  const lastDayOfNextMonth = new Date(nextYear, nextMonth, 0).getDate();
  const clampedDay = Math.min(d, lastDayOfNextMonth);
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

function generateNextRecurrence(bill) {
  if (!bill.recurringRule || bill.recurringRule.interval === 'none') return null;
  const nextDue = getNextMonthDate(bill.due);
  // Check if next occurrence already exists
  const exists = store.bills.find(b => 
    b.name === bill.name && 
    b.due === nextDue && 
    b.id !== bill.id
  );
  if (exists) return null;
  const newBill = createBill(
    bill.name,
    bill.amount,
    nextDue,
    false,
    bill.category,
    bill.recurringRule
  );
  toastManager.show(`Recurring bill generated: ${newBill.name} for ${nextDue}`, 'info');
  return newBill;
}

/* ================ Partial Payments ================ */
function processPartialPayment(billId, partialAmount) {
  const bill = findBillById(billId);
  if (!bill) {
    toastManager.show('Bill not found', 'error');
    return false;
  }
  if (partialAmount <= 0) {
    toastManager.show('Payment amount must be greater than zero', 'error');
    return false;
  }
  if (partialAmount > bill.amountRemaining) {
    toastManager.show('Payment exceeds remaining amount', 'error');
    return false;
  }
  if (store.funds < partialAmount) {
    toastManager.show('Insufficient funds. Top up first.', 'error');
    return false;
  }
  store.funds -= partialAmount;
  bill.amountRemaining -= partialAmount;
  bill.updatedAt = new Date().toISOString();
  if (bill.amountRemaining <= 0) {
    bill.status = 'paid';
    bill.scheduled = true;
    if (bill.recurringRule && bill.recurringRule.interval !== 'none') {
      generateNextRecurrence(bill);
    }
    toastManager.show(`Bill fully paid: ${bill.name}`, 'success');
  } else {
    bill.status = 'partial';
    toastManager.show(`Partial payment of ₱${partialAmount} applied to ${bill.name}`, 'success');
  }
  saveState();
  return true;
}

/* ================ Subscription Management ================ */
function cancelSubscription(billId) {
  const bill = findBillById(billId);
  if (!bill) {
    toastManager.show('Bill not found', 'error');
    return false;
  }
  if (!confirm(`Are you sure you want to cancel subscription "${bill.name}"?`)) return false;
  bill.status = 'canceled';
  bill.recurringRule = { interval: 'none', autoGenerate: false };
  bill.updatedAt = new Date().toISOString();
  saveState();
  toastManager.show(`Subscription canceled: ${bill.name}`, 'info');
  return true;
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
  // Add recurring bill
  let m = text.match(/^add\s+recurring\s+(.+?)\s+(\d+(?:\.\d+)?)\s+due\s+(\d{4}-\d{2}-\d{2})\s+monthly$/i);
  if (m) {
    const bill = createBill(m[1], Number(m[2]), m[3], false, '', { interval: 'monthly', autoGenerate: true });
    addMsg('system', `Added recurring bill: ${bill.name} ₱${bill.amount.toFixed(0)} due ${bill.due} (monthly).`);
    renderAll();
    return;
  }
  
  // Add regular bill
  m = text.match(/^add\s+(.+?)\s+(\d+(?:\.\d+)?)\s+due\s+(\d{4}-\d{2}-\d{2})$/i);
  if (m) {
    const bill = createBill(m[1], Number(m[2]), m[3], false);
    addMsg('system', `Added bill: ${bill.name} ₱${bill.amount.toFixed(0)} due ${bill.due}.`);
    renderAll();
    return;
  }
  
  // Schedule payment
  m = text.match(/^schedule\s+payment\s+(.+?)\s+(\d+(?:\.\d+)?)\s+on\s+(\d{4}-\d{2}-\d{2})$/i);
  if (m) {
    const [_, name, amtStr, date] = m;
    const amt = Number(amtStr);
    const bill = findBill(name, amt, date);
    if (bill) {
      bill.scheduled = true;
      bill.status = 'scheduled';
      bill.updatedAt = new Date().toISOString();
      saveState();
      addMsg('system', `Scheduled ${bill.name} on ${date}.`);
    } else {
      createBill(name, amt, date, true);
      addMsg('system', `Created & scheduled ${name} ₱${amt} for ${date}.`);
    }
    renderAll();
    return;
  }
  
  // Prioritize bills
  m = text.match(/^prioritize\s+bills\s+if\s+monthly\s+budget\s+is\s+(\d+(?:\.\d+)?)$/i);
  if (m) {
    store.monthlyBudget = Number(m[1]);
    if (store.useWeightedPrioritization) {
      prioritizeWeighted();
    } else {
      prioritizeByBudget();
    }
    saveState();
    addMsg('system', `Prioritized bills for monthly budget ₱${store.monthlyBudget}.`);
    renderAll();
    return;
  }
  
  // Show reminders
  if (/^show\s+reminders$/i.test(text)) {
    const summary = store.reminders.map(r => {
      const bill = store.bills.find(b => b.id === r.billId);
      return `${bill?.name ?? 'Bill'} on ${r.when}`;
    });
    addMsg('system', summary.length ? `Reminders:\n- ${summary.join('\n- ')}` : 'No reminders yet.');
    return;
  }
  
  // Renew OTP
  if (/^renew\s+otp$/i.test(text)) {
    store.otpMonth = currentMonthStr();
    saveState();
    addMsg('system', `OTP renewed for ${store.otpMonth}.`);
    const status = document.getElementById('otp-status');
    if (status) status.textContent = `Active ${store.otpMonth}`;
    return;
  }
  
  // Show recurring bills
  if (/^show\s+recurring$/i.test(text)) {
    const recurring = store.bills.filter(b => b.recurringRule && b.recurringRule.interval !== 'none');
    if (recurring.length === 0) {
      addMsg('system', 'No recurring bills found.');
    } else {
      const list = recurring.map(b => `${b.name} ₱${b.amount} due ${b.due} (${b.recurringRule.interval})`);
      addMsg('system', `Recurring bills:\n- ${list.join('\n- ')}`);
    }
    return;
  }
  
  // Pay partial
  m = text.match(/^pay\s+partial\s+(.+?)\s+(\d+(?:\.\d+)?)$/i);
  if (m) {
    const name = m[1].trim();
    const amount = Number(m[2]);
    const bill = store.bills.find(b => b.name.toLowerCase() === name.toLowerCase() && b.status !== 'paid' && b.status !== 'canceled');
    if (!bill) {
      addMsg('system', `No unpaid bill found with name "${name}".`);
      return;
    }
    if (processPartialPayment(bill.id, amount)) {
      addMsg('system', `Partial payment of ₱${amount} applied to ${bill.name}. Remaining: ₱${bill.amountRemaining}`);
    } else {
      addMsg('system', `Failed to process partial payment for ${name}.`);
    }
    renderAll();
    return;
  }
  
  // Enable weighted prioritization
  if (/^enable\s+weighted\s+prioritization$/i.test(text)) {
    store.useWeightedPrioritization = true;
    saveState();
    addMsg('system', 'Weighted prioritization enabled.');
    renderAll();
    return;
  }
  
  // Disable weighted prioritization
  if (/^disable\s+weighted\s+prioritization$/i.test(text)) {
    store.useWeightedPrioritization = false;
    saveState();
    addMsg('system', 'Weighted prioritization disabled.');
    renderAll();
    return;
  }
  
  // Cancel subscription
  m = text.match(/^cancel\s+subscription\s+(.+)$/i);
  if (m) {
    const name = m[1].trim();
    const bill = store.bills.find(b => b.name.toLowerCase() === name.toLowerCase() && b.status !== 'canceled');
    if (!bill) {
      addMsg('system', `No active subscription found with name "${name}".`);
      return;
    }
    bill.status = 'canceled';
    bill.recurringRule = { interval: 'none', autoGenerate: false };
    bill.updatedAt = new Date().toISOString();
    saveState();
    addMsg('system', `Subscription "${bill.name}" has been canceled.`);
    renderAll();
    return;
  }
  
  // Help
  addMsg('system', `Commands:
- Add Meralco 1500 due YYYY-MM-DD
- Add recurring Meralco 1500 due YYYY-MM-DD monthly
- Schedule payment Meralco 1500 on YYYY-MM-DD
- Prioritize bills if monthly budget is 3000
- Pay partial Meralco 500
- Show reminders
- Show recurring
- Enable weighted prioritization
- Disable weighted prioritization
- Cancel subscription Netflix
- Renew OTP`);
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
    if (store.useWeightedPrioritization) {
      prioritizeWeighted();
    } else {
      prioritizeByBudget();
    }
    saveState();
    toastManager.show('Priorities recalculated', 'success');
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
    store.bills.filter(b => b.due === day.dateStr && b.status !== 'canceled').forEach(b => {
      const tag = document.createElement('div');
      tag.className = 'bill';
      if (b.scheduled || b.status === 'paid') tag.classList.add('scheduled');
      if (b.prioritized) tag.classList.add('prioritized');
      if (!b.prioritized && store.monthlyBudget > 0) tag.classList.add('overflow');
      if (b.status === 'partial') tag.classList.add('partial');
      
      // Build display text with badges
      let badges = '';
      if (b.recurringRule && b.recurringRule.interval !== 'none') badges += '<span class="bill-badge recurring">R</span>';
      if (b.status === 'partial') badges += '<span class="bill-badge partial">P</span>';
      
      const amountText = b.status === 'partial' 
        ? `₱${b.amount - b.amountRemaining}/${b.amount}` 
        : `₱${b.amount}`;
      tag.innerHTML = `${badges}${b.name} ${amountText}`;
      cell.appendChild(tag);
    });
    calendarGrid.appendChild(cell);
  });
}

/* ---------------- Prioritization ---------------- */
function prioritizeByBudget() {
  const ym = (calendarMonth && calendarMonth.value) || currentMonthStr();
  const monthBills = store.bills.filter(b => b.due.startsWith(ym) && b.status !== 'paid' && b.status !== 'canceled');
  const sorted = [...monthBills].sort((a, b) =>
    (b.scheduled - a.scheduled) ||
    ((a.amountRemaining || a.amount) - (b.amountRemaining || b.amount)) ||
    (new Date(a.due) - new Date(b.due))
  );
  let acc = 0;
  sorted.forEach(b => {
    const amt = b.amountRemaining || b.amount;
    if (store.monthlyBudget > 0 && acc + amt <= store.monthlyBudget) {
      b.prioritized = true;
      acc += amt;
    } else {
      b.prioritized = false;
    }
  });
}

/* ---------------- Weighted Prioritization ---------------- */
const ESSENTIAL_CATEGORIES = ['Utilities', 'Government'];
const CATEGORY_WEIGHTS = {
  'Utilities': 1.5,
  'Government': 1.5,
  'Telco': 1.0,
  'Internet': 1.0,
  'E-Wallets': 0.8,
  'Streaming': 0.5,
  'Other': 0.7
};

function prioritizeWeighted() {
  const ym = (calendarMonth && calendarMonth.value) || currentMonthStr();
  const monthBills = store.bills.filter(b => b.due.startsWith(ym) && b.status !== 'paid' && b.status !== 'canceled');
  
  // Calculate weighted score for each bill
  const scored = monthBills.map(b => {
    const amt = b.amountRemaining || b.amount;
    let score = 0;
    
    // Scheduled bonus
    if (b.scheduled) score += 2;
    
    // Category weight
    const catWeight = CATEGORY_WEIGHTS[b.category] || 0.7;
    score += catWeight;
    
    // Amount penalty (higher amounts get slightly lower priority)
    score -= amt / 10000;
    
    return { bill: b, score, amount: amt };
  });
  
  // Sort by score (descending)
  scored.sort((a, b) => b.score - a.score);
  
  let acc = 0;
  scored.forEach(({ bill, amount }) => {
    if (store.monthlyBudget > 0 && acc + amount <= store.monthlyBudget) {
      bill.prioritized = true;
      acc += amount;
    } else {
      bill.prioritized = false;
    }
  });
}

/* ---------------- Dashboard ---------------- */
function renderDashboard() {
  const fundsEl = el('funds-balance');
  if (fundsEl) fundsEl.textContent = `₱${store.funds.toFixed(0)}`;

  const ym = (calendarMonth && calendarMonth.value) || currentMonthStr();
  const bills = store.bills.filter(b => b.due.startsWith(ym) && b.status !== 'canceled');
  const scheduledCount = bills.filter(b => b.scheduled || b.status === 'paid').length;
  const prioritizedSum = bills.filter(b => b.prioritized).reduce((s, b) => s + (b.amountRemaining || b.amount), 0);
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

  // Update weighted prioritization toggle
  const weightedToggle = el('weighted-toggle');
  if (weightedToggle) weightedToggle.checked = store.useWeightedPrioritization;

  // Update last saved display
  updateLastSavedDisplay();

  const remindersUl = el('reminders-list');
  if (remindersUl) {
    remindersUl.innerHTML = '';
    store.reminders.filter(r => r.when.startsWith(ym)).forEach(r => {
      const b = store.bills.find(x => x.id === r.billId);
      if (b && b.status !== 'canceled') {
        const li = document.createElement('li');
        li.textContent = `${b?.name ?? 'Bill'} — ${r.when}`;
        remindersUl.appendChild(li);
      }
    });
  }

  const recentTableBody = document.querySelector('#recent-bills-table tbody');
  if (recentTableBody) {
    recentTableBody.innerHTML = '';
    const recent = [...store.bills].sort((a, b) => new Date(b.due) - new Date(a.due)).slice(0, 10);
    recent.forEach(b => {
      const tr = document.createElement('tr');
      if (b.status === 'canceled') tr.classList.add('canceled');
      
      // Amount display with partial payment indicator
      const amountDisplay = b.status === 'partial' || (b.amountRemaining !== undefined && b.amountRemaining < b.amount)
        ? `₱${b.amount - b.amountRemaining}/${b.amount}`
        : `₱${b.amount}`;
      
      // Badges
      let badges = '';
      if (b.recurringRule && b.recurringRule.interval !== 'none') badges += '<span class="bill-badge recurring" title="Recurring">R</span>';
      if (b.status === 'partial') badges += '<span class="bill-badge partial" title="Partially paid">P</span>';
      
      // Status display
      let statusText = b.status === 'paid' ? 'Paid' : 
                       b.status === 'partial' ? 'Partial' :
                       b.status === 'canceled' ? 'Canceled' :
                       b.scheduled ? 'Scheduled' : 'Pending';
      
      // Determine available actions
      let actions = '';
      if (b.status !== 'paid' && b.status !== 'canceled') {
        actions += `<button class="btn schedule" data-id="${b.id}">${b.scheduled ? 'Unschedule' : 'Schedule'}</button>`;
        actions += `<button class="btn primary pay" data-id="${b.id}">Pay</button>`;
        actions += `<button class="btn secondary partial-pay" data-id="${b.id}">Partial</button>`;
      }
      if (b.category === 'Streaming' && b.status !== 'canceled') {
        actions += `<button class="btn warn cancel-sub" data-id="${b.id}">Cancel</button>`;
      }
      actions += `<button class="btn delete" data-id="${b.id}">Delete</button>`;
      
      tr.innerHTML = `
        <td>${badges}${b.name}</td>
        <td>${b.category || '—'}</td>
        <td class="amount-cell" data-id="${b.id}">${amountDisplay}</td>
        <td>${b.due}</td>
        <td>${statusText}</td>
        <td>${actions}</td>
      `;
      recentTableBody.appendChild(tr);
    });

    // Inline editing for amount
    recentTableBody.querySelectorAll('.amount-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const id = cell.getAttribute('data-id');
        const bill = findBillById(id);
        if (!bill || bill.status === 'paid' || bill.status === 'canceled') return;
        
        const currentAmount = bill.amount;
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'inline-edit';
        input.value = currentAmount;
        input.min = '0';
        
        const originalContent = cell.innerHTML;
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
        
        const save = () => {
          const newAmount = Number(input.value);
          if (newAmount > 0 && newAmount !== currentAmount) {
            const diff = newAmount - currentAmount;
            bill.amount = newAmount;
            bill.amountRemaining = (bill.amountRemaining || currentAmount) + diff;
            if (bill.amountRemaining < 0) bill.amountRemaining = 0;
            bill.updatedAt = new Date().toISOString();
            saveState();
            toastManager.show(`Amount updated for ${bill.name}`, 'success');
          }
          renderAll();
        };
        
        const cancel = () => {
          cell.innerHTML = originalContent;
        };
        
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        });
      });
    });

    // Schedule actions
    recentTableBody.querySelectorAll('.btn.schedule').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const bill = findBillById(id);
        if (bill) {
          bill.scheduled = !bill.scheduled;
          bill.status = bill.scheduled ? 'scheduled' : 'pending';
          bill.updatedAt = new Date().toISOString();
          if (store.useWeightedPrioritization) {
            prioritizeWeighted();
          } else {
            prioritizeByBudget();
          }
          saveState();
          renderAll();
        }
      });
    });

    // Pay actions
    recentTableBody.querySelectorAll('.btn.pay').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const bill = findBillById(id);
        if (!bill) return;
        const amountToPay = bill.amountRemaining || bill.amount;
        if (store.funds < amountToPay) {
          toastManager.show('Insufficient funds. Top up first.', 'error');
          return;
        }
        store.funds -= amountToPay;
        bill.amountRemaining = 0;
        bill.scheduled = true;
        bill.status = 'paid';
        bill.updatedAt = new Date().toISOString();
        
        // Generate next recurrence if applicable
        if (bill.recurringRule && bill.recurringRule.interval !== 'none') {
          generateNextRecurrence(bill);
        }
        
        saveState();
        toastManager.show(`Paid ${bill.name} for ₱${amountToPay}`, 'success');
        addMsg('system', `Paid ${bill.name} for ₱${amountToPay}. Remaining funds: ₱${store.funds.toFixed(0)}`);
        renderAll();
      });
    });

    // Partial pay actions
    recentTableBody.querySelectorAll('.btn.partial-pay').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const bill = findBillById(id);
        if (!bill) return;
        const remaining = bill.amountRemaining || bill.amount;
        const amount = prompt(`Enter partial payment amount (Remaining: ₱${remaining}):`);
        if (amount === null) return;
        const partialAmount = Number(amount);
        if (processPartialPayment(id, partialAmount)) {
          renderAll();
        }
      });
    });

    // Cancel subscription actions
    recentTableBody.querySelectorAll('.btn.cancel-sub').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (cancelSubscription(id)) {
          renderAll();
        }
      });
    });

    // Delete actions
    recentTableBody.querySelectorAll('.btn.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (deleteBill(id)) {
          if (store.useWeightedPrioritization) {
            prioritizeWeighted();
          } else {
            prioritizeByBudget();
          }
          renderAll();
        }
      });
    });
  }
}

/* ---------------- Points & Funds ---------------- */
const claimBtn = document.getElementById('claim-streak');
if (claimBtn) {
  claimBtn.addEventListener('click', () => {
    store.points += 10;
    saveState();
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
    saveState();
    toastManager.show(`Top up: ₱${amt.toFixed(0)}`, 'success');
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
    if (store.useWeightedPrioritization) {
      prioritizeWeighted();
    } else {
      prioritizeByBudget();
    }
    saveState();
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
    toastManager.show('Budget calculated', 'success');
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
    const recurrence = document.getElementById('qa-recurrence')?.value || 'none';
    if (!name || !amount || !due) return;
    
    const recurringRule = recurrence === 'monthly' 
      ? { interval: 'monthly', autoGenerate: true }
      : { interval: 'none', autoGenerate: false };
    
    createBill(name, amount, due, false, category, recurringRule);
    if (store.useWeightedPrioritization) {
      prioritizeWeighted();
    } else {
      prioritizeByBudget();
    }
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
    saveState();
    const status = document.getElementById('otp-status');
    if (status) status.textContent = `Active ${store.otpMonth}`;
    addMsg('system', `OTP renewed for ${store.otpMonth}`);
  });
}

/* ---------------- Settings Handlers ---------------- */
function initSettingsHandlers() {
  // Reset data button
  const resetBtn = document.getElementById('reset-data-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetData);
  }
  
  // Export data button
  const exportBtn = document.getElementById('export-data-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportData);
  }
  
  // Import data button
  const importBtn = document.getElementById('import-data-btn');
  const importInput = document.getElementById('import-file-input');
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        importData(e.target.files[0]);
        e.target.value = ''; // Reset input
      }
    });
  }
  
  // Weighted prioritization toggle
  const weightedToggle = document.getElementById('weighted-toggle');
  if (weightedToggle) {
    weightedToggle.checked = store.useWeightedPrioritization;
    weightedToggle.addEventListener('change', () => {
      store.useWeightedPrioritization = weightedToggle.checked;
      if (store.useWeightedPrioritization) {
        prioritizeWeighted();
      } else {
        prioritizeByBudget();
      }
      saveState();
      toastManager.show(store.useWeightedPrioritization ? 'Weighted prioritization enabled' : 'Weighted prioritization disabled', 'info');
      renderAll();
    });
  }
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
function seedDemoData() {
  const ym = currentMonthStr();
  // Only seed if no bills exist (fresh start)
  if (store.bills.length === 0) {
    // Suppress toasts during seed
    const origShow = toastManager.show;
    toastManager.show = () => {};
    
    createBill('Meralco', 1500, `${ym}-05`, false, 'Utilities');
    createBill('Globe', 999, `${ym}-10`, false, 'Telco');
    createBill('Water', 600, `${ym}-15`, true, 'Utilities');
    createBill('Netflix', 549, `${ym}-20`, false, 'Streaming', { interval: 'monthly', autoGenerate: true });
    store.monthlyBudget = 3000;
    
    toastManager.show = origShow;
    
    if (store.useWeightedPrioritization) {
      prioritizeWeighted();
    } else {
      prioritizeByBudget();
    }
    saveState();
  }
}

/* ---------------- Render All ---------------- */
function renderAll() {
  renderCalendar();
  renderDashboard();
  renderTips();
  initFloatingLabels();
}

/* ---------------- Initialize App ---------------- */
function initApp() {
  // Initialize toast manager
  toastManager.init();
  
  // Load persisted state
  loadState();
  
  // Seed demo data if needed
  seedDemoData();
  
  // Initialize settings handlers
  initSettingsHandlers();
  
  // Set up beforeunload to save state
  window.addEventListener('beforeunload', () => {
    saveState();
  });
  
  // Initial render
  renderAll();
}

// Run initialization
initApp();

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
