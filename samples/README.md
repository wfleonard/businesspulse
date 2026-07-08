# Sample accounting import files

Two ready-to-import CSVs for the **Accounting** page (a fictional small business,
Jan–Jun 2026, fully balanced double-entry).

Import **accounts first, then transactions** (transactions reference accounts by name).

## `chart-of-accounts.csv`
Columns: `code`, `name`, `type`, `subtype`.
- `name` + `type` are required; `code`/`subtype` optional.
- `type` is smart-matched, so labels from QuickBooks/Wave work as-is
  ("Bank", "Sales", "Cost of Goods Sold", "Payroll", "Credit Card",
  "Accounts Receivable/Payable", "Fixed Asset", "Equity"…).

## `transactions.csv`
Columns: `date`, `account`, `amount`, `description`, `party`.
- `date` + `account` required; then either `amount` **or** `debit`+`credit`.
- `amount` is in the account's **natural direction**: income `+earned`,
  expense `+spent`, asset `+inflow`/`-outflow`, liability `+increase`.
- Each economic event is two balanced rows (e.g. a sale credits Sales Revenue
  and debits Business Checking), so the P&L, Cash Movement, and Balance Sheet
  all reconcile.

## Expected results after import
- Total revenue **$155,000**, total expenses **$100,450**, **net profit $54,550**
- Balance sheet balances: assets **$107,550** = liabilities **$3,000** +
  equity **$50,000** + retained earnings **$54,550**
- The KPI bridge derives `net_profit`, `total_revenue`, `total_expenses`,
  `cash_balance`, and `payroll_expense` onto the dashboard.

Regenerate/tweak with `scratchpad/gen-samples.mjs` if you want different numbers.
