/**
 * Finance Tracker Application
 * Main application logic and event handling
 */

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
  collection,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import {
  initTheme,
  setDefaultDate,
  parseYearMonth,
  renderCalendar,
  updateDateDetailsView,
  updateMonthTransactionsList,
  updateTotals,
  setSummaryMonthPickerValue,
  getTransactionsForMonth,
  applyTransactionFilters,
  toLocalDate,
  formatCurrency,
  formatYearMonth,
  renderCategoryFilters,
  renderCategoryBreakdown,
  renderBudgetSummary,
  renderCharts,
  monthNames
} from './tracker-ui.js';

// Application state - consolidated for easier management
const appState = {
  currentUser: null,
  transactions: [],
  categoryRecords: [],
  categories: [],
  categoryBudgets: {},
  categoryStorage: 'subcollection',
  recurringTransactions: [],
  unsubscribe: null,
  categoryUnsubscribe: null,
  recurringUnsubscribe: null,
  selectedDate: new Date(),
  displayMonth: new Date(),
  summaryMonth: new Date(),
  activeRoute: 'overview',
  transactionViewMode: 'month',
  editingTransactionId: null,
  filters: {
    search: '',
    type: 'all',
    category: 'all',
    minAmount: '',
    maxAmount: '',
    fromDate: '',
    toDate: ''
  }
};

const defaultCategories = ['Personal', 'Education', 'Grocery'];

const routeConfig = {
  overview: {
    title: 'Overview',
    mobileLabel: () => formatMonthLabel(appState.summaryMonth)
  },
  add: {
    title: 'Add Transaction',
    mobileLabel: () => 'Add Transaction'
  },
  transactions: {
    title: 'Transactions',
    mobileLabel: () => 'Transactions'
  },
  categories: {
    title: 'Budgets',
    mobileLabel: () => 'Budgets'
  },
  recurring: {
    title: 'Recurring',
    mobileLabel: () => 'Recurring'
  }
};

function formatMonthLabel(date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Update summary month display and refresh all related views
 */
function updateSummaryMonthDisplay() {
  const { summaryMonth } = appState;
  const monthLabel = formatMonthLabel(summaryMonth);

  const monthDisplay = document.getElementById('summary-month-year');
  if (monthDisplay) {
    monthDisplay.textContent = monthLabel;
  }

  setSummaryMonthPickerValue(summaryMonth);
  appState.displayMonth = new Date(summaryMonth);

  appState.transactionViewMode = 'month';
  updateRouteChrome();
  refreshDashboard();
}

/**
 * Select a date and update the date details view
 * @param {Date} date - Selected date
 */
function selectDate(date) {
  appState.selectedDate = new Date(date);
  appState.transactionViewMode = 'date';
  refreshDashboard();
}

/**
 * Refresh all views that depend on transactions, budgets, or filters.
 */
function refreshDashboard() {
  renderCalendar(
    appState.transactions,
    appState.displayMonth,
    appState.selectedDate,
    selectDate
  );

  if (appState.transactionViewMode === 'date') {
    updateDateDetailsView(appState.transactions, appState.selectedDate, appState.filters);
  } else {
    updateMonthTransactionsList(appState.transactions, appState.summaryMonth, appState.filters);
  }

  updateTotals(appState.transactions, appState.summaryMonth);
  renderCategoryBreakdown(appState.transactions, appState.summaryMonth);
  renderBudgetSummary(appState.transactions, appState.summaryMonth, appState.categoryBudgets);
  renderCharts(appState.transactions, appState.summaryMonth);
}

/**
 * Initialize application theme and auth state
 */
function initApp() {
  initTheme();

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    appState.currentUser = user;
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) {
      usernameDisplay.textContent = user.displayName || user.email;
    }

    loadCategories();
    loadTransactions();
    loadRecurringTransactions();
  });
}

/**
 * Load transactions from Firestore and set up real-time listener
 */
function loadTransactions() {
  if (!appState.currentUser) {
    console.error('User not authenticated');
    return;
  }

  const transactionsRef = collection(db, 'users', appState.currentUser.uid, 'transactions');
  const q = query(transactionsRef, orderBy('createdAt', 'desc'));

  // Clean up previous listener
  if (appState.unsubscribe) {
    appState.unsubscribe();
  }

  appState.unsubscribe = onSnapshot(q, (snapshot) => {
    appState.transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    refreshDashboard();
  }, (error) => {
    handleError('Unable to load transactions', error);
  });
}

/**
 * Load recurring transaction templates from Firestore.
 */
function loadRecurringTransactions() {
  if (!appState.currentUser) {
    console.error('User not authenticated');
    return;
  }

  const recurringRef = collection(db, 'users', appState.currentUser.uid, 'recurringTransactions');
  const q = query(recurringRef, orderBy('createdAt', 'desc'));

  if (appState.recurringUnsubscribe) {
    appState.recurringUnsubscribe();
  }

  appState.recurringUnsubscribe = onSnapshot(q, (snapshot) => {
    appState.recurringTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderRecurringList();
  }, (error) => {
    handleError('Unable to load recurring transactions', error);
  });
}

/**
 * Load expense categories from Firestore.
 */
function loadCategories() {
  if (!appState.currentUser) {
    console.error('User not authenticated');
    return;
  }

  const categoriesRef = collection(db, 'users', appState.currentUser.uid, 'categories');
  const q = query(categoriesRef, orderBy('name', 'asc'));
  let migrationChecked = false;

  if (appState.categoryUnsubscribe) {
    appState.categoryUnsubscribe();
  }

  appState.categoryUnsubscribe = onSnapshot(q, async (snapshot) => {
    appState.categoryStorage = 'subcollection';
    if (snapshot.empty && !migrationChecked) {
      migrationChecked = true;
      let migrated = false;
      try {
        migrated = await migrateLegacyCategories(categoriesRef);
      } catch (error) {
        if (isPermissionDenied(error)) {
          loadLegacyCategories('Category subcollection writes are blocked by Firestore rules. Using user-profile category storage instead.');
          return;
        }
        handleError('Unable to prepare category records', error);
        return;
      }
      if (migrated) return;
    }

    const records = snapshot.docs
      .map(categoryDoc => {
        const data = categoryDoc.data();
        const name = String(data.name || '').trim();
        return {
          id: categoryDoc.id,
          name,
          monthlyBudget: Number(data.monthlyBudget || 0)
        };
      })
      .filter(category => category.name);
    applyCategoryRecords(records);
  }, (error) => {
    if (isPermissionDenied(error)) {
      loadLegacyCategories('Category subcollection reads are blocked by Firestore rules. Using user-profile category storage instead.');
      return;
    }
    handleError('Unable to load categories', error);
  });
}

function loadLegacyCategories(reason) {
  if (!appState.currentUser) return;

  const userRef = doc(db, 'users', appState.currentUser.uid);
  appState.categoryStorage = 'legacy';

  if (appState.categoryUnsubscribe) {
    appState.categoryUnsubscribe();
  }

  if (reason) {
    console.warn(reason);
  }

  appState.categoryUnsubscribe = onSnapshot(userRef, async (snapshot) => {
    const userData = snapshot.exists() ? snapshot.data() : {};
    const categories = Array.isArray(userData.expenseCategories)
      ? userData.expenseCategories
      : defaultCategories;
    const budgets = userData.categoryBudgets || {};
    const records = buildLegacyCategoryRecords(categories, budgets);

    applyCategoryRecords(records);

    if (!snapshot.exists()) {
      try {
        await saveLegacyCategoryState(records);
      } catch (error) {
        handleError('Unable to prepare default categories', error);
      }
    }
  }, (error) => {
    handleError('Unable to load categories from user profile', error);
  });
}

function buildLegacyCategoryRecords(categories, budgets = {}) {
  return [...new Set(
    categories
      .map(category => String(category || '').trim())
      .filter(Boolean)
  )].map((name, index) => ({
    id: `legacy-${index}`,
    name,
    monthlyBudget: Number(budgets[name] || 0)
  }));
}

function applyCategoryRecords(records) {
  appState.categoryRecords = records;
  appState.categories = records.map(category => category.name);
  appState.categoryBudgets = records.reduce((budgets, category) => {
    if (category.monthlyBudget > 0) {
      budgets[category.name] = category.monthlyBudget;
    }
    return budgets;
  }, {});

  updateCategoryDropdown();
  renderCategoriesList();
  renderBudgetFields();
  renderCategoryFilters(appState.categories);
  refreshDashboard();
}

function isPermissionDenied(error) {
  return error?.code === 'permission-denied' || /permission/i.test(error?.message || '');
}

/**
 * Move legacy category arrays from the user document into category records.
 * @param {CollectionReference} categoriesRef - Category collection reference
 * @returns {Promise<boolean>} - Whether seed data was written
 */
async function migrateLegacyCategories(categoriesRef) {
  const userRef = doc(db, 'users', appState.currentUser.uid);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.exists() ? userDoc.data() : {};
  const legacyCategories = Array.isArray(userData.expenseCategories)
    ? userData.expenseCategories
    : defaultCategories;
  const legacyBudgets = userData.categoryBudgets || {};
  const uniqueCategories = [...new Set(
    legacyCategories
      .map(category => String(category || '').trim())
      .filter(Boolean)
  )];

  if (uniqueCategories.length === 0) {
    return false;
  }

  await Promise.all(uniqueCategories.map(category => addDoc(categoriesRef, {
    name: category,
    monthlyBudget: Number(legacyBudgets[category] || 0),
    createdAt: new Date(),
    updatedAt: new Date()
  })));

  await setDoc(userRef, {
    categoryStorage: 'subcollection',
    schemaVersion: 2,
    migratedAt: new Date()
  }, { merge: true });

  return true;
}

async function saveLegacyCategoryState(records = appState.categoryRecords) {
  const categories = records.map(category => category.name);
  const categoryBudgets = records.reduce((budgets, category) => {
    if (Number(category.monthlyBudget) > 0) {
      budgets[category.name] = Number(category.monthlyBudget);
    }
    return budgets;
  }, {});

  const userRef = doc(db, 'users', appState.currentUser.uid);
  await setDoc(userRef, {
    expenseCategories: categories,
    categoryBudgets,
    categoryStorage: 'legacy',
    schemaVersion: 1,
    updatedAt: new Date()
  }, { merge: true });
}

/**
 * Handle transaction form submission
 * @param {Event} event - Form submission event
 */
async function handleTransactionSubmit(event) {
  event.preventDefault();

  const descriptionEl = document.getElementById('description');
  const typeEl = document.querySelector('input[name="transaction-type"]:checked');
  const categoryEl = document.getElementById('category');
  const amountEl = document.getElementById('amount');
  const dateEl = document.getElementById('transaction-date');

  if (!descriptionEl || !typeEl || !amountEl || !dateEl) {
    handleError('Form elements not found');
    return;
  }

  const description = descriptionEl.value.trim();
  const type = typeEl.value;
  const amount = parseFloat(amountEl.value);
  const dateStr = dateEl.value;
  const category = type === 'expense' ? categoryEl.value.trim() : '';

  // Validation
  if (!description) {
    showNotification('Please enter a description', 'error');
    return;
  }

  if (type === 'expense' && !category) {
    showNotification('Please select a category for expenses', 'error');
    return;
  }

  if (amount <= 0 || isNaN(amount)) {
    showNotification('Please enter a valid amount greater than 0', 'error');
    return;
  }

  if (!dateStr) {
    showNotification('Please select a date', 'error');
    return;
  }

  try {
    const [year, month, day] = dateStr.split('-');
    const transactionDate = new Date(year, month - 1, day);
    transactionDate.setHours(12, 0, 0, 0);

    const payload = {
      description,
      type,
      category,
      categoryId: type === 'expense' ? getCategoryRecordByName(category)?.id || '' : '',
      amount,
      createdAt: transactionDate
    };

    if (appState.editingTransactionId) {
      const transactionRef = doc(
        db,
        'users',
        appState.currentUser.uid,
        'transactions',
        appState.editingTransactionId
      );
      await updateDoc(transactionRef, payload);
      showNotification('Transaction updated successfully', 'success');
    } else {
      const transactionsRef = collection(db, 'users', appState.currentUser.uid, 'transactions');
      await addDoc(transactionsRef, payload);
      showNotification('Transaction added successfully', 'success');
    }

    // Reset form and date
    resetTransactionForm();
  } catch (error) {
    handleError(appState.editingTransactionId ? 'Failed to update transaction' : 'Failed to add transaction', error);
  }
}

/**
 * Reset transaction form to add mode.
 */
function resetTransactionForm() {
  const form = document.getElementById('transaction-form');
  const submitBtn = document.getElementById('transaction-submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');

  if (form) {
    form.reset();
    setDefaultDate();
    toggleCategoryField();
  }

  appState.editingTransactionId = null;
  if (submitBtn) submitBtn.textContent = 'Add Transaction';
  if (cancelBtn) cancelBtn.hidden = true;
}

function getCategoryRecordByName(categoryName) {
  return appState.categoryRecords.find(category => category.name === categoryName);
}

/**
 * Update the category dropdown options
 */
function updateCategoryDropdown() {
  const categorySelect = document.getElementById('category');
  if (!categorySelect) return;

  categorySelect.innerHTML = '<option value="">Select Category</option>';
  appState.categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  renderCategoryFilters(appState.categories);
  if (appState.filters.category !== 'all' && !appState.categories.includes(appState.filters.category)) {
    appState.filters.category = 'all';
    const filterSelect = document.getElementById('filter-category');
    if (filterSelect) filterSelect.value = 'all';
  }
}

/**
 * Render the categories list
 */
function renderCategoriesList() {
  const categoriesContainer = document.getElementById('categories-ul');
  if (!categoriesContainer) return;

  categoriesContainer.innerHTML = '';

  if (appState.categoryRecords.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'panel-note';
    empty.textContent = 'No categories yet.';
    categoriesContainer.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'categories-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Category', 'Saved Budget', 'Action'].forEach(label => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement('tbody');
  appState.categoryRecords.forEach((category, index) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const name = document.createElement('span');
    name.className = 'category-table-name';
    name.textContent = category.name;

    const budgetCell = document.createElement('td');
    const budget = document.createElement('span');
    budget.className = category.monthlyBudget > 0 ? 'budget-pill' : 'budget-pill no-budget';
    budget.textContent = category.monthlyBudget > 0 ? formatCurrency(category.monthlyBudget) : 'No limit';

    const actionCell = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'delete-category galaxy-delete-btn';
    button.dataset.index = String(index);
    button.dataset.id = category.id;
    button.type = 'button';
    button.innerHTML = '<span class="delete-lid" aria-hidden="true"></span><span class="delete-can" aria-hidden="true"></span>';
    button.setAttribute('aria-label', `Delete ${category.name} category`);

    nameCell.appendChild(name);
    budgetCell.appendChild(budget);
    actionCell.appendChild(button);
    row.append(nameCell, budgetCell, actionCell);
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  categoriesContainer.appendChild(table);
}

/**
 * Render monthly budget inputs for all categories.
 */
function renderBudgetFields() {
  const container = document.getElementById('budget-fields');
  if (!container) return;

  container.innerHTML = '';

  if (appState.categoryRecords.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'panel-note';
    empty.textContent = 'Add categories before setting budgets.';
    container.appendChild(empty);
    return;
  }

  appState.categoryRecords.forEach((category, index) => {
    const group = document.createElement('div');
    group.className = 'budget-field';

    const inputId = `budget-category-${index}`;
    const label = document.createElement('label');
    label.textContent = category.name;
    label.setAttribute('for', inputId);

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.id = inputId;
    input.dataset.category = category.name;
    input.dataset.id = category.id;
    input.value = category.monthlyBudget > 0 ? String(category.monthlyBudget) : '';
    input.placeholder = 'No limit';

    group.append(label, input);
    container.appendChild(group);
  });
}

/**
 * Add a new category
 */
async function addCategory() {
  const newCategoryInput = document.getElementById('new-category');
  if (!newCategoryInput) return;

  const newCategory = newCategoryInput.value.trim();
  if (!newCategory) {
    showNotification('Please enter a category name', 'error');
    return;
  }

  if (appState.categories.includes(newCategory)) {
    showNotification('Category already exists', 'error');
    return;
  }

  try {
    if (appState.categoryStorage === 'legacy') {
      const records = [
        ...appState.categoryRecords,
        {
          id: `legacy-${appState.categoryRecords.length}`,
          name: newCategory,
          monthlyBudget: 0
        }
      ];
      applyCategoryRecords(records);
      await saveLegacyCategoryState(records);
      newCategoryInput.value = '';
      showNotification('Category added successfully', 'success');
      return;
    }

    const categoriesRef = collection(db, 'users', appState.currentUser.uid, 'categories');
    await addDoc(categoriesRef, {
      name: newCategory,
      monthlyBudget: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    newCategoryInput.value = '';
    showNotification('Category added successfully', 'success');
  } catch (error) {
    if (isPermissionDenied(error)) {
      loadLegacyCategories('Category subcollection writes are blocked by Firestore rules. Retrying with user-profile category storage.');
      window.setTimeout(addCategory, 0);
      return;
    }
    handleError('Failed to add category', error);
  }
}

/**
 * Delete a category
 */
async function deleteCategory(index) {
  if (index < 0 || index >= appState.categoryRecords.length) return;

  const categoryToDelete = appState.categoryRecords[index];
  if (await confirmAction(`Delete the "${categoryToDelete.name}" category? Existing transactions will keep their saved category name.`)) {
    try {
      if (appState.categoryStorage === 'legacy') {
        const records = appState.categoryRecords.filter((_, recordIndex) => recordIndex !== index);
        applyCategoryRecords(records);
        await saveLegacyCategoryState(records);
        showNotification('Category deleted successfully', 'success');
        return;
      }

      const categoryRef = doc(db, 'users', appState.currentUser.uid, 'categories', categoryToDelete.id);
      await deleteDoc(categoryRef);
      showNotification('Category deleted successfully', 'success');
    } catch (error) {
      if (isPermissionDenied(error)) {
        loadLegacyCategories('Category subcollection deletes are blocked by Firestore rules. Using user-profile category storage instead.');
        showNotification('Category permissions changed. Please try deleting again.', 'error');
        return;
      }
      handleError('Failed to delete category', error);
    }
  }
}

/**
 * Save monthly category budgets.
 */
async function saveBudgets() {
  const inputs = document.querySelectorAll('#budget-fields input[data-category]');
  const nextBudgets = {};
  const updates = [];

  inputs.forEach(input => {
    const amount = Number(input.value);
    const monthlyBudget = input.value !== '' && !Number.isNaN(amount) && amount > 0 ? amount : 0;
    const categoryId = input.dataset.id;

    if (monthlyBudget > 0) {
      nextBudgets[input.dataset.category] = monthlyBudget;
    }

    if (categoryId) {
      const categoryRef = doc(db, 'users', appState.currentUser.uid, 'categories', categoryId);
      updates.push(updateDoc(categoryRef, {
        monthlyBudget,
        updatedAt: new Date()
      }));
    }
  });

  try {
    if (appState.categoryStorage === 'legacy') {
      const records = appState.categoryRecords.map(category => ({
        ...category,
        monthlyBudget: Number(nextBudgets[category.name] || 0)
      }));
      applyCategoryRecords(records);
      await saveLegacyCategoryState(records);
      showNotification('Budgets saved', 'success');
      return;
    }

    await Promise.all(updates);
    appState.categoryBudgets = nextBudgets;
    renderBudgetSummary(appState.transactions, appState.summaryMonth, appState.categoryBudgets);
    showNotification('Budgets saved', 'success');
  } catch (error) {
    if (isPermissionDenied(error)) {
      loadLegacyCategories('Category subcollection updates are blocked by Firestore rules. Retrying budgets with user-profile category storage.');
      window.setTimeout(saveBudgets, 0);
      return;
    }
    handleError('Failed to save budgets', error);
  }
}

/**
 * Toggle category field visibility based on transaction type
 */
function toggleCategoryField() {
  const typeEl = document.querySelector('input[name="transaction-type"]:checked');
  const categoryGroup = document.getElementById('category-group');
  const categorySelect = document.getElementById('category');

  if (typeEl && categoryGroup && categorySelect) {
    if (typeEl.value === 'expense') {
      categoryGroup.style.display = 'block';
      categorySelect.required = true;
    } else {
      categoryGroup.style.display = 'none';
      categorySelect.required = false;
      categorySelect.value = '';
    }
  }
}

/**
 * Delete a transaction by ID
 * @param {string} transactionId - ID of transaction to delete
 */
async function deleteTransaction(transactionId) {
  if (!appState.currentUser || !transactionId) {
    console.error('Invalid delete request');
    return;
  }

  try {
    const transactionRef = doc(
      db,
      'users',
      appState.currentUser.uid,
      'transactions',
      transactionId
    );
    await deleteDoc(transactionRef);
    showNotification('Transaction deleted', 'success');
  } catch (error) {
    handleError('Failed to delete transaction', error);
  }
}

/**
 * Fill the transaction form for editing.
 * @param {string} transactionId - Transaction ID
 */
function editTransaction(transactionId) {
  const transaction = appState.transactions.find(item => item.id === transactionId);
  if (!transaction) {
    showNotification('Transaction not found', 'error');
    return;
  }

  const descriptionEl = document.getElementById('description');
  const amountEl = document.getElementById('amount');
  const dateEl = document.getElementById('transaction-date');
  const categoryEl = document.getElementById('category');
  const typeEl = document.querySelector(`input[name="transaction-type"][value="${transaction.type}"]`);
  const submitBtn = document.getElementById('transaction-submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');

  appState.editingTransactionId = transactionId;
  if (descriptionEl) descriptionEl.value = transaction.description || '';
  if (amountEl) amountEl.value = transaction.amount || '';
  if (typeEl) typeEl.checked = true;
  toggleCategoryField();
  if (categoryEl) categoryEl.value = transaction.category || '';

  const date = toLocalDate(transaction.createdAt);
  if (dateEl && date) {
    dateEl.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  if (submitBtn) submitBtn.textContent = 'Update Transaction';
  if (cancelBtn) cancelBtn.hidden = false;
  setRoute('add');
  window.requestAnimationFrame(() => {
    descriptionEl?.focus({ preventScroll: true });
  });
}

/**
 * Handle logout action
 */
async function logout() {
  const confirmLogout = await confirmAction('Are you sure you want to logout?');
  if (!confirmLogout) return;

  try {
    // Clean up listener
    if (appState.unsubscribe) {
      appState.unsubscribe();
    }
    if (appState.categoryUnsubscribe) {
      appState.categoryUnsubscribe();
    }
    if (appState.recurringUnsubscribe) {
      appState.recurringUnsubscribe();
    }

    await signOut(auth);
    window.location.href = 'index.html';
  } catch (error) {
    handleError('Logout failed', error);
  }
}

/**
 * Navigate to previous month in summary
 */
function goToPreviousMonth() {
  appState.summaryMonth = new Date(
    appState.summaryMonth.getFullYear(),
    appState.summaryMonth.getMonth() - 1,
    1
  );
  updateSummaryMonthDisplay();
}

/**
 * Navigate to next month in summary
 */
function goToNextMonth() {
  appState.summaryMonth = new Date(
    appState.summaryMonth.getFullYear(),
    appState.summaryMonth.getMonth() + 1,
    1
  );
  updateSummaryMonthDisplay();
}

/**
 * Handle month picker change
 * @param {Event} event - Change event from month picker
 */
function handleMonthPickerChange(event) {
  appState.summaryMonth = parseYearMonth(event.target.value);
  updateSummaryMonthDisplay();
}

function openNativePicker(input) {
  if (!input) return;

  input.focus({ preventScroll: true });
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
    } catch (error) {
      // Browsers only allow showPicker during direct user activation.
    }
  }
}

/**
 * Handle delete transaction button click
 * @param {Event} event - Click event
 */
async function handleDeleteClick(event) {
  const button = event.target.closest('.delete-transaction-btn');
  if (!button) return;

  const transactionId = button.dataset.id;
  if (!transactionId) {
    console.error('Transaction ID not found');
    return;
  }

  const confirmed = await confirmAction('Delete this transaction? This action cannot be undone.');
  if (!confirmed) return;

  try {
    button.disabled = true;
    await deleteTransaction(transactionId);
  } catch (error) {
    handleError('Could not delete transaction', error);
  } finally {
    button.disabled = false;
  }
}

/**
 * Handle edit transaction button click.
 * @param {Event} event - Click event
 */
function handleEditClick(event) {
  const button = event.target.closest('.edit-transaction-btn');
  if (!button) return;
  editTransaction(button.dataset.id);
}

/**
 * Read filter controls into app state.
 */
function syncFiltersFromUI() {
  appState.filters = {
    search: document.getElementById('filter-search')?.value || '',
    type: document.getElementById('filter-type')?.value || 'all',
    category: document.getElementById('filter-category')?.value || 'all',
    minAmount: document.getElementById('filter-min')?.value || '',
    maxAmount: document.getElementById('filter-max')?.value || '',
    fromDate: document.getElementById('filter-from-date')?.value || '',
    toDate: document.getElementById('filter-to-date')?.value || ''
  };
  refreshDashboard();
}

/**
 * Clear all transaction filters.
 */
function clearFilters() {
  const defaults = {
    'filter-search': '',
    'filter-type': 'all',
    'filter-category': 'all',
    'filter-min': '',
    'filter-max': '',
    'filter-from-date': '',
    'filter-to-date': ''
  };

  Object.entries(defaults).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });

  const filterType = document.getElementById('filter-type');
  if (filterType) {
    filterType.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    syncFiltersFromUI();
  }
}

/**
 * Export filtered selected-month transactions to CSV.
 */
function exportCsv() {
  const monthTransactions = applyTransactionFilters(
    getTransactionsForMonth(appState.transactions, appState.summaryMonth),
    appState.filters
  );

  if (monthTransactions.length === 0) {
    showNotification('No transactions to export for the selected filters', 'error');
    return;
  }

  const header = ['Date', 'Description', 'Type', 'Category', 'Amount'];
  const rows = monthTransactions.map(transaction => {
    const date = toLocalDate(transaction.createdAt);
    return [
      date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '',
      transaction.description || '',
      transaction.type || '',
      transaction.category || '',
      transaction.amount || 0
    ];
  });
  const csv = [header, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `finance-transactions-${formatYearMonth(appState.summaryMonth)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showNotification(`Exported ${monthTransactions.length} transaction(s)`, 'success');
}

/**
 * Add a recurring transaction template.
 * @param {Event} event - Form event
 */
async function handleRecurringSubmit(event) {
  event.preventDefault();

  const description = document.getElementById('recurring-description')?.value.trim();
  const amount = Number(document.getElementById('recurring-amount')?.value);
  const type = document.getElementById('recurring-type')?.value;
  const category = type === 'expense' ? document.getElementById('recurring-category')?.value.trim() : '';
  const dayOfMonth = Number(document.getElementById('recurring-day')?.value);

  if (!description || !type || Number.isNaN(amount) || amount <= 0 || Number.isNaN(dayOfMonth)) {
    showNotification('Please complete the recurring transaction form', 'error');
    return;
  }

  if (type === 'expense' && !category) {
    showNotification('Please select a category for recurring expenses', 'error');
    return;
  }

  try {
    const recurringRef = collection(db, 'users', appState.currentUser.uid, 'recurringTransactions');
    await addDoc(recurringRef, {
      description,
      amount,
      type,
      category,
      categoryId: type === 'expense' ? getCategoryRecordByName(category)?.id || '' : '',
      dayOfMonth: Math.min(Math.max(dayOfMonth, 1), 31),
      createdAt: new Date()
    });
    event.target.reset();
    toggleRecurringCategoryField();
    showNotification('Recurring transaction added', 'success');
  } catch (error) {
    handleError('Failed to add recurring transaction', error);
  }
}

/**
 * Render recurring templates in the panel.
 */
function renderRecurringList() {
  const list = document.getElementById('recurring-ul');
  if (!list) return;
  list.innerHTML = '';

  if (appState.recurringTransactions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'muted-list-item';
    empty.textContent = 'No recurring transactions yet';
    list.appendChild(empty);
    return;
  }

  appState.recurringTransactions.forEach(item => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${item.description} · ${item.type} · ${formatCurrency(Number(item.amount || 0))} · day ${item.dayOfMonth}`;
    const button = document.createElement('button');
    button.className = 'delete-recurring galaxy-delete-btn';
    button.dataset.id = item.id;
    button.type = 'button';
    button.innerHTML = '<span class="delete-lid" aria-hidden="true"></span><span class="delete-can" aria-hidden="true"></span>';
    button.setAttribute('aria-label', `Delete ${item.description} recurring transaction`);
    li.append(label, button);
    list.appendChild(li);
  });
}

/**
 * Delete a recurring template.
 * @param {string} recurringId - Template ID
 */
async function deleteRecurring(recurringId) {
  if (!await confirmAction('Delete this recurring transaction template?')) return;

  try {
    const recurringRef = doc(db, 'users', appState.currentUser.uid, 'recurringTransactions', recurringId);
    await deleteDoc(recurringRef);
    showNotification('Recurring transaction deleted', 'success');
  } catch (error) {
    handleError('Failed to delete recurring transaction', error);
  }
}

/**
 * Create selected-month transactions from recurring templates.
 */
async function applyRecurringForMonth() {
  if (appState.recurringTransactions.length === 0) {
    showNotification('No recurring transactions to apply', 'error');
    return;
  }

  const periodKey = formatYearMonth(appState.summaryMonth);
  const transactionsRef = collection(db, 'users', appState.currentUser.uid, 'transactions');
  let createdCount = 0;

  try {
    for (const recurring of appState.recurringTransactions) {
      const alreadyExists = appState.transactions.some(transaction =>
        transaction.recurringId === recurring.id && transaction.recurringPeriod === periodKey
      );
      if (alreadyExists) continue;

      const daysInMonth = new Date(
        appState.summaryMonth.getFullYear(),
        appState.summaryMonth.getMonth() + 1,
        0
      ).getDate();
      const transactionDate = new Date(
        appState.summaryMonth.getFullYear(),
        appState.summaryMonth.getMonth(),
        Math.min(recurring.dayOfMonth || 1, daysInMonth)
      );
      transactionDate.setHours(12, 0, 0, 0);

      await addDoc(transactionsRef, {
        description: recurring.description,
        type: recurring.type,
        category: recurring.type === 'expense' ? recurring.category : '',
        categoryId: recurring.type === 'expense' ? recurring.categoryId || getCategoryRecordByName(recurring.category)?.id || '' : '',
        amount: Number(recurring.amount || 0),
        createdAt: transactionDate,
        recurringId: recurring.id,
        recurringPeriod: periodKey
      });
      createdCount += 1;
    }

    showNotification(
      createdCount > 0 ? `Applied ${createdCount} recurring transaction(s)` : 'Recurring transactions already exist for this month',
      'success'
    );
  } catch (error) {
    handleError('Failed to apply recurring transactions', error);
  }
}

/**
 * Toggle recurring category field based on type.
 */
function toggleRecurringCategoryField() {
  const type = document.getElementById('recurring-type')?.value;
  const group = document.getElementById('recurring-category-group');
  const select = document.getElementById('recurring-category');
  if (!group || !select) return;

  if (type === 'expense') {
    group.style.display = 'block';
    select.required = true;
  } else {
    group.style.display = 'none';
    select.required = false;
    select.value = '';
  }
}

function setupSelectSwitch(selectId, switchId) {
  const select = document.getElementById(selectId);
  const switchEl = document.getElementById(switchId);
  if (!select || !switchEl) return;

  const choices = [...switchEl.querySelectorAll('[data-value]')];
  const syncSwitch = () => {
    const value = select.value || choices[0]?.dataset.value || '';
    switchEl.dataset.value = value;
    choices.forEach(choice => {
      const isActive = choice.dataset.value === value;
      choice.classList.toggle('is-active', isActive);
      choice.setAttribute('aria-checked', String(isActive));
    });
  };

  choices.forEach(choice => {
    choice.addEventListener('click', () => {
      if (select.value === choice.dataset.value) return;
      select.value = choice.dataset.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncSwitch();
    });
    choice.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = choices.findIndex(item => item.dataset.value === select.value);
      const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      const nextChoice = choices[(currentIndex + direction + choices.length) % choices.length];
      nextChoice?.click();
      nextChoice?.focus();
    });
  });

  select.addEventListener('change', syncSwitch);
  select.form?.addEventListener('reset', () => {
    window.requestAnimationFrame(syncSwitch);
  });
  syncSwitch();
}

/**
 * Display error notification to user
 * @param {string} message - Error message
 * @param {Error} error - Error object
 */
function handleError(message, error) {
  console.error(message, error);
  const userMessage = error?.message || 'An unexpected error occurred';
  showNotification(`${message}: ${userMessage}`, 'error');
}

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
function showNotification(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) {
    console[type === 'error' ? 'error' : 'log'](message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = type === 'success' ? 'OK' : type === 'error' ? '!' : 'i';
  const text = document.createElement('span');
  text.className = 'toast-message';
  text.textContent = message;
  toast.append(icon, text);
  container.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('is-hiding');
    window.setTimeout(() => toast.remove(), 220);
  }, 3200);
}

/**
 * Show an in-app confirmation dialog.
 * @param {string} message - Confirmation text
 * @returns {Promise<boolean>} - User decision
 */
function confirmAction(message) {
  const modal = document.getElementById('confirm-modal');
  const messageEl = document.getElementById('confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  if (!modal || !messageEl || !okBtn || !cancelBtn) {
    return Promise.resolve(window.confirm(message));
  }

  messageEl.textContent = message;
  modal.hidden = false;
  okBtn.focus();

  return new Promise(resolve => {
    const cleanup = (result) => {
      modal.hidden = true;
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      modal.removeEventListener('click', handleOverlay);
      document.removeEventListener('keydown', handleKeydown);
      resolve(result);
    };
    const handleOk = () => cleanup(true);
    const handleCancel = () => cleanup(false);
    const handleOverlay = (event) => {
      if (event.target === modal) cleanup(false);
    };
    const handleKeydown = (event) => {
      if (event.key === 'Escape') cleanup(false);
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleOverlay);
    document.addEventListener('keydown', handleKeydown);
  });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Form submission
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', handleTransactionSubmit);
  }

  // Logout button
  [document.getElementById('logout-button'), document.getElementById('mobile-logout-button')]
    .filter(Boolean)
    .forEach(button => button.addEventListener('click', logout));

  // Month navigation
  const prevBtn = document.getElementById('summary-prev-month');
  if (prevBtn) {
    prevBtn.addEventListener('click', goToPreviousMonth);
  }

  const nextBtn = document.getElementById('summary-next-month');
  if (nextBtn) {
    nextBtn.addEventListener('click', goToNextMonth);
  }

  // Month picker
  const monthPicker = document.getElementById('summary-month-picker');
  if (monthPicker) {
    monthPicker.addEventListener('change', handleMonthPickerChange);
    monthPicker.addEventListener('click', (event) => {
      event.stopPropagation();
      openNativePicker(monthPicker);
    });
  }

  const summaryControls = document.querySelector('.summary-controls');
  if (summaryControls && monthPicker) {
    summaryControls.addEventListener('click', (event) => {
      if (event.target.closest('.summary-nav')) return;
      openNativePicker(monthPicker);
    });
  }

  // Transaction table delete buttons
  const transactionTable = document.getElementById('date-transaction-table');
  if (transactionTable) {
    transactionTable.addEventListener('click', handleDeleteClick);
    transactionTable.addEventListener('click', handleEditClick);
  }

  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', resetTransactionForm);
  }

  // Category management
  const addCategoryBtn = document.getElementById('add-category-btn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', addCategory);
  }

  const saveBudgetsBtn = document.getElementById('save-budgets-btn');
  if (saveBudgetsBtn) {
    saveBudgetsBtn.addEventListener('click', saveBudgets);
  }

  const categoriesUl = document.getElementById('categories-ul');
  if (categoriesUl) {
    categoriesUl.addEventListener('click', (event) => {
      const button = event.target.closest('.delete-category');
      if (button) {
        const index = parseInt(button.dataset.index);
        deleteCategory(index);
      }
    });
  }

  // Transaction type change
  const transactionTypeRadios = document.querySelectorAll('input[name="transaction-type"]');
  transactionTypeRadios.forEach(radio => {
    radio.addEventListener('change', toggleCategoryField);
  });

  ['filter-search', 'filter-type', 'filter-category', 'filter-min', 'filter-max', 'filter-from-date', 'filter-to-date'].forEach(id => {
    const control = document.getElementById(id);
    if (control) {
      control.addEventListener(id === 'filter-search' ? 'input' : 'change', syncFiltersFromUI);
    }
  });

  setupSelectSwitch('filter-type', 'filter-type-switch');
  document.getElementById('clear-filters-btn')?.addEventListener('click', clearFilters);
  document.getElementById('export-csv-btn')?.addEventListener('click', exportCsv);

  setupSelectSwitch('recurring-type', 'recurring-type-switch');

  const recurringForm = document.getElementById('recurring-form');
  if (recurringForm) {
    recurringForm.addEventListener('submit', handleRecurringSubmit);
  }
  document.getElementById('recurring-type')?.addEventListener('change', toggleRecurringCategoryField);
  document.getElementById('apply-recurring-btn')?.addEventListener('click', applyRecurringForMonth);
  document.getElementById('recurring-ul')?.addEventListener('click', (event) => {
    const button = event.target.closest('.delete-recurring');
    if (button) deleteRecurring(button.dataset.id);
  });

  setupRouting();
}

/**
 * Initialize client-side page routing.
 */
function setupRouting() {
  document.querySelectorAll('[data-route]').forEach(link => {
    link.addEventListener('click', (event) => {
      const route = link.dataset.route;
      if (!route || !routeConfig[route]) return;

      event.preventDefault();
      if (route === 'add' && appState.editingTransactionId) {
        resetTransactionForm();
      }
      if (route === appState.activeRoute) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setRoute(route);
    });
  });

  window.addEventListener('hashchange', () => {
    setRoute(getRouteFromHash(), { updateHash: false, focusMain: false });
  });
  window.addEventListener('popstate', () => {
    setRoute(getRouteFromHash(), { updateHash: false, focusMain: false });
  });

  setRoute(getRouteFromHash(), {
    updateHash: !window.location.hash,
    replace: true,
    focusMain: false,
    skipTransition: true
  });
}

function getRouteFromHash() {
  const route = window.location.hash.replace(/^#\/?/, '');
  const legacyRouteMap = {
    'summary-title': 'overview',
    'form-title': 'add',
    'calendar-title': 'transactions',
    'categories-panel': 'categories',
    'recurring-panel': 'recurring'
  };

  return routeConfig[route] ? route : legacyRouteMap[route] || 'overview';
}

function setRoute(route, options = {}) {
  const nextRoute = routeConfig[route] ? route : 'overview';
  const {
    updateHash = true,
    replace = false,
    focusMain = true,
    skipTransition = false
  } = options;

  if (updateHash) {
    const nextUrl = `${window.location.pathname}${window.location.search}#/${nextRoute}`;
    if (replace) {
      window.history.replaceState(null, '', nextUrl);
    } else {
      window.history.pushState(null, '', nextUrl);
    }
  }

  const applyRoute = () => {
    document.querySelectorAll('.app-page').forEach(page => {
      const isActive = page.dataset.page === nextRoute;
      page.hidden = !isActive;
      page.classList.toggle('is-active', isActive);
      page.setAttribute('aria-hidden', String(!isActive));
    });

    appState.activeRoute = nextRoute;
    syncNavigationState(nextRoute);
    updateRouteChrome(nextRoute);
    window.requestAnimationFrame(refreshDashboard);

    if (focusMain) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('app-main')?.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('app-main')?.focus({ preventScroll: true });
    }
  };

  if (!skipTransition && document.startViewTransition) {
    document.startViewTransition(applyRoute);
  } else {
    applyRoute();
  }
}

function syncNavigationState(activeRoute) {
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
    const isActive = item.dataset.route === activeRoute;
    item.classList.toggle('is-active', isActive);
    if (isActive) {
      item.setAttribute('aria-current', 'page');
    } else {
      item.removeAttribute('aria-current');
    }
  });
}

function updateRouteChrome(route = appState.activeRoute) {
  const config = routeConfig[route] || routeConfig.overview;
  const mobileMonthLabel = document.getElementById('mobile-month-label');
  if (mobileMonthLabel) {
    mobileMonthLabel.textContent = config.mobileLabel();
  }
  document.title = `${config.title} - Finance Tracker`;
}

/**
 * Initialize the application
 */
function initialize() {
  try {
    setupEventListeners();
    setDefaultDate();
    setSummaryMonthPickerValue(appState.summaryMonth);
    toggleRecurringCategoryField();
    updateSummaryMonthDisplay();
    initApp();
  } catch (error) {
    handleError('Failed to initialize application', error);
  }
}

// Start the application
initialize();
