const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function setTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  const button = document.getElementById('theme-toggle');
  button.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  localStorage.setItem('finance-theme', theme);
}

export function initTheme() {
  const savedTheme = localStorage.getItem('finance-theme') || 'light';
  setTheme(savedTheme);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    setTheme(nextTheme);
  });
}

export function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('transaction-date').value = `${yyyy}-${mm}-${dd}`;
}

export function parseYearMonth(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function formatYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatDateDisplay(date) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR'
  }).format(value);
}

function toLocalDate(transactionDate) {
  return transactionDate.toDate ? transactionDate.toDate() : new Date(transactionDate);
}

export function getTransactionsForDate(transactions, date) {
  const dateStr = date.toISOString().split('T')[0];
  return transactions.filter(t => {
    if (!t.createdAt) return false;
    const tDate = toLocalDate(t.createdAt);
    return tDate.toISOString().split('T')[0] === dateStr;
  });
}

export function getTransactionsForMonth(transactions, month) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  return transactions.filter(t => {
    if (!t.createdAt) return false;
    const tDate = toLocalDate(t.createdAt);
    return tDate.getFullYear() === year && tDate.getMonth() === monthIndex;
  });
}

export function renderCalendar(transactions, displayMonth, selectedDate, onSelectDate) {
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = document.getElementById('calendar-days');
  const fragment = document.createDocumentFragment();
  calendarDays.innerHTML = '';

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    dayEl.textContent = day;
    fragment.appendChild(dayEl);
  }

  const today = new Date();
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const selectedDay = selectedDate.getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = day;

    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayEl.classList.add('today');
    }

    if (day === selectedDay && month === selectedMonth && year === selectedYear) {
      dayEl.classList.add('selected');
    }

    const dayTransactions = getTransactionsForDate(transactions, date);
    if (dayTransactions.length > 0) {
      dayEl.classList.add('has-transactions');
      const indicator = document.createElement('span');
      indicator.className = 'transaction-indicator';
      indicator.textContent = dayTransactions.length;
      dayEl.appendChild(indicator);
    }

    dayEl.addEventListener('click', () => onSelectDate(date));
    fragment.appendChild(dayEl);
  }

  const totalCells = firstDay + daysInMonth;
  const remainingCells = 42 - totalCells;
  for (let day = 1; day <= remainingCells; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    dayEl.textContent = day;
    fragment.appendChild(dayEl);
  }

  calendarDays.appendChild(fragment);
}

export function updateDateDetailsView(transactions, selectedDate) {
  const dateTransactions = getTransactionsForDate(transactions, selectedDate);
  const tableBody = document.getElementById('date-transaction-table');
  document.getElementById('selected-date-display').textContent = formatDateDisplay(selectedDate);

  if (dateTransactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div>No transactions on this date</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = dateTransactions.map(transaction => `
    <tr>
      <td>${transaction.description}</td>
      <td>${transaction.type === 'income' ? '📈 Income' : '📉 Expense'}</td>
      <td>${formatCurrency(transaction.amount)}</td>
      <td>
        <button class="delete-transaction-btn" data-id="${transaction.id}" type="button">Delete</button>
      </td>
    </tr>
  `).join('');
}

export function updateMonthTransactionsList(transactions, summaryMonth) {
  const monthTransactions = getTransactionsForMonth(transactions, summaryMonth);
  const tableBody = document.getElementById('date-transaction-table');
  const monthYear = `${monthNames[summaryMonth.getMonth()]} ${summaryMonth.getFullYear()}`;
  document.getElementById('selected-date-display').textContent = monthYear;

  if (monthTransactions.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4">
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <div>No transactions in this month</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const sorted = [...monthTransactions].sort((a, b) => {
    const dateA = toLocalDate(a.createdAt);
    const dateB = toLocalDate(b.createdAt);
    return dateB - dateA;
  });

  tableBody.innerHTML = sorted.map(transaction => {
    const date = toLocalDate(transaction.createdAt);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isIncome = transaction.type === 'income';
    const amountClass = isIncome ? 'amount-income' : 'amount-expense';
    const icon = isIncome ? '📈' : '📉';

    return `
      <tr>
        <td>
          <div class="transaction-row">
            <div class="transaction-date">${dateStr}</div>
            <div class="transaction-description">${transaction.description}</div>
          </div>
        </td>
        <td>${icon} ${isIncome ? 'Income' : 'Expense'}</td>
        <td class="${amountClass}">${formatCurrency(transaction.amount)}</td>
        <td>
          <button class="delete-transaction-btn" data-id="${transaction.id}" type="button">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

export function updateTotals(transactions, summaryMonth) {
  const monthTransactions = getTransactionsForMonth(transactions, summaryMonth);
  const incomeTotal = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = incomeTotal - expenseTotal;

  document.getElementById('income-total').textContent = formatCurrency(incomeTotal);
  document.getElementById('expense-total').textContent = formatCurrency(expenseTotal);
  document.getElementById('balance-total').textContent = formatCurrency(balance);
}

export function setSummaryMonthPickerValue(summaryMonth) {
  const summaryPicker = document.getElementById('summary-month-picker');
  if (!summaryPicker) return;
  summaryPicker.value = formatYearMonth(summaryMonth);
}

export { monthNames };
