import { supabase } from './supabase';
import { schoolSupabase } from './schoolSupabase';
import { type FiscalYear, type GLHead, type FeeStructure, type FeeStructureItem, type Invoice, type Payment, type Expense, type SalaryStructure, type SalaryStructureItem, type PayrollRun } from '../types';

/* -------------------------------------------------------------------------- */
/*                                Fiscal Years                                */
/* -------------------------------------------------------------------------- */

export const getFiscalYears = async () => {
    const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .order('start_date', { ascending: false });

    if (error) throw error;
    return data as FiscalYear[];
};

export const createFiscalYear = async (fy: Omit<FiscalYear, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
        .from('fiscal_years')
        .insert([fy])
        .select()
        .single();

    if (error) throw error;
    return data as FiscalYear;
};

export const updateFiscalYear = async (id: string, updates: Partial<FiscalYear>) => {
    const { data, error } = await supabase
        .from('fiscal_years')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as FiscalYear;
};

export const setActiveFiscalYear = async (id: string) => {
    // 1. Deactivate all
    await supabase.from('fiscal_years').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');

    const { data, error } = await supabase
        .from('fiscal_years')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as FiscalYear;
};

/* -------------------------------------------------------------------------- */
/*                                  GL Heads                                  */
/* -------------------------------------------------------------------------- */

export const getGLHeads = async () => {
    const { data, error } = await supabase
        .from('gl_heads')
        .select('*')
        .order('name');

    if (error) throw error;
    return data as GLHead[];
};

export const createGLHead = async (head: Omit<GLHead, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
        .from('gl_heads')
        .insert([head])
        .select()
        .single();

    if (error) throw error;
    return data as GLHead;
};

export const deleteGLHead = async (id: string) => {
    const { error } = await supabase
        .from('gl_heads')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

/* -------------------------------------------------------------------------- */
/*                                Fee Structures                              */
/* -------------------------------------------------------------------------- */

export const getFeeStructures = async () => {
    const { data, error } = await supabase
        .from('fee_structures')
        .select('*, items:fee_structure_items(*, gl_head:gl_heads(*))')
        .order('name');

    if (error) throw error;
    return data as FeeStructure[];
};

export const createFeeStructure = async (
    structure: Omit<FeeStructure, 'id' | 'created_at' | 'items'>,
    items: Omit<FeeStructureItem, 'id' | 'created_at' | 'structure_id' | 'gl_head'>[]
) => {
    const { data: stData, error: stError } = await supabase
        .from('fee_structures')
        .insert([structure])
        .select()
        .single();

    if (stError) throw stError;

    const itemsWithId = items.map(item => ({ ...item, structure_id: stData.id }));
    const { error: itemsError } = await supabase
        .from('fee_structure_items')
        .insert(itemsWithId);

    if (itemsError) throw itemsError;

    return stData;
};

/* -------------------------------------------------------------------------- */
/*                                   Invoices                                 */
/* -------------------------------------------------------------------------- */

export const getInvoices = async () => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Invoice[];
};

export const getInvoiceById = async (id: string) => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, items:invoice_items(*, gl_head:gl_heads(*))')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Invoice as Invoice; // Double cast to avoid TS issues if any
};

export const createInvoice = async (
    invoice: Omit<Invoice, 'id' | 'created_at' | 'items'>,
    items: Omit<import('../types').InvoiceItem, 'id' | 'created_at' | 'invoice_id' | 'gl_head'>[]
) => {
    const { data: invData, error: invError } = await supabase
        .from('invoices')
        .insert([invoice])
        .select()
        .single();

    if (invError) throw invError;

    const itemsWithId = items.map(item => ({ ...item, invoice_id: invData.id }));
    const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsWithId);

    if (itemsError) throw itemsError;

    return invData;
};

/* -------------------------------------------------------------------------- */
/*                                   Payments                                 */
/* -------------------------------------------------------------------------- */

export const recordPayment = async (payment: Omit<Payment, 'id' | 'created_at' | 'payment_mode'>) => {
    const { data, error } = await supabase
        .from('payments')
        .insert([payment])
        .select()
        .single();

    if (error) throw error;

    await supabase.from('invoices').update({ status: 'Paid' }).eq('id', payment.invoice_id);

    return data;
};

export const getPayments = async () => {
    const { data, error } = await supabase
        .from('payments')
        .select('*, payment_mode:gl_heads!payment_mode_gl_id(*), invoice:invoices(*)')
        .order('payment_date', { ascending: false });

    if (error) throw error;
    // @ts-ignore
    return data as Payment[];
};

/* -------------------------------------------------------------------------- */
/*                                   Expenses                                 */
/* -------------------------------------------------------------------------- */

export const getExpenses = async () => {
    const { data, error } = await supabase
        .from('expenses')
        .select('*, expense_head:gl_heads!expense_head_id(*), payment_mode:gl_heads!payment_mode_gl_id(*)')
        .order('expense_date', { ascending: false });

    if (error) throw error;
    return data as Expense[];
};

export const createExpense = async (expense: Omit<Expense, 'id' | 'created_at' | 'expense_head' | 'payment_mode'>) => {
    const { data, error } = await supabase
        .from('expenses')
        .insert([expense])
        .select()
        .single();

    if (error) throw error;
    return data as Expense;
};

/* -------------------------------------------------------------------------- */
/*                               Salary Structures                            */
/* -------------------------------------------------------------------------- */

export const getSalaryStructures = async () => {
    const { data, error } = await supabase
        .from('salary_structures')
        .select('*, items:salary_structure_items(*, gl_head:gl_heads(*))')
        .order('employee_name');

    if (error) throw error;
    return data as SalaryStructure[];
};

export const createSalaryStructure = async (
    structure: Omit<SalaryStructure, 'id' | 'created_at' | 'items'>,
    items: Omit<SalaryStructureItem, 'id' | 'created_at' | 'structure_id' | 'gl_head'>[]
) => {
    const { data: stData, error: stError } = await supabase
        .from('salary_structures')
        .insert([structure])
        .select()
        .single();

    if (stError) throw stError;

    const itemsWithId = items.map(item => ({ ...item, structure_id: stData.id }));
    const { error: itemsError } = await supabase
        .from('salary_structure_items')
        .insert(itemsWithId);

    if (itemsError) throw itemsError;

    return stData;
};

/* -------------------------------------------------------------------------- */
/*                                   Payroll                                  */
/* -------------------------------------------------------------------------- */

export const generatePayrollRun = async (fiscal_year_id: string, month: string) => {
    // 1. Create Run
    const { data: runData, error: runError } = await supabase
        .from('payroll_runs')
        .insert([{ fiscal_year_id, month }])
        .select()
        .single();

    if (runError) throw runError;

    // 2. Fetch all active structures (assuming all for simplicity)
    const structures = await getSalaryStructures();

    // 3. Create Payslips
    for (const st of structures) {
        if (!st.items) continue;

        const earnings = st.items.filter(i => i.type === 'Earning').reduce((s, i) => s + i.amount, 0);
        const deductions = st.items.filter(i => i.type === 'Deduction').reduce((s, i) => s + i.amount, 0);

        const { data: slipData, error: slipError } = await supabase
            .from('payslips')
            .insert([{
                run_id: runData.id,
                employee_id: st.employee_id,
                employee_name: st.employee_name,
                total_earnings: earnings,
                total_deductions: deductions,
                net_salary: earnings - deductions,
                status: 'Draft'
            }])
            .select()
            .single();

        if (slipError) {
            console.error('Error creating payslip', slipError);
            continue;
        }

        // 4. Create Payslip Items
        const slipItems = st.items.map(i => ({
            payslip_id: slipData.id,
            gl_head_id: i.gl_head_id,
            amount: i.amount,
            type: i.type
        }));

        await supabase.from('payslip_items').insert(slipItems);
    }

    return runData;
};

export const getPayrollRuns = async () => {
    const { data, error } = await supabase
        .from('payroll_runs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PayrollRun[];
};


export const getPayrollRunDetails = async (id: string) => {
    const { data, error } = await supabase
        .from('payroll_runs')
        .select('*, payslips:payslips(*)')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data; // Typed casually
};

/* -------------------------------------------------------------------------- */
/*                               Students & Teachers                          */
/* -------------------------------------------------------------------------- */

export const getStudents = async () => {
    const { data, error } = await schoolSupabase
        .from('students')
        .select('*')
        .order('name');

    if (error) throw error;
    return data as import('../types').Student[];
};

export const getTeachers = async () => {
    const { data, error } = await schoolSupabase
        .from('teachers')
        .select('*')
        .order('first_name');

    if (error) throw error;
    return data as import('../types').Teacher[];
};
