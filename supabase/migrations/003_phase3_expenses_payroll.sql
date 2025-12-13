-- 1. Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year_id UUID REFERENCES fiscal_years(id) NOT NULL,
    expense_head_id UUID REFERENCES gl_heads(id) NOT NULL, -- Must be Expense Type
    payment_mode_gl_id UUID REFERENCES gl_heads(id) NOT NULL, -- Asset Type (Cash/Bank)
    amount NUMERIC(12, 2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Salary Structures
CREATE TABLE salary_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year_id UUID REFERENCES fiscal_years(id) NOT NULL,
    employee_id TEXT NOT NULL, -- External ID
    employee_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE salary_component_type AS ENUM ('Earning', 'Deduction');

CREATE TABLE salary_structure_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    structure_id UUID REFERENCES salary_structures(id) ON DELETE CASCADE,
    gl_head_id UUID REFERENCES gl_heads(id) NOT NULL, -- Expense (Earning) or Liability (Deduction)
    amount NUMERIC(12, 2) NOT NULL,
    type salary_component_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Payroll Runs (Monthly)
CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year_id UUID REFERENCES fiscal_years(id) NOT NULL,
    month TEXT NOT NULL, -- e.g., "Baisakh", "2024-04"
    is_posted BOOLEAN DEFAULT FALSE, -- If true, GL entries should be locked
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payslips (Individual)
CREATE TABLE payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    total_earnings NUMERIC(12, 2) NOT NULL,
    total_deductions NUMERIC(12, 2) NOT NULL,
    net_salary NUMERIC(12, 2) NOT NULL,
    status TEXT DEFAULT 'Draft', -- Draft, Paid
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payslip_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payslip_id UUID REFERENCES payslips(id) ON DELETE CASCADE,
    gl_head_id UUID REFERENCES gl_heads(id) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type salary_component_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_salary_structures_emp ON salary_structures(employee_id);
CREATE INDEX idx_payroll_runs_month ON payroll_runs(month);
