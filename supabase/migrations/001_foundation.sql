-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Fiscal Years
CREATE TABLE fiscal_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g., "2080-2081"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. General Ledger (GL) Heads
CREATE TYPE gl_head_type AS ENUM ('Income', 'Expense', 'Asset', 'Liability');

CREATE TABLE gl_heads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type gl_head_type NOT NULL,
    code TEXT, -- Optional accounting code
    parent_id UUID REFERENCES gl_heads(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fee Structures (Income)
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g., "Nursery Monthly Fee"
    fiscal_year_id UUID REFERENCES fiscal_years(id) NOT NULL,
    amount NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fee_structure_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    gl_head_id UUID REFERENCES gl_heads(id) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Invoices & Payments (Transactions)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL, -- External ID from Sunrays Admin
    fiscal_year_id UUID REFERENCES fiscal_years(id) NOT NULL,
    invoice_number TEXT UNIQUE,
    total_amount NUMERIC(12, 2) NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'Unpaid', -- Unpaid, Partial, Paid, OVERDUE?
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    gl_head_id UUID REFERENCES gl_heads(id) NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    fiscal_year_id UUID REFERENCES fiscal_years(id) NOT NULL,
    payment_mode_gl_id UUID REFERENCES gl_heads(id) NOT NULL, -- Cash or Bank GL
    transaction_reference TEXT, -- e.g. Check Number
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX idx_fiscal_years_active ON fiscal_years(is_active);
CREATE INDEX idx_gl_heads_type ON gl_heads(type);
CREATE INDEX idx_invoices_student ON invoices(student_id);
