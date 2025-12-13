-- Migration: 004_seed_coa.sql
-- Description: Wipes existing data and seeds a Standard Chart of Accounts (School Template)

DO $$
DECLARE
    -- Compulsory Root IDs
    asset_id UUID;
    liability_id UUID;
    income_id UUID;
    expense_id UUID;
    equity_id UUID;

    -- Sub-Root IDs
    curr_asset_id UUID;
    fixed_asset_id UUID;
    curr_liab_id UUID;
    long_liab_id UUID;
    academic_income_id UUID;
    other_income_id UUID;
    staff_exp_id UUID;
    admin_exp_id UUID;
    academic_exp_id UUID;
    maint_exp_id UUID;
    equity_sub_id UUID;

BEGIN
    -- 1. WIPEOUT (Order matters due to Foreign Keys)
    -- Delete transactions first
    DELETE FROM payslip_items;
    DELETE FROM payslips;
    DELETE FROM payroll_runs;
    
    DELETE FROM expenses;
    
    DELETE FROM payments;
    DELETE FROM invoice_items;
    DELETE FROM invoices;
    
    DELETE FROM salary_structure_items;
    DELETE FROM salary_structures;
    
    DELETE FROM fee_structure_items;
    DELETE FROM fee_structures;
    
    -- Finally clear GL Heads
    DELETE FROM gl_heads;


    -- 2. INSERT ROOTS (Level 1)
    INSERT INTO gl_heads (name, type, code, description) VALUES ('Assets', 'Asset', '1000', 'Resources owned by the school') RETURNING id INTO asset_id;
    INSERT INTO gl_heads (name, type, code, description) VALUES ('Liabilities', 'Liability', '2000', 'Amounts the school owes') RETURNING id INTO liability_id;
    INSERT INTO gl_heads (name, type, code, description) VALUES ('Income', 'Income', '3000', 'Money earned by the school') RETURNING id INTO income_id;
    INSERT INTO gl_heads (name, type, code, description) VALUES ('Expenses', 'Expense', '4000', 'Costs incurred to run the school') RETURNING id INTO expense_id;
    -- Note: Mapping Equity to Liability type for now as we don't have Equity type in ENUM yet, acts as Credit balance.
    INSERT INTO gl_heads (name, type, code, description) VALUES ('Equity', 'Liability', '5000', 'Owner’s interest in the school') RETURNING id INTO equity_id;


    -- 3. ASSETS (1000-1999)
    -- Current Assets
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Current Assets', 'Asset', '1001-H', asset_id) RETURNING id INTO curr_asset_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Cash in Hand', 'Asset', '1001', curr_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Bank Account – Main', 'Asset', '1002', curr_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Bank Account – Fee Collection', 'Asset', '1003', curr_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Petty Cash', 'Asset', '1004', curr_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Accounts Receivable', 'Asset', '1010', curr_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Advance Fees Received (Deposit)', 'Asset', '1011', curr_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Prepaid Expenses', 'Asset', '1020', curr_asset_id);

    -- Fixed Assets
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Fixed Assets', 'Asset', '1100-H', asset_id) RETURNING id INTO fixed_asset_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Land', 'Asset', '1101', fixed_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('School Building', 'Asset', '1102', fixed_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Furniture & Fixtures', 'Asset', '1103', fixed_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Computers & IT Equipment', 'Asset', '1104', fixed_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Playground Equipment', 'Asset', '1105', fixed_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Library Books', 'Asset', '1106', fixed_asset_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Accumulated Depreciation', 'Asset', '1190', fixed_asset_id);


    -- 4. LIABILITIES (2000-2999)
    -- Current Liabilities
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Current Liabilities', 'Liability', '2000-H', liability_id) RETURNING id INTO curr_liab_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Accounts Payable', 'Liability', '2001', curr_liab_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Salaries Payable', 'Liability', '2002', curr_liab_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Rent Payable', 'Liability', '2003', curr_liab_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Utilities Payable', 'Liability', '2004', curr_liab_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Tax Payable', 'Liability', '2005', curr_liab_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Provident Fund Payable', 'Liability', '2006', curr_liab_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Advance Fees (Unearned)', 'Liability', '2007', curr_liab_id);

    -- Long-Term Liabilities
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Long-Term Liabilities', 'Liability', '2100-H', liability_id) RETURNING id INTO long_liab_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Bank Loan', 'Liability', '2101', long_liab_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Loan from Management', 'Liability', '2102', long_liab_id);


    -- 5. INCOME (3000-3999)
    -- Academic Income
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Academic Income', 'Income', '3000-H', income_id) RETURNING id INTO academic_income_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Admission Fee', 'Income', '3001', academic_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Tuition Fee', 'Income', '3002', academic_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Exam Fee', 'Income', '3003', academic_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Registration Fee', 'Income', '3004', academic_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Library Fee', 'Income', '3005', academic_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Computer Lab Fee', 'Income', '3006', academic_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Transport Fee', 'Income', '3007', academic_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Late Fee / Fine', 'Income', '3008', academic_income_id);

    -- Other Income
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Other Income', 'Income', '3100-H', income_id) RETURNING id INTO other_income_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Book Sales', 'Income', '3101', other_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Uniform Sales', 'Income', '3102', other_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Event / Program Income', 'Income', '3103', other_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Donation / Grant', 'Income', '3104', other_income_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Miscellaneous Income', 'Income', '3199', other_income_id);


    -- 6. EXPENSES (4000-4999)
    -- Staff Expenses
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Staff Expenses', 'Expense', '4000-H', expense_id) RETURNING id INTO staff_exp_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Teacher Salary', 'Expense', '4001', staff_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Staff Salary', 'Expense', '4002', staff_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Overtime Expense', 'Expense', '4003', staff_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Provident Fund Contribution', 'Expense', '4004', staff_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Staff Welfare Expense', 'Expense', '4005', staff_exp_id);

    -- Administrative Expenses
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Administrative Expenses', 'Expense', '4100-H', expense_id) RETURNING id INTO admin_exp_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Rent Expense', 'Expense', '4101', admin_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Electricity Expense', 'Expense', '4102', admin_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Water Expense', 'Expense', '4103', admin_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Internet & Phone Expense', 'Expense', '4104', admin_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Printing & Stationery', 'Expense', '4105', admin_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Office Supplies', 'Expense', '4106', admin_exp_id);

    -- Academic & Student Expenses
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Academic & Student Expenses', 'Expense', '4200-H', expense_id) RETURNING id INTO academic_exp_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Teaching Materials', 'Expense', '4201', academic_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Library Expense', 'Expense', '4202', academic_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Sports & Activities Expense', 'Expense', '4203', academic_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Exam Expense', 'Expense', '4204', academic_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Student Welfare Expense', 'Expense', '4205', academic_exp_id);

    -- Maintenance & Other Expenses
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Maintenance & Other Expenses', 'Expense', '4300-H', expense_id) RETURNING id INTO maint_exp_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Repair & Maintenance', 'Expense', '4301', maint_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Cleaning & Security', 'Expense', '4302', maint_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Transportation Expense', 'Expense', '4303', maint_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Fuel Expense', 'Expense', '4304', maint_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Depreciation Expense', 'Expense', '4305', maint_exp_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Miscellaneous Expense', 'Expense', '4399', maint_exp_id);


    -- 7. EQUITY (5000-5999) - Treated as Liability type for now (Credit balance resource)
    INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Equity / Capital', 'Liability', '5000-H', equity_id) RETURNING id INTO equity_sub_id;
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Capital', 'Liability', '5001', equity_sub_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Retained Earnings', 'Liability', '5002', equity_sub_id);
        INSERT INTO gl_heads (name, type, code, parent_id) VALUES ('Current Year Profit / Loss', 'Liability', '5003', equity_sub_id);

END $$;
