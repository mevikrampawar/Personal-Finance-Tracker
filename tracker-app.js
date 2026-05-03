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
 * Handle transaction form submission
 * @param {Event} event - Form submission event
 */
async function handleTransactionSubmit(event) {
  event.preventDefault();

  const descriptionEl = document.getElementById('description');
  const typeEl = document.querySelector('input[name="transaction-type"]:checked');
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

  // Validation
  if (!description) {
    showNotification('Please enter a description', 'error');
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
      amount,
      createdAt: transactionDate
    });

    // Reset form and date
    const form = document.getElementById('transaction-form');
    if (form) {
      form.reset();
      setDefaultDate();
    }

    showNotification('Transaction added successfully', 'success');
  } catch (error) {
    handleError('Failed to add transaction', error);
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
