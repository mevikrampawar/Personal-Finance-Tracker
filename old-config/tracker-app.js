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

let currentUser = null;
let transactions = [];
let unsubscribe = null;
let selectedDate = new Date();
let displayMonth = new Date();
let summaryMonth = new Date();

function updateSummaryMonthDisplay() {
  const year = summaryMonth.getFullYear();
  const month = summaryMonth.getMonth();
  document.getElementById('summary-month-year').textContent = `${monthNames[month]} ${year}`;
  setSummaryMonthPickerValue(summaryMonth);
  displayMonth = new Date(summaryMonth);
  renderCalendar(transactions, displayMonth, selectedDate, selectDate);
  updateMonthTransactionsList(transactions, summaryMonth);
  updateTotals(transactions, summaryMonth);
}

function selectDate(date) {
  selectedDate = new Date(date);
  renderCalendar(transactions, displayMonth, selectedDate, selectDate);
  updateDateDetailsView(transactions, selectedDate);
}

function initApp() {
  initTheme();

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    currentUser = user;
    document.getElementById('username-display').textContent = user.displayName || user.email;
    loadTransactions();
  });
}

function loadTransactions() {
  const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
  const q = query(transactionsRef, orderBy('createdAt', 'desc'));

  if (unsubscribe) {
    unsubscribe();
  }

  unsubscribe = onSnapshot(q, (snapshot) => {
    transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCalendar(transactions, displayMonth, selectedDate, selectDate);
    updateMonthTransactionsList(transactions, summaryMonth);
    updateTotals(transactions, summaryMonth);
  }, (error) => {
    alert('Unable to load transactions: ' + error.message);
  });
}

async function handleTransactionSubmit(event) {
  event.preventDefault();

  const description = document.getElementById('description').value.trim();
  const type = document.querySelector('input[name="transaction-type"]:checked').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const dateStr = document.getElementById('transaction-date').value;

  if (!description || amount <= 0 || !dateStr) {
    alert('Please fill in all fields with valid values');
    return;
  }

  const [year, month, day] = dateStr.split('-');
  const transactionDate = new Date(year, month - 1, day);
  transactionDate.setHours(12, 0, 0, 0);

  const transactionsRef = collection(db, 'users', currentUser.uid, 'transactions');
  await addDoc(transactionsRef, {
    description,
    type,
    amount,
    createdAt: transactionDate
  });

  document.getElementById('transaction-form').reset();
  setDefaultDate();
}

async function deleteTransaction(transactionId) {
  if (!currentUser) return;
  const transactionRef = doc(db, 'users', currentUser.uid, 'transactions', transactionId);
  await deleteDoc(transactionRef);
}

async function logout() {
  const confirmLogout = confirm('Are you sure you want to logout?');
  if (!confirmLogout) return;

  try {
    await signOut(auth);
    window.location.href = 'login.html';
  } catch (error) {
    alert('Logout failed: ' + error.message);
  }
}

document.getElementById('transaction-form').addEventListener('submit', handleTransactionSubmit);
document.getElementById('logout-button').addEventListener('click', logout);
document.getElementById('summary-prev-month').addEventListener('click', () => {
  summaryMonth = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth() - 1, 1);
  updateSummaryMonthDisplay();
});
document.getElementById('summary-next-month').addEventListener('click', () => {
  summaryMonth = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth() + 1, 1);
  updateSummaryMonthDisplay();
});

const summaryPicker = document.getElementById('summary-month-picker');
if (summaryPicker) {
  summaryPicker.addEventListener('change', (event) => {
    summaryMonth = parseYearMonth(event.target.value);
    updateSummaryMonthDisplay();
  });
}

const transactionTableBody = document.getElementById('date-transaction-table');
if (transactionTableBody) {
  transactionTableBody.addEventListener('click', async (event) => {
    const button = event.target.closest('.delete-transaction-btn');
    if (!button) return;

    const transactionId = button.dataset.id;
    if (!transactionId) return;

    const confirmed = confirm('Delete this transaction? This cannot be undone.');
    if (!confirmed) return;

    try {
      button.disabled = true;
      await deleteTransaction(transactionId);
    } catch (error) {
      alert('Could not delete transaction: ' + error.message);
    } finally {
      button.disabled = false;
    }
  });
}

setDefaultDate();
setSummaryMonthPickerValue(summaryMonth);
updateSummaryMonthDisplay();
initApp();
