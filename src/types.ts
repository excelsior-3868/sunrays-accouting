export type FiscalYear = {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_closed: boolean;
    created_at?: string;
    updated_at?: string;
};

export type GLHeadType = 'Income' | 'Expense' | 'Asset' | 'Liability';

export type GLHead = {
    id: string;
    name: string;
    type: GLHeadType;
    code?: string;
    parent_id?: string | null;
    description?: string;
    created_at?: string;
    updated_at?: string;
    children?: GLHead[]; // For tree view
};

/* Phase 2: Income & Fees */

export type FeeStructure = {
    id: string;
    name: string;
    fiscal_year_id: string;
    class_name?: string;
    amount: number;
    created_at?: string;
    items?: FeeStructureItem[];
};

export type FeeStructureItem = {
    id: string;
    structure_id: string;
    gl_head_id: string;
    amount: number;
    created_at?: string;
    gl_head?: GLHead;
};

export type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Overdue';

export type Invoice = {
    id: string;
    student_id: string;
    student_name?: string;
    fiscal_year_id: string;
    invoice_number: string;
    total_amount: number;
    due_date: string;
    status: InvoiceStatus; // Unpaid, Partial, Paid, Overdue
    month?: string; // e.g. "Baisakh"
    previous_dues?: number;
    previous_dues_months?: string;
    created_at?: string;
    items?: InvoiceItem[];
};

export type InvoiceItem = {
    id: string;
    invoice_id: string;
    gl_head_id: string;
    description?: string;
    amount: number;
    created_at?: string;
    gl_head?: GLHead;
};

export type Payment = {
    id: string;
    invoice_id: string;
    amount: number;
    payment_date: string;
    fiscal_year_id: string;
    payment_mode_gl_id: string;
    transaction_reference?: string;
    remarks?: string;
    created_at?: string;
    payment_mode?: GLHead;
};

/* Phase 3: Expenses & Payroll */

export type Expense = {
    id: string;
    fiscal_year_id: string;
    expense_head_id: string;
    payment_mode_gl_id: string;
    amount: number;
    expense_date: string;
    description?: string;
    created_at?: string;
    expense_head?: GLHead;
    payment_mode?: GLHead;
};

export type SalaryComponentType = 'Earning' | 'Deduction';

export type SalaryStructure = {
    id: string;
    fiscal_year_id: string;
    employee_id: string;
    employee_name: string;
    created_at?: string;
    items?: SalaryStructureItem[];
};

export type SalaryStructureItem = {
    id: string;
    structure_id: string;
    gl_head_id: string;
    amount: number;
    type: SalaryComponentType;
    created_at?: string;
    gl_head?: GLHead;
};

export type PayrollRun = {
    id: string;
    fiscal_year_id: string;
    month: string;
    is_posted: boolean;
    created_at?: string;
    is_active?: boolean;
};

export type Payslip = {
    id: string;
    run_id: string;
    employee_id: string;
    employee_name: string;
    total_earnings: number;
    total_deductions: number;
    net_salary: number;
    status: string; // Draft, Paid
    created_at?: string;
    items?: PayslipItem[];
};

export type PayslipItem = {
    id: string;
    payslip_id: string;
    gl_head_id: string;
    amount: number;
    type: SalaryComponentType;
    created_at?: string;
    gl_head?: GLHead;
};

/* Students & Teachers */

export type Student = {
    id: string;
    name: string;
    class: string;
    roll_number: string;
    father_name?: string;
    father_mobile?: string;
    created_at?: string;
    // Add other fields as needed
};

export type Teacher = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    category?: 'Teaching Staff' | 'Support Staff';
    designation?: string; // e.g. Cook, Helper, Cleaner
    created_at?: string;
    // Add other fields as needed
};

export type Staff = {
    id: string;
    first_name: string;
    last_name: string;
    address?: string;
    mobile_number?: string;
    category?: string;
    designation?: string;
    employment_type?: string;
    service_status?: string;
    created_at?: string;
};

/* Roles & Permissions */

export type Permission = {
    id: string;
    slug: string;
    description?: string;
    created_at?: string;
};

export type Role = {
    id: string;
    name: string;
    description?: string;
    created_at?: string;
    permissions?: Permission[];
};

