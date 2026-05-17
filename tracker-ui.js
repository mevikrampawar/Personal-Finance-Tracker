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
  const buttons = [
    document.getElementById('theme-toggle'),
    document.getElementById('mobile-theme-toggle')
  ].filter(Boolean);
  buttons.forEach(button => {
    const nextLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    button.setAttribute('aria-label', nextLabel);
    button.title = nextLabel;
    if (!button.querySelector('.theme-switch-thumb')) {
      button.innerHTML = `
        <span class="theme-switch-track" aria-hidden="true">
          <span class="theme-switch-icon theme-switch-sun"><i class="bi bi-sun-fill" aria-hidden="true"></i></span>
          <span class="theme-switch-icon theme-switch-moon"><i class="bi bi-moon-stars-fill" aria-hidden="true"></i></span>
          <span class="theme-switch-thumb"></span>
        </span>
      `;
    }
  });
  localStorage.setItem('finance-theme', theme);
}

/**
 * Initialize theme from localStorage or system preference
 */
export function initTheme() {
  const savedTheme = localStorage.getItem('finance-theme') || 'light';
  setTheme(savedTheme);
  const themeToggles = [
    document.getElementById('theme-toggle'),
    document.getElementById('mobile-theme-toggle')
  ].filter(Boolean);
  themeToggles.forEach(themeToggle => {
    themeToggle.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
      setTheme(nextTheme);
    });
  });
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
export function toLocalDate(transactionDate) {
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
 * Apply transaction filters to a list.
 * @param {Array} transactions - Transactions to filter
 * @param {Object} filters - Filter configuration
 * @returns {Array} - Filtered transactions
 */
export function applyTransactionFilters(transactions, filters = {}) {
  if (!Array.isArray(transactions)) return [];

  const search = (filters.search || '').trim().toLowerCase();
  const type = filters.type || 'all';
  const category = filters.category || 'all';
  const minAmount = filters.minAmount === '' || filters.minAmount == null ? null : Number(filters.minAmount);
  const maxAmount = filters.maxAmount === '' || filters.maxAmount == null ? null : Number(filters.maxAmount);
  const fromDate = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
  const toDate = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;

  return transactions.filter(transaction => {
    const amount = Number(transaction.amount || 0);
    const description = String(transaction.description || '').toLowerCase();
    const transactionCategory = String(transaction.category || '').toLowerCase();
    const transactionDate = toLocalDate(transaction.createdAt);

    if (search && !description.includes(search) && !transactionCategory.includes(search)) return false;
    if (type !== 'all' && transaction.type !== type) return false;
    if (category !== 'all' && transaction.category !== category) return false;
    if (minAmount !== null && !Number.isNaN(minAmount) && amount < minAmount) return false;
    if (maxAmount !== null && !Number.isNaN(maxAmount) && amount > maxAmount) return false;
    if ((fromDate || toDate) && !transactionDate) return false;
    if (fromDate && transactionDate && transactionDate < fromDate) return false;
    if (toDate && transactionDate && transactionDate > toDate) return false;

    return true;
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
export function updateDateDetailsView(transactions, selectedDate, filters = {}) {
  const dateTransactions = applyTransactionFilters(getTransactionsForDate(transactions, selectedDate), filters);
  const tableBody = document.getElementById('date-transaction-table');
  const dateDisplay = document.getElementById('selected-date-display');

  if (!tableBody || !dateDisplay) return;

  dateDisplay.textContent = formatDateDisplay(selectedDate);

  renderTransactionRows(tableBody, dateTransactions, true);
}

/**
 * Update month transactions list view
 * @param {Array} transactions - All transactions
 * @param {Date} summaryMonth - Month to summarize
 */
export function updateMonthTransactionsList(transactions, summaryMonth, filters = {}) {
  const monthTransactions = applyTransactionFilters(getTransactionsForMonth(transactions, summaryMonth), filters);
  const tableBody = document.getElementById('date-transaction-table');
  const dateDisplay = document.getElementById('selected-date-display');

  if (!tableBody || !dateDisplay) return;

  const monthYear = `${monthNames[summaryMonth.getMonth()]} ${summaryMonth.getFullYear()}`;
  dateDisplay.textContent = monthYear;

  const sorted = [...monthTransactions].sort((a, b) => {
    const dateA = toLocalDate(a.createdAt);
    const dateB = toLocalDate(b.createdAt);
    return dateB - dateA;
  });

  renderTransactionRows(tableBody, sorted, false);
}

/**
 * Create HTML for a transaction row
 * @param {Object} transaction - Transaction object
 * @param {boolean} showDate - Whether to show date (false for month view)
 * @returns {string} - HTML string for table row
 */
function renderTransactionRows(tableBody, transactions, showDate = false) {
  tableBody.innerHTML = '';

  if (transactions.length === 0) {
    tableBody.appendChild(createEmptyStateRow());
    return;
  }

  const fragment = document.createDocumentFragment();
  transactions.forEach(transaction => {
    fragment.appendChild(createTransactionRow(transaction, showDate));
  });
  tableBody.appendChild(fragment);
}

/**
 * Create a transaction row with DOM APIs so user-entered values are escaped.
 * @param {Object} transaction - Transaction object
 * @param {boolean} showDate - Whether to show date
 * @returns {HTMLTableRowElement} - Transaction table row
 */
function createTransactionRow(transaction, showDate = false) {
  const isIncome = transaction.type === 'income';
  const amountClass = isIncome ? 'amount-income' : 'amount-expense';
  const icon = isIncome ? '📈' : '📉';
  const row = document.createElement('tr');
  const descriptionCell = document.createElement('td');

  if (showDate) {
    descriptionCell.textContent = transaction.description || '';
  } else {
    const date = toLocalDate(transaction.createdAt);
    const wrapper = document.createElement('div');
    wrapper.className = 'transaction-row';

    const dateEl = document.createElement('div');
    dateEl.className = 'transaction-date';
    dateEl.textContent = date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';

    const descriptionEl = document.createElement('div');
    descriptionEl.className = 'transaction-description';
    descriptionEl.textContent = transaction.description || '';

    wrapper.append(dateEl, descriptionEl);
    descriptionCell.appendChild(wrapper);
  }

  const typeCell = document.createElement('td');
  const typeSpan = document.createElement('span');
  typeSpan.setAttribute('aria-label', isIncome ? 'Income' : 'Expense');
  typeSpan.textContent = `${icon} ${isIncome ? 'Income' : 'Expense'}`;
  typeCell.appendChild(typeSpan);

  const categoryCell = document.createElement('td');
  categoryCell.textContent = transaction.category || '-';

  const amountCell = document.createElement('td');
  amountCell.className = amountClass;
  amountCell.textContent = formatCurrency(Number(transaction.amount || 0));

  const actionCell = document.createElement('td');
  const actionGroup = document.createElement('div');
  actionGroup.className = 'table-actions';

  const editButton = document.createElement('button');
  editButton.className = 'edit-transaction-btn';
  editButton.dataset.id = transaction.id;
  editButton.type = 'button';
  editButton.textContent = 'Edit';
  editButton.setAttribute('aria-label', 'Edit transaction');

  const deleteButton = document.createElement('button');
  deleteButton.className = 'delete-transaction-btn';
  deleteButton.dataset.id = transaction.id;
  deleteButton.type = 'button';
  deleteButton.innerHTML = '<span class="delete-lid" aria-hidden="true"></span><span class="delete-can" aria-hidden="true"></span><span class="delete-label">Delete</span>';
  deleteButton.setAttribute('aria-label', 'Delete transaction');

  actionGroup.append(editButton, deleteButton);
  actionCell.appendChild(actionGroup);
  row.append(descriptionCell, typeCell, categoryCell, amountCell, actionCell);

  return row;
}

/**
 * Create empty state HTML
 * @returns {string} - HTML for empty state
 */
function createEmptyStateRow(message = 'No transactions found') {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  const empty = document.createElement('div');
  const icon = document.createElement('div');
  const text = document.createElement('div');

  cell.colSpan = 5;
  empty.className = 'empty-state';
  icon.className = 'empty-state-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '📭';
  text.textContent = message;

  empty.append(icon, text);
  cell.appendChild(empty);
  row.appendChild(cell);
  return row;
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
 * Render category filter options.
 * @param {Array} categories - Expense categories
 */
export function renderCategoryFilters(categories) {
  const filterSelect = document.getElementById('filter-category');
  const recurringSelect = document.getElementById('recurring-category');
  [filterSelect, recurringSelect].forEach(select => {
    if (!select) return;
    const firstLabel = select.id === 'filter-category' ? 'All Categories' : 'Select Category';
    const firstValue = select.id === 'filter-category' ? 'all' : '';
    const previous = select.value;
    select.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = firstValue;
    defaultOption.textContent = firstLabel;
    select.appendChild(defaultOption);
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
    if ([...select.options].some(option => option.value === previous)) {
      select.value = previous;
    }
  });
}

/**
 * Render category totals for a month.
 * @param {Array} transactions - All transactions
 * @param {Date} summaryMonth - Selected month
 */
export function renderCategoryBreakdown(transactions, summaryMonth) {
  const container = document.getElementById('category-breakdown');
  if (!container) return;

  const monthTransactions = getTransactionsForMonth(transactions, summaryMonth)
    .filter(transaction => transaction.type === 'expense');
  const totals = getCategoryExpenseTotals(monthTransactions);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const totalExpense = entries.reduce((sum, [, amount]) => sum + amount, 0);

  container.innerHTML = '';
  if (entries.length === 0) {
    container.appendChild(createPanelEmptyState('No expenses for this month'));
    return;
  }

  entries.forEach(([category, amount]) => {
    const row = document.createElement('div');
    row.className = 'breakdown-row';
    const label = document.createElement('div');
    label.className = 'breakdown-label';
    label.textContent = category || 'Uncategorized';
    const amountEl = document.createElement('div');
    amountEl.className = 'breakdown-amount';
    amountEl.textContent = formatCurrency(amount);
    const meter = document.createElement('div');
    meter.className = 'progress-track';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = `${Math.min((amount / totalExpense) * 100, 100)}%`;
    meter.appendChild(fill);
    row.append(label, amountEl, meter);
    container.appendChild(row);
  });
}

/**
 * Render budget usage by category.
 * @param {Array} transactions - All transactions
 * @param {Date} summaryMonth - Selected month
 * @param {Object} budgets - Category budget map
 */
export function renderBudgetSummary(transactions, summaryMonth, budgets = {}) {
  const container = document.getElementById('budget-summary');
  if (!container) return;

  const monthExpenses = getTransactionsForMonth(transactions, summaryMonth)
    .filter(transaction => transaction.type === 'expense');
  const totals = getCategoryExpenseTotals(monthExpenses);
  const budgetEntries = Object.entries(budgets)
    .filter(([, budget]) => Number(budget) > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  container.innerHTML = '';
  if (budgetEntries.length === 0) {
    container.appendChild(createPanelEmptyState('No budgets set'));
    return;
  }

  budgetEntries.forEach(([category, budget]) => {
    const spent = totals[category] || 0;
    const budgetAmount = Number(budget);
    const percent = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
    const row = document.createElement('div');
    row.className = 'budget-row';
    row.classList.toggle('over-budget', spent > budgetAmount);

    const label = document.createElement('div');
    label.className = 'budget-label';
    label.textContent = category;
    const amount = document.createElement('div');
    amount.className = 'budget-amount';
    amount.textContent = `${formatCurrency(spent)} / ${formatCurrency(budgetAmount)}`;
    const meter = document.createElement('div');
    meter.className = 'progress-track';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = `${percent}%`;
    meter.appendChild(fill);
    row.append(label, amount, meter);
    container.appendChild(row);
  });
}

/**
 * Render chart canvases for selected month.
 * @param {Array} transactions - All transactions
 * @param {Date} summaryMonth - Selected month
 */
export function renderCharts(transactions, summaryMonth) {
  const monthTransactions = getTransactionsForMonth(transactions, summaryMonth);
  renderIncomeExpenseChart(monthTransactions);
  renderCategoryChart(monthTransactions.filter(transaction => transaction.type === 'expense'));
}

function getCategoryExpenseTotals(expenses) {
  return expenses.reduce((totals, transaction) => {
    const category = transaction.category || 'Uncategorized';
    totals[category] = (totals[category] || 0) + Number(transaction.amount || 0);
    return totals;
  }, {});
}

function createPanelEmptyState(message) {
  const empty = document.createElement('div');
  empty.className = 'panel-empty-state';
  empty.textContent = message;
  return empty;
}

function setupCanvas(canvas) {
  if (!canvas) return null;
  const context = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(Math.floor(rect.width * ratio), 1);
  canvas.height = Math.max(Math.floor(rect.height * ratio), 1);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  return { context, width: rect.width, height: rect.height };
}

function getCssColor(name, fallback) {
  const value = getComputedStyle(document.body).getPropertyValue(name).trim();
  return value || fallback;
}

function renderIncomeExpenseChart(monthTransactions) {
  const canvas = document.getElementById('income-expense-chart');
  const setup = setupCanvas(canvas);
  if (!setup) return;

  const { context, width, height } = setup;
  const income = monthTransactions
    .filter(transaction => transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const expense = monthTransactions
    .filter(transaction => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  drawBarChart(context, width, height, [
    { label: 'Income', value: income, color: getCssColor('--success', '#10b981') },
    { label: 'Expenses', value: expense, color: getCssColor('--danger', '#ef4b5b') }
  ]);
}

function renderCategoryChart(expenses) {
  const canvas = document.getElementById('category-chart');
  const setup = setupCanvas(canvas);
  if (!setup) return;

  const entries = Object.entries(getCategoryExpenseTotals(expenses))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const colors = ['#5b6cea', '#2aa8a7', '#ef4b5b', '#f59e0b', '#8b5cf6'];
  drawBarChart(setup.context, setup.width, setup.height, entries.map(([label, value], index) => ({
    label,
    value,
    color: colors[index % colors.length]
  })));
}

function drawBarChart(context, width, height, items) {
  const textColor = getCssColor('--text', '#172b4d');
  const mutedColor = getCssColor('--muted', '#576574');
  const max = Math.max(...items.map(item => item.value), 0);
  const padding = 32;
  const chartHeight = height - 72;
  const barAreaWidth = width - padding * 2;

  context.font = '12px system-ui, sans-serif';
  context.fillStyle = mutedColor;

  if (max <= 0 || items.length === 0) {
    context.textAlign = 'center';
    context.fillText('No data for this month', width / 2, height / 2);
    return;
  }

  const gap = 16;
  const barWidth = Math.max((barAreaWidth - gap * (items.length - 1)) / items.length, 24);
  items.forEach((item, index) => {
    const x = padding + index * (barWidth + gap);
    const barHeight = (item.value / max) * chartHeight;
    const y = height - 42 - barHeight;

    context.fillStyle = item.color;
    fillRoundedRect(context, x, y, barWidth, barHeight, 8);

    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.fillText(formatCompactCurrency(item.value), x + barWidth / 2, y - 8);
    context.fillStyle = mutedColor;
    context.fillText(truncateLabel(item.label, 12), x + barWidth / 2, height - 16);
  });
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat(currencyConfig.locale, {
    style: 'currency',
    currency: currencyConfig.code,
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function fillRoundedRect(context, x, y, width, height, radius) {
  if (typeof context.roundRect === 'function') {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
    return;
  }

  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.fill();
}

function truncateLabel(label, maxLength) {
  const text = String(label);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
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
