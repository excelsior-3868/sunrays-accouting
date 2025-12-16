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

export const updateFeeStructure = async (id: string, updates: Partial<FeeStructure>) => {
    const { data, error } = await supabase
        .from('fee_structures')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
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

export const approvePayrollRun = async (runId: string) => {
    // 1. Get Payslips
    const { data: run, error: runError } = await supabase
        .from('payroll_runs')
        .select('*, payslips(*)')
        .eq('id', runId)
        .single();

    if (runError) throw runError;
    if (run.is_posted) throw new Error('Payroll run already posted.');

    // 2. Get GL Heads
    const { data: cashMethods } = await supabase.from('gl_heads').select('id, name').ilike('name', '%Cash%').limit(1);
    if (!cashMethods || cashMethods.length === 0) throw new Error('Cash GL Head not found for payment (searched for "%Cash%").');
    const cashHeadId = cashMethods[0].id;

    // Get specific Salary Heads
    const { data: teacherSalaryHeads } = await supabase.from('gl_heads').select('id').ilike('name', '%Teacher Salary%').limit(1);
    const { data: staffSalaryHeads } = await supabase.from('gl_heads').select('id').ilike('name', '%Staff Salary%').limit(1);

    const teacherSalaryId = teacherSalaryHeads?.[0]?.id;
    const staffSalaryId = staffSalaryHeads?.[0]?.id;

    // Fallback if specific heads not found
    const { data: generalSalaryHeads } = await supabase.from('gl_heads').select('id').ilike('name', '%Salary%').eq('type', 'Expense').limit(1);
    const fallbackSalaryId = generalSalaryHeads?.[0]?.id;

    if (!teacherSalaryId && !staffSalaryId && !fallbackSalaryId) {
        throw new Error('No appropriate Salary Expense Head found.');
    }

    // Prefetch Staff IDs to distinguish types
    const { data: staffData } = await supabase.from('staff').select('id');
    const staffIds = new Set(staffData?.map(s => s.id) || []);

    // 3. Create Expenses
    for (const slip of run.payslips) {
        let expenseHeadId = fallbackSalaryId;

        // Determine correct head
        if (staffIds.has(slip.employee_id)) {
            expenseHeadId = staffSalaryId || fallbackSalaryId;
        } else {
            // Assume Teacher if not Staff (or check Teacher DB if needed, but this is safer fallback for now)
            expenseHeadId = teacherSalaryId || fallbackSalaryId;
        }

        if (!expenseHeadId) {
            console.warn(`Skipping expense for ${slip.employee_name}: Missing Salary GL Head.`);
            continue;
        }

        await createExpense({
            expense_date: new Date().toISOString(), // Payment Date
            amount: slip.net_salary,
            description: `Salary Payment for ${slip.employee_name} - ${run.month}`,
            expense_head_id: expenseHeadId,
            payment_mode_gl_id: cashHeadId,
            fiscal_year_id: run.fiscal_year_id
        });
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
    console.log('API: getRoles called');
    const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('name');

    if (rolesError) {
        console.error('API: getRoles error fetching roles', rolesError);
        throw rolesError;
    }
    console.log('API: getRoles fetched raw roles:', roles);

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
        const myPerms = rolePerms
            .filter((rp: any) => rp.role_id === role.id)
            .map((rp: any) => rp.permission)
            .filter(Boolean);

        return {
            ...role,
            permissions: myPerms
        };
    });

    return rolesWithPermissions as import('../types').Role[];
};

export const getPermissions = async () => {
    const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('slug');

    if (error) throw error;
    return data as import('../types').Permission[];
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

    if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permId => ({
            role_id: roleData.id,
            permission_id: permId
        }));

        const { error: permError } = await supabase
            .from('role_permissions')
            .insert(rolePermissions);

        if (permError) throw permError;
    }

    return roleData;
};

export const updateRole = async (
    id: string,
    updates: { name?: string; description?: string },
    permissionIds?: string[]
) => {
    // 1. Update Role Details
    // 1. Update Role Details
    const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', id)
        .select();

    if (roleError) throw roleError;
    const updatedRole = roleData && roleData.length > 0 ? roleData[0] : null;

    if (!updatedRole) {
        // If no row returned, it might be RLS or invalid ID. 
        // But we can proceed to update permissions if we assume the user just has no visibility?
        // Actually if we can't see it, we probably failed to update it or it doesn't exist.
        // Let's assume success if no error, but return null or throw?
        // Throwing might be better to debug.
        throw new Error("Failed to update role or retrieve updated record (check permissions).");
    }

    // 2. Update Permissions if provided
    if (permissionIds) {
        // Delete existing
        const { error: delError } = await supabase
            .from('role_permissions')
            .delete()
            .eq('role_id', id);

        if (delError) throw delError;

        // Insert new
        if (permissionIds.length > 0) {
            const rolePermissions = permissionIds.map(permId => ({
                role_id: id,
                permission_id: permId
            }));

            const { error: insError } = await supabase
                .from('role_permissions')
                .insert(rolePermissions);

            if (insError) throw insError;
        }
    }

    return updatedRole;
};

export const deleteRole = async (id: string) => {
    const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

