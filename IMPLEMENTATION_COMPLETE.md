# Feature Specification: Billing & Inventory Application
**Based on Vyapar App Functional Analysis**

This document outlines the complete feature set required to build a comprehensive GST Billing and Accounting application for small businesses (MSMEs).

---

## 1. Dashboard & Home
* **Business Overview:** Real-time display of Cash-in-Hand, Stock Value, Bank Balance, and critical financial health indicators.
* **Quick Actions:** Shortcut keys for fast navigation (e.g., `Alt+S` for Sale, `Ctrl+P` for Print).
* **Business Status:** Visual graphs/charts for Expenses, Sales, and Receivables.

## 2. Inventory Management (Stock)
### Item Master
- [ ] **Add/Edit Items:** Capture Item Name, HSN/SAC Code, Tax Rate, and Description.
- [ ] **Item Types:** Support for Products (Inventory) and Services.
- [ ] **Pricing:** Sales Price, Purchase Price, and Tax Inclusive/Exclusive toggles.
- [ ] **Unit Management:**
    - Base Units (e.g., pcs, kg).
    - Secondary Units with conversion formulas (e.g., 1 Box = 12 Pcs).
- [ ] **Barcode Integration:** Generate barcodes and scan for quick billing/inventory lookup.
- [ ] **Images:** Upload product images.

### Advanced Stock Features
- [ ] **Batch Tracking:** Manage items by Batch Number.
- [ ] **Expiry Management:** Track Manufacturing Date and Expiry Date; alerts for items expiring in 30 days.
- [ ] **Serial Number Tracking:** Track individual units by unique serial numbers.
- [ ] **Low Stock Alerts:** Notification when stock dips below the defined "Minimum Quantity."
- [ ] **Stock Adjustment:** Manual adjustments for lost/damaged goods.

## 3. Transaction Modules
### Sales (Accounts Receivable)
- [ ] **Sale Invoice:** Create GST/Non-GST invoices. Support for Cash and Credit sales.
- [ ] **Estimates/Quotations:** Create Proforma invoices; one-click conversion to Sale Invoice.
- [ ] **Payment-In:** Record payments received from customers (Cash/Cheque/UPI/Bank).
- [ ] **Sale Return (Credit Note):** Handle returned goods and adjust inventory/accounts automatically.
- [ ] **Delivery Challan:** Create challans for goods movement; convert to invoice later.
- [ ] **Sale Orders:** Manage open orders from customers.

### Purchase (Accounts Payable)
- [ ] **Purchase Bill:** Record vendor invoices and update stock.
- [ ] **Payment-Out:** Record payments made to vendors.
- [ ] **Purchase Order (PO):** Create LPOs for suppliers; convert to Purchase Bill upon delivery.
- [ ] **Purchase Return (Debit Note):** Return goods to vendors and adjust accounts.

### Expenses & Other Income
- [ ] **Expense Tracking:** Record direct/indirect expenses (Rent, Electricity, Salary).
- [ ] **Expense Categories:** Group expenses for reporting.
- [ ] **Other Income:** Record non-core income (e.g., Interest, Scrap sale).

## 4. Party Management (CRM/SRM)
- [ ] **Party Master:** Create Customers and Suppliers.
- [ ] **Import Parties:** Bulk import from Excel/Contacts.
- [ ] **Party Details:** GSTIN, Phone, Email, Billing Address, Shipping Address.
- [ ] **Receivables/Payables:** Track "To Pay" and "To Collect" balances.
- [ ] **Credit Limits:** Set credit limits for customers.
- [ ] **Party Groups:** Categorize parties (e.g., Retailers, Wholesalers) for analysis.

## 5. Banking & Cash
- [ ] **Bank Accounts:** Manage multiple bank accounts and wallets.
- [ ] **Cash-in-Hand:** Track daily cash flow.
- [ ] **Cheque Management:** Log received/issued cheques and track clearance status (Open/Closed).
- [ ] **Loan Management:** Track Loan Accounts, EMI schedules, and interest.
- [ ] **Bank-to-Cash / Cash-to-Bank:** Contra entries for deposits and withdrawals.

## 6. Comprehensive Reporting
### GST Reports (Government Formats)
- [ ] **GSTR-1:** Sales summary.
- [ ] **GSTR-2:** Purchase summary.
- [ ] **GSTR-3B:** Monthly summary of sales & purchases.
- [ ] **GSTR-9:** Annual return data.
- [ ] **JSON Export:** Generate files compatible with the GST portal.

### Financial Reports
- [ ] **Balance Sheet:** Assets, Liabilities, and Equity summary.
- [ ] **Profit & Loss:** Net Profit, Gross Profit calculations.
- [ ] **Cash Flow Statement:** Inflow/Outflow tracking.
- [ ] **Day Book:** Daily transaction log.

### Item & Stock Reports
- [ ] **Stock Summary:** Quantity and Value of current stock.
- [ ] **Item-wise Profit/Loss:** Profitability analysis per product.
- [ ] **Low Stock Report:** List of items needing replenishment.
- [ ] **Stock Detail:** Opening, Inward, Outward, and Closing quantities.

### Business & Party Reports
- [ ] **Party Statement:** Ledger for specific customers/suppliers.
- [ ] **Outstanding Report:** Aging analysis of dues (Receivable/Payable).
- [ ] **Tax Report:** Input Tax Credit (ITC) vs Tax Collected.
- [ ] **Discount Report:** Total discounts given/received.

## 7. Settings & Configuration
### General
- [ ] **Company Profile:** Logo, Signature, Address.
- [ ] **Multi-Firm:** Support multiple businesses in one app.
- [ ] **Security:** App Lock (Passcode/Fingerprint).
- [ ] **Backup:** Auto-backup to Google Drive; Local backup; Restore functionality.

### Invoice Customization
- [ ] **Themes:** Support for multiple templates (Classic, Modern, Thermal).
- [ ] **Printer Settings:** Support for Thermal (2/3/4 inch) and Standard (A4/A5) printers.
- [ ] **Header/Footer:** Custom terms & conditions, notes.

### Transaction Settings
- [ ] **Prefixes:** Custom invoice numbering (e.g., INV-001, 23-24/001).
- [ ] **Terms:** Due dates and payment terms.
- [ ] **Tax Settings:** Inclusive/Exclusive tax logic, HSN columns, Cess, Reverse Charge Mechanism (RCM).
- [ ] **Additional Fields:** Transport details, E-Way Bill Number, PO Date/Number.

### User Management
- [ ] **Roles:** Admin, Salesperson, Secondary Admin.
- [ ] **Permissions:** Restrict access (e.g., Salesperson cannot edit/delete past invoices).

## 8. Utilities & Extra Features
- [ ] **My Online Store:** Generate a web link for a product catalog; allow customers to place orders online.
- [ ] **Tally Export:** Export data to Tally XML format.
- [ ] **SMS/Communication:** Send Transaction SMS, Payment Reminders, and WhatsApp integration.
- [ ] **Recycle Bin:** Restore deleted transactions.
- [ ] **Offline Mode:** Full functionality without internet; sync when online.
- [ ] **Referral System:** "Refer & Earn" logic (optional).
