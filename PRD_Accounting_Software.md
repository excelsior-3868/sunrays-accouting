# Product Requirements Document (PRD): Sunrays Preschool Accounting Software

## 1. Executive Summary
**Project Name:** Sunrays Preschool Accounting Software  
**Status:** Draft  
**Version:** 1.1  
**Context:**  
The Sunrays Preschool Accounting Software is a comprehensive financial management system integrated into the "Sunrays Admin" ecosystem. It goes beyond simple bookkeeping to offer full-fledged accounting capabilities, including Fiscal Year management, General Ledger (GL) tracking, and a dedicated Payroll system for teachers and staff. It serves as the financial backbone of the preschool, ensuring data integrity, traceability, and ease of use.

## 2. Goals & Objectives
*   **Professional Accounting Standards:** Implement structured financial tracking using General Ledger (GL) Heads and Fiscal Years.
*   **Automated Fee Management:** Streamline student billing, invoicing, and collections.
*   **Integrated Payroll:** Manage teacher and staff salaries, including generation, payout, and payslips, directly linked to staff records.
*   **Financial Visibility:** Provide real-time insights into cash flow, outstanding dues, and operational costs.
*   **Audit & Control:** Ensure all transactions are tagged to specific fiscal periods and ledger heads for accurate reporting (Balance Sheet / P&L readiness).

## 3. Target Audience
*   **School Administrators/Owners:** For financial health monitoring and payroll approval.
*   **Accountants:** For day-to-day entries (fees, expenses, journals), GL management, and end-of-year closing.
*   **Teachers/Staff:** To receive payslips (view-only).

## 4. Key Features & Functional Requirements

### 4.1. Core Settings & Configuration (Foundation)
*   **Fiscal Year Management:**
    *   **Define Fiscal Years:** Create multiple fiscal years (e.g., "2080-2081", "2081-2082" or "2024-2025").
    *   **Active Year:** Set a global "Current Fiscal Year". All transactions (Invoices, Payments, Expenses, Payroll) are automatically tagged with the active fiscal year ID.
    *   **Locking:** Ability to "Close" a fiscal year to prevent further edits.
*   **General Ledger (GL) Heads / Chart of Accounts:**
    *   **Master Management:** Create and manage GL Heads to classify all financial transactions.
    *   **Types:** Classify Heads into:
        *   **Income** (e.g., Admission Fees, Monthly Tuition, Transport Fees).
        *   **Expense** (e.g., Office Supplies, Maintenance, Utility Bills).
        *   **Assets** (e.g., Furniture, Computers).
        *   **Liabilities** (e.g., Taxes Payable).
    *   **Hierarchy:** Support for Parent Heads and Sub-Heads (e.g., Parent: "Staff Cost", Sub: "Teacher Salary", "Helper Salary").

### 4.2. Fee Management (Income)
*   Integrates with **Income GL Heads**.
*   **Fee Mapping:** Map specific Fee Structures (e.g., "Nursery Tuition") to specific Income GL Heads (e.g., "Tuition Fees").
*   **Student Invoicing:**
    *   Generate monthly/term-wise invoices.
    *   Support for "Opening Balance" for students carrying forward dues from previous fiscal years.
*   **Collections:**
    *   Accept payments against invoices.
    *   Auto-journal entry generation (Debit: Cash/Bank, Credit: Student/Income Head).

### 4.3. Expense Management (Outflow)
*   Integrates with **Expense GL Heads**.
*   **Expense Recording:**
    *   Select appropriate Expense GL Head (e.g., "Electricity Bill").
    *   Record Payment Mode (Cash/Bank) - impacts the respective Asset GL.
    *   Upload supporting documents (bills).
*   **Petty Cash:** Simple management of daily small expenses tailored for school admin needs.

### 4.4. Payroll Management (Teacher & Staff Salary)
*   **Staff Integration:** Fetch active employees from the Sunrays Staff module.
*   **Salary Structure:** Define Base Salary, Allowances, and Deductions (Tax, PF) for each employee.
*   **Monthly Processing:**
    *   **Generate Payroll:** Create a payroll batch for a specific month (e.g., "Baishakh 2081").
    *   **Adjustments:** Allow manual one-time adjustments (Bonuses / Unpaid Leave deductions) before finalizing.
*   **Salary Payment:**
    *   Record payout date and mode (Bank Transfer/Cash).
    *   Impacts "Staff Salary" Expense GL Head.
*   **Payslips:** Generate and print PDF payslips for staff.

### 4.5. Financial Dashboard
*   **Fiscal Year Context:** Dashboard shows data strictly for the selected Fiscal Year.
*   **Widgets:**
    *   Collection vs. Expenses (Month-wise trend).
    *   Pending Dues (Total receivables).
    *   Cash in Hand / Bank Balance (Derived from Asset GLs).
*   **Recent Activity:** Ledger view of latest 10 transactions.

### 4.6. Reports
*   **Day Book:** Daily record of all financial transactions (Fees + Expenses).
*   **Ledger Report:** View detailed transactions for any specific GL Head or Student.
*   **Trial Balance:** Summary of closing balances of all GL Heads (Essential for accounting accuracy).
*   **Defaulters List:** Students with unpaid balances.
*   **Salary Sheet:** Monthly summary of total salaries paid.

## 5. Technical Architecture

### 5.1. Tech Stack
*   **Frontend:** React (Vite), Tailwind CSS v4, Shadcn UI.
*   **Backend:** Supabase (PostgreSQL), Edge Functions (for payroll processing if needed).
*   **State:** React Query.

### 5.2. Database Schema Refinment (Key Entities)

#### 1. Configuration
*   `fiscal_years` (`id`, `name`, `start_date`, `end_date`, `is_active`, `is_closed`)
*   `gl_heads` (`id`, `name`, `type` [Income/Expense/Asset/Liability], `code`, `parent_id`)

#### 2. Income (Fees)
*   `fee_structures` (`id`, `name`, `amount`, `fiscal_year_id`)
*   `fee_structure_items` (`id`, `structure_id`, `gl_head_id`, `amount`) -> *Links fee components to GL Heads*
*   `invoices` (`id`, `student_id`, `fiscal_year_id`, `total_amount`, `due_date`, `status`)
*   `invoice_items` (`id`, `invoice_id`, `gl_head_id`, `amount`)
*   `payments` (`id`, `invoice_id`, `amount`, `date`, `fiscal_year_id`, `payment_mode_gl_id` [Cash/Bank GL])

#### 3. Expenditures & Payroll
*   `expenses` (`id`, `gl_head_id`, `amount`, `date`, `fiscal_year_id`, `description`, `attachment_url`)
*   `salary_structures` (`id`, `staff_id`, `basic_salary`, `allowances`, `deductions`)
*   `payrolls` (`id`, `month`, `year`, `fiscal_year_id`, `status` [Draft/Paid])
*   `payroll_items` (`id`, `payroll_id`, `staff_id`, `total_payable`, `paid_date`, `status`)

## 6. Implementation Roadmap

### Phase 1: Foundation
*   Setup Database Schema (Fiscal Years, GL Heads).
*   Build "Settings" page for configuring Fiscal Years and Chart of Accounts.

### Phase 2: Income & Fees
*   Fee Structure creation mapped to Income GLs.
*   Invoice Generation & Payment Collection logic.

### Phase 3: Expenses & Payroll
*   Expense entry system.
*   Teacher Salary Structure & Monthly Payroll generation flow.

### Phase 4: Reporting & Dashboard
*   Day Book, Ledger View, and Dashboards.
*   PDF generation for Receipts and Payslips.
