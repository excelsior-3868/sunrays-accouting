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

export const updateFeeStructure = async (
    id: string,
    updates: Partial<FeeStructure>,
    items?: Omit<FeeStructureItem, 'id' | 'created_at' | 'structure_id' | 'gl_head'>[]
) => {
    const { data, error } = await supabase
        .from('fee_structures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    if (items) {
        // Delete existing items
        const { error: delError } = await supabase
            .from('fee_structure_items')
            .delete()
            .eq('structure_id', id);

        if (delError) throw delError;

        // Insert new items
        if (items.length > 0) {
            const itemsWithId = items.map(item => ({ ...item, structure_id: id }));
            const { error: insError } = await supabase
                .from('fee_structure_items')
                .insert(itemsWithId);

            if (insError) throw insError;
        }
    }

    return data as FeeStructure;
};

export const deleteFeeStructure = async (id: string) => {
    const { error } = await supabase
        .from('fee_structures')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

/* -------------------------------------------------------------------------- */
/*                                   Invoices                                 */
/* -------------------------------------------------------------------------- */

export const getInvoices = async () => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*, items:invoice_items(*, gl_head:gl_heads(*))')
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

export const getStudentUnpaidStats = async (studentId: string, beforeDate: string) => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'Unpaid')
        .lt('created_at', beforeDate);

    if (error) throw error;

    const amount = data.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const months = [...new Set(data.map(inv => inv.month).filter(Boolean))].join(', ');

    return { amount, months };
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

    if (error) throw error;

    // 1. Mark Current Invoice as Paid
    const { data: currentInvoice, error: fetchError } = await supabase
        .from('invoices')
        .update({ status: 'Paid' })
        .eq('id', payment.invoice_id)
        .select()
        .single();

    if (fetchError) throw fetchError;

    // 2. Cascade Clean-up: Mark all PREVIOUS invoices for this student as 'Paid'
    // AND create transaction records for them.
    if (currentInvoice) {
        // Fetch older unpaid invoices
        const { data: previousInvoices } = await supabase
            .from('invoices')
            .select('*')
            .eq('student_id', currentInvoice.student_id)
            .neq('id', currentInvoice.id)
            .lt('created_at', currentInvoice.created_at)
            .eq('status', 'Unpaid');

        if (previousInvoices && previousInvoices.length > 0) {
            // Prepare payment records for backlog
            const backlogPayments = previousInvoices.map(inv => ({
                invoice_id: inv.id,
                amount: inv.total_amount, // Assuming full payment
                payment_date: payment.payment_date,
                fiscal_year_id: payment.fiscal_year_id,
                payment_mode_gl_id: payment.payment_mode_gl_id,
                payment_method: payment.payment_method,
                remarks: `Backlog cleared via payment for ${currentInvoice.invoice_number} (${currentInvoice.month || ''})`
            }));

            // Insert payments
            const { error: payError } = await supabase
                .from('payments')
                .insert(backlogPayments);

            if (payError) {
                console.error('Error creating backlog payments:', payError);
            } else {
                // Update statuses to Paid
                const invoiceIds = previousInvoices.map(i => i.id);
                const { error: updateError } = await supabase
                    .from('invoices')
                    .update({ status: 'Paid' })
                    .in('id', invoiceIds);

                if (updateError) {
                    console.error('Error updating backlog invoice statuses:', updateError);
                }
            }
        }
    }

    return data;
};

export const recordDirectIncome = async (income: Omit<Payment, 'id' | 'created_at' | 'payment_mode' | 'income_head' | 'invoice_id'> & { income_head_id: string }) => {
    // Validation: Direct Income must have income_head_id
    if (!income.income_head_id) {
        throw new Error('income_head_id is required for direct income');
    }

    const { data, error } = await supabase
        .from('payments')
        .insert([{
            ...income,
            invoice_id: null // Explicitly null for direct income
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getPayments = async () => {
    const { data, error } = await supabase
        .from('payments')
        .select('*, payment_mode:gl_heads!payment_mode_gl_id(*), invoice:invoices(*, items:invoice_items(*)), income_head:gl_heads!income_head_id(*)')
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
    // If we have payment_method but no payment_mode_gl_id, we just insert payment_method.
    // Ideally the DB schema should have been updated to allow payment_mode_gl_id to be nullable.

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

export const updateSalaryStructure = async (id: string, structure: Partial<SalaryStructure>, items: any[]) => {
    const { error: stError } = await supabase
        .from('salary_structures')
        .update({
            employee_id: structure.employee_id,
            employee_name: structure.employee_name,
            fiscal_year_id: structure.fiscal_year_id
        })
        .eq('id', id);

    if (stError) throw stError;

    // Replace items
    const { error: delError } = await supabase
        .from('salary_structure_items')
        .delete()
        .eq('salary_structure_id', id);

    if (delError) throw delError;

    if (items.length > 0) {
        const { error: itemError } = await supabase
            .from('salary_structure_items')
            .insert(items.map(i => ({ ...i, salary_structure_id: id })));
        if (itemError) throw itemError;
    }
};

export const deleteSalaryStructure = async (id: string) => {
    const { error } = await supabase
        .from('salary_structures')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

/* -------------------------------------------------------------------------- */
/*                                   Payroll                                  */
/* -------------------------------------------------------------------------- */

export const generatePayrollRun = async (fiscal_year_id: string, month: string, onProgress?: (percent: number) => void) => {
    // 1. Create Run
    const { data: runData, error: runError } = await supabase
        .from('payroll_runs')
        .insert([{ fiscal_year_id, month }])
        .select()
        .single();

    if (runError) throw runError;

    // 2. Fetch all active structures
    const structures = await getSalaryStructures();
    const total = structures.length;

    // 3. Create Payslips
    for (let i = 0; i < structures.length; i++) {
        const st = structures[i];
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

        // Update progress
        if (onProgress) {
            onProgress(Math.round(((i + 1) / total) * 100));
        }
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

export const approvePayrollRun = async (runId: string, paymentModeId?: string, onProgress?: (percent: number) => void) => {
    // 1. Get Payslips
    const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .select('*, payslips(*)')
        .eq('id', runId)
        .single();

    if (runError) throw runError;
    if (run.is_posted) throw new Error('Payroll run already posted.');

    // 2. Get GL Heads
    let paymentHeadId = paymentModeId;
    if (!paymentHeadId) {
        const { data: cashMethods } = await supabase.from('gl_heads').select('id, name').ilike('name', '%Cash%').limit(1);
        if (!cashMethods || cashMethods.length === 0) throw new Error('Cash GL Head not found for payment (searched for "%Cash%").');
        paymentHeadId = cashMethods[0].id;
    }

    const { data: teacherSalaryHeads } = await supabase.from('gl_heads').select('id').ilike('name', '%Teacher Salary%').limit(1);
    const { data: staffSalaryHeads } = await supabase.from('gl_heads').select('id').ilike('name', '%Staff Salary%').limit(1);

    const teacherSalaryId = teacherSalaryHeads?.[0]?.id;
    const staffSalaryId = staffSalaryHeads?.[0]?.id;

    const { data: generalSalaryHeads } = await supabase.from('gl_heads').select('id').ilike('name', '%Salary%').eq('type', 'Expense').limit(1);
    const fallbackSalaryId = generalSalaryHeads?.[0]?.id;

    if (!teacherSalaryId && !staffSalaryId && !fallbackSalaryId) {
        throw new Error('No appropriate Salary Expense Head found.');
    }

    const { data: staffData } = await supabase.from('staff').select('id');
    const staffIds = new Set(staffData?.map(s => s.id) || []);

    const total = run.payslips.length;

    // 3. Create Expenses
    for (let i = 0; i < run.payslips.length; i++) {
        const slip = run.payslips[i];
        let expenseHeadId = fallbackSalaryId;

        if (staffIds.has(slip.employee_id)) {
            expenseHeadId = staffSalaryId || fallbackSalaryId;
        } else {
            expenseHeadId = teacherSalaryId || fallbackSalaryId;
        }

        if (!expenseHeadId) {
            console.warn(`Skipping expense for ${slip.employee_name}: Missing Salary GL Head.`);
            continue;
        }

        await createExpense({
            expense_date: new Date().toISOString(),
            amount: slip.net_salary,
            description: `Salary Payment for ${slip.employee_name} - ${run.month}`,
            expense_head_id: expenseHeadId,
            payment_mode_gl_id: paymentHeadId,
            fiscal_year_id: run.fiscal_year_id
        });

        if (onProgress) {
            onProgress(Math.round(((i + 1) / total) * 100));
        }
    }

    // 4. Update Run Status
    const { error: updateError } = await supabase
        .from('payroll_runs')
        .update({ is_posted: true })
        .eq('id', runId);

    if (updateError) throw updateError;

    // 5. Update Payslip Statuses
    const { error: slipsError } = await supabase
        .from('payslips')
        .update({ status: 'Paid' })
        .eq('run_id', runId);

    if (slipsError) throw slipsError;
};

export const deletePayrollRun = async (id: string) => {
    const { error } = await supabase
        .from('payroll_runs')
        .delete()
        .eq('id', id);

    if (error) throw error;
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

export const createTeacher = async (teacher: Omit<import('../types').Teacher, 'id' | 'created_at'>) => {
    const { data, error } = await schoolSupabase
        .from('teachers')
        .insert([teacher])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateTeacher = async (id: string, updates: Partial<import('../types').Teacher>) => {
    const { data, error } = await schoolSupabase
        .from('teachers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteTeacher = async (id: string) => {
    const { error } = await schoolSupabase
        .from('teachers')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const getStaffMembers = async () => {
    const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('first_name');

    if (error) throw error;
    return data as import('../types').Staff[];
};

export const createStaffMember = async (staff: Omit<import('../types').Staff, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('staff')
        .insert([staff])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateStaffMember = async (id: string, updates: Partial<import('../types').Staff>) => {
    const { data, error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteStaffMember = async (id: string) => {
    const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

/* -------------------------------------------------------------------------- */
/*                                  GL Head Updates                           */
/* -------------------------------------------------------------------------- */

export const updateGLHead = async (id: string, updates: Partial<GLHead>) => {
    const { data, error } = await supabase
        .from('gl_heads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as GLHead;
};

/* -------------------------------------------------------------------------- */
/*                               Roles & Permissions                          */
/* -------------------------------------------------------------------------- */

export const getRoles = async () => {
    // 1. Fetch Roles
    const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('name');

    if (rolesError) {
        console.error('API: getRoles error fetching roles', rolesError);
        throw rolesError;
    }

    try {
        // 2. Fetch all Role Permissions
        const { data: rolePerms, error: permsError } = await supabase
            .from('role_permissions')
            .select(`
                role_id,
                permission:permissions (
                    *
                )
            `);

        if (permsError) throw permsError;

        // 3. Map permissions to roles
        const rolesWithPermissions = roles.map(role => {
            const myPerm_s = rolePerms
                .filter((rp: any) => rp.role_id === role.id)
                .map((rp: any) => rp.permission)
                .filter(Boolean);

            return {
                ...role,
                permissions: myPerm_s
            };
        });

        return rolesWithPermissions as import('../types').Role[];
    } catch (permError) {
        console.warn('API: getRoles failed to fetch permissions, returning roles without permissions:', permError);
        // Fallback: return roles without permissions
        return roles.map(r => ({ ...r, permissions: [] }));
    }
};

export const getPermissions = async () => {
    const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('slug');

    if (error) throw error;
    return data as import('../types').Permission[];
};

export const getUsers = async () => {
    const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
};

export const createRole = async (
    role: { name: string; description: string },
    permissionIds: string[]
) => {
    const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .insert([role])
        .select()
        .single();

    if (roleError) throw roleError;

    // Insert permissions
    if (permissionIds.length > 0) {
        const { error: permError } = await supabase
            .from('role_permissions')
            .insert(permissionIds.map(pid => ({ role_id: roleData.id, permission_id: pid })));
        if (permError) throw permError;
    }

    return roleData;
};

export const updateRole = async (
    id: string,
    updates: { name: string; description: string },
    permissionIds: string[]
) => {
    // 1. Update Role details
    const { data, error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    // 2. Update Permissions (Delete all, insert new)
    // This is simple but brute force.
    const { error: delError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', id);

    if (delError) throw delError;

    if (permissionIds.length > 0) {
        const { error: insError } = await supabase
            .from('role_permissions')
            .insert(permissionIds.map(pid => ({ role_id: id, permission_id: pid })));

        if (insError) throw insError;
    }

    return data;
};

export const deleteRole = async (id: string) => {
    const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

/* -------------------------------------------------------------------------- */
/*                                 Inventory                                  */
/* -------------------------------------------------------------------------- */

export const getInventoryItems = async () => {
    const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

    if (error) throw error;
    return data as import('../types').InventoryItem[];
};

export const createInventoryItem = async (item: Omit<import('../types').InventoryItem, 'id' | 'created_at' | 'updated_at' | 'children'>) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .insert([item])
        .select()
        .single();

    if (error) throw error;
    return data as import('../types').InventoryItem;
};

export const updateInventoryItem = async (id: string, updates: Partial<import('../types').InventoryItem>) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as import('../types').InventoryItem;
};

export const deleteInventoryItem = async (id: string) => {
    const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

    if (error) throw error;
};



