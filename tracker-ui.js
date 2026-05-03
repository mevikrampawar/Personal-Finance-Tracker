/**
 * Finance Tracker UI Module
 * Handles all UI rendering and formatting logic
 */

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Default currency configuration - easily customizable
const currencyConfig = {
  code: 'INR',
  locale: 'en-IN'
};

/**
 * Set the current theme (light/dark)
 * @param {string} theme - Theme name ('light' or 'dark')
 */
export function setTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  const button = document.getElementById('theme-toggle');
  if (button) {
    button.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
  localStorage.setItem('finance-theme', theme);
}

/**
 * Initialize theme from localStorage or system preference
 */
export function initTheme() {
  const savedTheme = localStorage.getItem('finance-theme') || 'light';
  setTheme(savedTheme);
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
      setTheme(nextTheme);
    });
  }
}

/**
 * Set today's date as default in transaction date input
 */
export function setDefaultDate() {
  const today = new Date();
  const dateInput = document.getElementById('transaction-date');
  if (dateInput) {
    dateInput.value = formatDateForInput(today);
  }
}

/**
 * Format date for HTML input[type="date"]
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
function formatDateForInput(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse year-month string to Date object
 * @param {string} value - Year-month string (YYYY-MM)
 * @returns {Date} - Date object set to first day of month
 */
export function parseYearMonth(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/**
 * Format Date object to year-month string
 * @param {Date} date - Date to format
 * @returns {string} - Formatted string (YYYY-MM)
 */
export function formatYearMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format date for display (e.g., "Monday, January 1, 2024")
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDateDisplay(date) {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(currencyConfig.locale, options);
}

/**
 * Format currency amount using configured locale and code
 * @param {number} value - Amount to format
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(value) {
  try {
    return new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code
    }).format(value);
  } catch (error) {
    console.warn('Currency formatting error:', error);
    return `${currencyConfig.code} ${value.toFixed(2)}`;
  }
}

/**
 * Convert Firestore Timestamp to JavaScript Date
 * @param {*} transactionDate - Firestore Timestamp or JavaScript Date
 * @returns {Date} - JavaScript Date object
 */
function toLocalDate(transactionDate) {
  if (!transactionDate) return null;
  return transactionDate.toDate ? transactionDate.toDate() : new Date(transactionDate);
}

/**
 * Filter transactions by specific date
 * @param {Array} transactions - Array of transaction objects
 * @param {Date} date - Date to filter by
 * @returns {Array} - Filtered transactions for that date
 */
export function getTransactionsForDate(transactions, date) {
  if (!Array.isArray(transactions) || !date) return [];
  const dateStr = date.toISOString().split('T')[0];
  return transactions.filter(t => {
    if (!t.createdAt) return false;
    const tDate = toLocalDate(t.createdAt);
    return tDate && tDate.toISOString().split('T')[0] === dateStr;
  });
}

/**
 * Filter transactions by specific month
 * @param {Array} transactions - Array of transaction objects
 * @param {Date} month - Month to filter by (only year and month matter)
 * @returns {Array} - Filtered transactions for that month
 */
export function getTransactionsForMonth(transactions, month) {
  if (!Array.isArray(transactions) || !month) return [];
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  return transactions.filter(t => {
    if (!t.createdAt) return false;
    const tDate = toLocalDate(t.createdAt);
    return tDate && tDate.getFullYear() === year && tDate.getMonth() === monthIndex;
  });
}

/**
 * Render calendar view for given month
 * @param {Array} transactions - All transactions
 * @param {Date} displayMonth - Month to display
 * @param {Date} selectedDate - Currently selected date
 * @param {Function} onSelectDate - Callback when date is clicked
 */
export function renderCalendar(transactions, displayMonth, selectedDate, onSelectDate) {
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = document.getElementById('calendar-days');
  if (!calendarDays) return;

  const fragment = document.createDocumentFragment();
  calendarDays.innerHTML = '';

  // Previous month's trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dayEl = createCalendarDayElement(day, 'calendar-day other-month');
    fragment.appendChild(dayEl);
  }

  const today = new Date();
  const selectedYear = selectedDate.getFullYear();
  const selectedMonth = selectedDate.getMonth();
  const selectedDay = selectedDate.getDate();

  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayEl = createCalendarDayElement(day, 'calendar-day');

    // Add today indicator
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayEl.classList.add('today');
    }

    // Add selected indicator
    if (day === selectedDay && month === selectedMonth && year === selectedYear) {
      dayEl.classList.add('selected');
    }

    // Add transaction count indicator
    const dayTransactions = getTransactionsForDate(transactions, date);
    if (dayTransactions.length > 0) {
      dayEl.classList.add('has-transactions');
      const indicator = document.createElement('span');
      indicator.className = 'transaction-indicator';
      indicator.textContent = dayTransactions.length;
      indicator.setAttribute('aria-label', `${dayTransactions.length} transaction(s)`);
      dayEl.appendChild(indicator);
    }

    dayEl.addEventListener('click', () => onSelectDate(date));
    fragment.appendChild(dayEl);
  }

  // Next month's leading days
  const totalCells = firstDay + daysInMonth;
  const remainingCells = 42 - totalCells;
  for (let day = 1; day <= remainingCells; day++) {
    const dayEl = createCalendarDayElement(day, 'calendar-day other-month');
    fragment.appendChild(dayEl);
  }

  calendarDays.appendChild(fragment);
}

/**
 * Helper to create calendar day element
 * @param {number} day - Day number
 * @param {string} className - CSS class names
 * @returns {HTMLElement} - Calendar day element
 */
function createCalendarDayElement(day, className) {
  const dayEl = document.createElement('div');
  dayEl.className = className;
  dayEl.textContent = day;
  return dayEl;
}

/**
 * Update the date details view showing transactions for selected date
 * @param {Array} transactions - All transactions
 * @param {Date} selectedDate - Selected date to show
 */
export function updateDateDetailsView(transactions, selectedDate) {
  const dateTransactions = getTransactionsForDate(transactions, selectedDate);
  const tableBody = document.getElementById('date-transaction-table');
  const dateDisplay = document.getElementById('selected-date-display');

  if (!tableBody || !dateDisplay) return;

  dateDisplay.textContent = formatDateDisplay(selectedDate);

  if (dateTransactions.length === 0) {
    tableBody.innerHTML = createEmptyStateHTML();
    return;
  }

  tableBody.innerHTML = dateTransactions
    .map(transaction => createTransactionRow(transaction, true))
    .join('');
}

/**
 * Update month transactions list view
 * @param {Array} transactions - All transactions
 * @param {Date} summaryMonth - Month to summarize
 */
export function updateMonthTransactionsList(transactions, summaryMonth) {
  const monthTransactions = getTransactionsForMonth(transactions, summaryMonth);
  const tableBody = document.getElementById('date-transaction-table');
  const dateDisplay = document.getElementById('selected-date-display');

  if (!tableBody || !dateDisplay) return;

  const monthYear = `${monthNames[summaryMonth.getMonth()]} ${summaryMonth.getFullYear()}`;
  dateDisplay.textContent = monthYear;

  if (monthTransactions.length === 0) {
    tableBody.innerHTML = createEmptyStateHTML();
    return;
  }

  const sorted = [...monthTransactions].sort((a, b) => {
    const dateA = toLocalDate(a.createdAt);
    const dateB = toLocalDate(b.createdAt);
    return dateB - dateA;
  });

  tableBody.innerHTML = sorted
    .map(transaction => createTransactionRow(transaction, false))
    .join('');
}

/**
 * Create HTML for a transaction row
 * @param {Object} transaction - Transaction object
 * @param {boolean} showDate - Whether to show date (false for month view)
 * @returns {string} - HTML string for table row
 */
function createTransactionRow(transaction, showDate = false) {
  const isIncome = transaction.type === 'income';
  const amountClass = isIncome ? 'amount-income' : 'amount-expense';
  const icon = isIncome ? '📈' : '📉';

  let descriptionHTML;
  if (showDate) {
    descriptionHTML = transaction.description;
  } else {
    const date = toLocalDate(transaction.createdAt);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    descriptionHTML = `
      <div class="transaction-row">
        <div class="transaction-date">${dateStr}</div>
        <div class="transaction-description">${transaction.description}</div>
      </div>
    `;
  }

  return `
    <tr>
      <td>${descriptionHTML}</td>
      <td><span aria-label="${isIncome ? 'Income' : 'Expense'}">${icon} ${isIncome ? 'Income' : 'Expense'}</span></td>
      <td>${transaction.category || '-'}</td>
      <td class="${amountClass}">${formatCurrency(transaction.amount)}</td>
      <td>
        <button class="delete-transaction-btn" data-id="${transaction.id}" type="button" aria-label="Delete transaction">Delete</button>
      </td>
    </tr>
  `;
}

/**
 * Create empty state HTML
 * @returns {string} - HTML for empty state
 */
function createEmptyStateHTML() {
  return `
    <tr>
      <td colspan="5">
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">📭</div>
          <div>No transactions found</div>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Update totals display for given month
 * @param {Array} transactions - All transactions
 * @param {Date} summaryMonth - Month to calculate totals for
 */
export function updateTotals(transactions, summaryMonth) {
  const monthTransactions = getTransactionsForMonth(transactions, summaryMonth);

  const incomeTotal = monthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const expenseTotal = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const balance = incomeTotal - expenseTotal;

  const incomeEl = document.getElementById('income-total');
  const expenseEl = document.getElementById('expense-total');
  const balanceEl = document.getElementById('balance-total');

  if (incomeEl) incomeEl.textContent = formatCurrency(incomeTotal);
  if (expenseEl) expenseEl.textContent = formatCurrency(expenseTotal);
  if (balanceEl) {
    balanceEl.textContent = formatCurrency(balance);
    balanceEl.classList.toggle('balance-positive', balance >= 0);
    balanceEl.classList.toggle('balance-negative', balance < 0);
  }
}

/**
 * Set the month picker value
 * @param {Date} summaryMonth - Month to set
 */
export function setSummaryMonthPickerValue(summaryMonth) {
  const summaryPicker = document.getElementById('summary-month-picker');
  if (!summaryPicker) return;
  summaryPicker.value = formatYearMonth(summaryMonth);
}

/**
 * Update currency configuration
 * @param {string} code - Currency code (e.g., 'INR', 'USD')
 * @param {string} locale - Locale string (e.g., 'en-IN', 'en-US')
 */
export function setCurrencyConfig(code, locale) {
  currencyConfig.code = code;
  currencyConfig.locale = locale;
}

export { monthNames };
