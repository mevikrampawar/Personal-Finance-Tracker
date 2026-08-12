export const ROLE_OPTIONS = [
  { value: 'ignore', label: 'Ignore' },
  { value: 'date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'debit', label: 'Withdrawal / Debit' },
  { value: 'credit', label: 'Deposit / Credit' },
  { value: 'balance', label: 'Balance' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type (Dr / Cr text)' },
]

export function normalizeHeader(header) {
  return String(header).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function autoDetectRole(header) {
  const h = normalizeHeader(header)
  if (!h) return 'ignore'
  if (/(date|posted|transdt|txndate|txn date|transaction date|value date|valuedt|posting date|book date|entry date|transdate)/.test(h)) return 'date'
  if (h === 'dr' || h === 'debit' || h === 'withdrawal' || h === 'withdrawals') return 'debit'
  if (h === 'cr' || h === 'credit' || h === 'deposit' || h === 'deposits') return 'credit'
  if (/(withdrawalamt|withdrawalamount|debitamount|debitamt|dr amount|moneyout|money out|paidout|paid out|withdrawal|withdrawals|payment|debit)/.test(h)) return 'debit'
  if (/(depositamount|depositamt|creditamount|creditamt|cr amount|moneyin|money in|paidin|paid in|deposit|deposits|credit|receipt)/.test(h)) return 'credit'
  if (/(closingbalance|closing balance|runningbalance|running balance|balanceamount|balance amount|currentbalance|current balance|balance|bal\b)/.test(h)) return 'balance'
  if (/(amount|amt\b)/.test(h)) return 'amount'
  if (/(categor)/.test(h)) return 'category'
  if (/(narrat|particular|particulars|description|detail|memo|remark|remarks|reference|referenceno|refno|ref no|payee|merchant|beneficiary|transaction|cheque|chequeno|chequenumber|instrument|narration|upi)/.test(h)) return 'description'
  if (/(typedescription|transaction type|txn type|dr\/cr|debit\/credit|type|kind)/.test(h)) return 'type'
  return 'ignore'
}
