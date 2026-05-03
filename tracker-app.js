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
  monthNames
} from './tracker-ui.js';

// Application state - consolidated for easier management
const appState = {
  currentUser: null,
  transactions: [],
  categories: [],
  unsubscribe: null,
  selectedDate: new Date(),
  displayMonth: new Date(),
  summaryMonth: new Date()
};

/**
 * Update summary month display and refresh all related views
 */
function updateSummaryMonthDisplay() {
  const { summaryMonth } = appState;
  const year = summaryMonth.getFullYear();
  const month = summaryMonth.getMonth();

  const monthDisplay = document.getElementById('summary-month-year');
  if (monthDisplay) {
    monthDisplay.textContent = `${monthNames[month]} ${year}`;
  }

  setSummaryMonthPickerValue(summaryMonth);
  appState.displayMonth = new Date(summaryMonth);

  renderCalendar(
    appState.transactions,
    appState.displayMonth,
    appState.selectedDate,
    selectDate
  );
  updateMonthTransactionsList(appState.transactions, appState.summaryMonth);
  updateTotals(appState.transactions, appState.summaryMonth);
}

/**
 * Select a date and update the date details view
 * @param {Date} date - Selected date
 */
function selectDate(date) {
  appState.selectedDate = new Date(date);
  renderCalendar(
    appState.transactions,
    appState.displayMonth,
    appState.selectedDate,
    selectDate
  );
  updateDateDetailsView(appState.transactions, appState.selectedDate);
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

    renderCalendar(
      appState.transactions,
      appState.displayMonth,
      appState.selectedDate,
      selectDate
    );
    updateMonthTransactionsList(appState.transactions, appState.summaryMonth);
    updateTotals(appState.transactions, appState.summaryMonth);
  }, (error) => {
    handleError('Unable to load transactions', error);
  });
}

/**
 * Load expense categories from Firestore
 */
async function loadCategories() {
  if (!appState.currentUser) {
    console.error('User not authenticated');
    return;
  }

  try {
    const categoriesRef = doc(db, 'users', appState.currentUser.uid);
    const categoriesDoc = await getDoc(categoriesRef);
    
    if (categoriesDoc.exists()) {
      appState.categories = categoriesDoc.data().expenseCategories || [];
    } else {
      // Default categories
      appState.categories = ['Personal', 'Education', 'Grocery'];
      await setDoc(categoriesRef, { expenseCategories: appState.categories });
    }
    
    updateCategoryDropdown();
    renderCategoriesList();
  } catch (error) {
    handleError('Unable to load categories', error);
  }
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

    const transactionsRef = collection(db, 'users', appState.currentUser.uid, 'transactions');
    await addDoc(transactionsRef, {
      description,
      type,
      category,
      amount,
      createdAt: transactionDate
    });

    // Reset form and date
    const form = document.getElementById('transaction-form');
    if (form) {
      form.reset();
      setDefaultDate();
      toggleCategoryField();
    }

    showNotification('Transaction added successfully', 'success');
  } catch (error) {
    handleError('Failed to add transaction', error);
  }
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
}

/**
 * Render the categories list
 */
function renderCategoriesList() {
  const categoriesUl = document.getElementById('categories-ul');
  if (!categoriesUl) return;

  categoriesUl.innerHTML = '';
  appState.categories.forEach((cat, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${cat}
      <button class="delete-category" data-index="${index}" aria-label="Delete ${cat} category">×</button>
    `;
    categoriesUl.appendChild(li);
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
    appState.categories.push(newCategory);
    await updateCategoriesInDB();
    updateCategoryDropdown();
    renderCategoriesList();
    newCategoryInput.value = '';
    showNotification('Category added successfully', 'success');
  } catch (error) {
    handleError('Failed to add category', error);
  }
}

/**
 * Delete a category
 */
async function deleteCategory(index) {
  if (index < 0 || index >= appState.categories.length) return;

  const categoryToDelete = appState.categories[index];
  if (confirm(`Are you sure you want to delete the "${categoryToDelete}" category?`)) {
    try {
      appState.categories.splice(index, 1);
      await updateCategoriesInDB();
      updateCategoryDropdown();
      renderCategoriesList();
      showNotification('Category deleted successfully', 'success');
    } catch (error) {
      handleError('Failed to delete category', error);
    }
  }
}

/**
 * Update categories in Firestore
 */
async function updateCategoriesInDB() {
  const categoriesRef = doc(db, 'users', appState.currentUser.uid);
  await setDoc(categoriesRef, { expenseCategories: appState.categories }, { merge: true });
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
 * Handle logout action
 */
async function logout() {
  const confirmLogout = confirm('Are you sure you want to logout?');
  if (!confirmLogout) return;

  try {
    // Clean up listener
    if (appState.unsubscribe) {
      appState.unsubscribe();
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

  const confirmed = confirm('Delete this transaction? This action cannot be undone.');
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
  // Use browser's built-in alert for now
  // In production, consider a toast notification library
  if (type === 'error') {
    console.error(message);
    alert(message);
  } else {
    console.log(message);
  }
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
  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

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
  }

  // Transaction table delete buttons
  const transactionTable = document.getElementById('date-transaction-table');
  if (transactionTable) {
    transactionTable.addEventListener('click', handleDeleteClick);
  }

  // Category management
  const addCategoryBtn = document.getElementById('add-category-btn');
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener('click', addCategory);
  }

  const categoriesUl = document.getElementById('categories-ul');
  if (categoriesUl) {
    categoriesUl.addEventListener('click', (event) => {
      if (event.target.classList.contains('delete-category')) {
        const index = parseInt(event.target.dataset.index);
        deleteCategory(index);
      }
    });
  }

  // Transaction type change
  const transactionTypeRadios = document.querySelectorAll('input[name="transaction-type"]');
  transactionTypeRadios.forEach(radio => {
    radio.addEventListener('change', toggleCategoryField);
  });
}

/**
 * Initialize the application
 */
function initialize() {
  try {
    setupEventListeners();
    setDefaultDate();
    setSummaryMonthPickerValue(appState.summaryMonth);
    updateSummaryMonthDisplay();
    initApp();
  } catch (error) {
    handleError('Failed to initialize application', error);
  }
}

// Start the application
initialize();
