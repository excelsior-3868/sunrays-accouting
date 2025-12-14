import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash, Loader2 } from 'lucide-react';
import { getSalaryStructures, createSalaryStructure, updateSalaryStructure, deleteSalaryStructure, getGLHeads, getFiscalYears, getTeachers, getStaffMembers } from '@/lib/api';
import { type SalaryStructure, type GLHead, type FiscalYear, type SalaryComponentType, type Teacher, type Staff } from '@/types';

export default function SalaryStructuresPage() {
    const [structures, setStructures] = useState<SalaryStructure[]>([]);
    const [glHeads, setGlHeads] = useState<GLHead[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);

    // Employee Data
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [staffMembers, setStaffMembers] = useState<Staff[]>([]);

    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formRows, setFormRows] = useState<{ gl_head_id: string; amount: number; type: SalaryComponentType }[]>([{ gl_head_id: '', amount: 0, type: 'Earning' }]);
    const [employeeType, setEmployeeType] = useState<'Teacher' | 'Staff'>('Teacher');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

    const fetchData = async () => {
        try {
            const [stData, glData, fyData, tData, sData] = await Promise.all([
                getSalaryStructures(),
                getGLHeads(),
                getFiscalYears(),
                getTeachers(),
                getStaffMembers()
            ]);
            setStructures(stData);
            setGlHeads(glData);
            setFiscalYears(fyData.filter(fy => !fy.is_active || true)); // Show all for now, filter in UI if needed
            setTeachers(tData);
            setStaffMembers(sData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleEdit = (st: SalaryStructure) => {
        setEditingId(st.id);
        const isTeacher = teachers.some(t => t.id === st.employee_id);
        setEmployeeType(isTeacher ? 'Teacher' : 'Staff');
        setSelectedEmployeeId(st.employee_id);

        // Map items to formRows
        if (st.items) {
            setFormRows(st.items.map(i => ({
                gl_head_id: i.gl_head_id,
                amount: i.amount,
                type: i.type
            })));
        }

        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this salary structure?')) return;
        try {
            await deleteSalaryStructure(id);
            fetchData();
        } catch (e) {
            console.error('Error deleting:', e);
        }
    }

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        let empName = '';
        let empId = selectedEmployeeId;

        if (employeeType === 'Teacher') {
            const t = teachers.find(t => t.id === empId);
            empName = t ? `${t.first_name} ${t.last_name}` : '';
        } else {
            const s = staffMembers.find(s => s.id === empId);
            empName = s ? `${s.first_name} ${s.last_name}` : '';
        }

        const structure = {
            employee_id: empId,
            employee_name: empName, // We store the name string for historical/display simplicity
            fiscal_year_id: formData.get('fiscal_year_id') as string,
        };

        const items = formRows.map(row => ({
            gl_head_id: row.gl_head_id,
            amount: row.amount,
            type: row.type
        }));

        try {
            if (editingId) {
                await updateSalaryStructure(editingId, structure, items);
            } else {
                await createSalaryStructure(structure, items);
            }
            setIsDialogOpen(false);
            setFormRows([{ gl_head_id: '', amount: 0, type: 'Earning' }]); // Reset
            setSelectedEmployeeId('');
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error('Error creating salary structure:', error);
        }
    };

    const addRow = () => {
        setFormRows([...formRows, { gl_head_id: '', amount: 0, type: 'Earning' }]);
    };

    const removeRow = (index: number) => {
        const newRows = [...formRows];
        newRows.splice(index, 1);
        setFormRows(newRows);
    };

    const updateRow = (index: number, field: 'gl_head_id' | 'amount' | 'type', value: any) => {
        const newRows = [...formRows];
        // @ts-ignore
        newRows[index][field] = value;
        setFormRows(newRows);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Salary Structures</h1>
                <button
                    onClick={() => {
                        setIsDialogOpen(true);
                        setEditingId(null);
                        setSelectedEmployeeId('');
                        setFormRows([{ gl_head_id: '', amount: 0, type: 'Earning' }]);
                    }}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" /> Define Structure
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {structures.map((st) => {
                        const designation = teachers.find(t => t.id === st.employee_id)?.designation
                            || staffMembers.find(s => s.id === st.employee_id)?.designation
                            || 'Employee';

                        return (
                            <div key={st.id} className="rounded-xl border bg-card text-card-foreground shadow">
                                <div className="flex flex-col space-y-1.5 p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold leading-none tracking-tight">{st.employee_name}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">{designation}</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <button onClick={() => handleEdit(st)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Edit">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(st.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete">
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 pt-0 text-sm text-muted-foreground">
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-foreground">Earnings</h4>
                                        <ul className="list-disc pl-4 space-y-1">
                                            {st.items?.filter(i => i.type === 'Earning').map(item => (
                                                <li key={item.id} className="flex justify-between">
                                                    <span>{item.gl_head?.name}</span>
                                                    <span>{item.amount}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {st.items?.some(i => i.type === 'Deduction') && (
                                            <>
                                                <h4 className="font-medium text-foreground mt-2">Deductions</h4>
                                                <ul className="list-disc pl-4 space-y-1">
                                                    {st.items?.filter(i => i.type === 'Deduction').map(item => (
                                                        <li key={item.id} className="flex justify-between">
                                                            <span>{item.gl_head?.name}</span>
                                                            <span>{item.amount}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {structures.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-10">
                            No salary structures defined.
                        </div>
                    )}
                </div>
            )}

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit' : 'New'} Salary Structure</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-4 mb-4 border rounded-md p-4 bg-muted/20">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Employee Type</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="empType"
                                                value="Teacher"
                                                checked={employeeType === 'Teacher'}
                                                onChange={() => { setEmployeeType('Teacher'); setSelectedEmployeeId(''); }}
                                                className="h-4 w-4"
                                            />
                                            <span className="text-sm">Teaching Staff</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="empType"
                                                value="Staff"
                                                checked={employeeType === 'Staff'}
                                                onChange={() => { setEmployeeType('Staff'); setSelectedEmployeeId(''); }}
                                                className="h-4 w-4"
                                            />
                                            <span className="text-sm">Support Staff</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Select Employee</label>
                                    <select
                                        value={selectedEmployeeId}
                                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">-- Select {employeeType} --</option>
                                        {employeeType === 'Teacher' ? (
                                            teachers.map(t => (
                                                <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.designation || 'Teacher'})</option>
                                            ))
                                        ) : (
                                            staffMembers.map(s => (
                                                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.designation})</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fiscal Year</label>
                                <select name="fiscal_year_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                    {fiscalYears.map(fy => (
                                        <option key={fy.id} value={fy.id}>{fy.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Salary Components</label>
                                <div className="space-y-2 border rounded-md p-3 max-h-60 overflow-y-auto">
                                    {formRows.map((row, index) => (
                                        <div key={index} className="flex gap-2 items-end">
                                            <div className="w-24 space-y-1">
                                                <span className="text-xs text-muted-foreground">Type</span>
                                                <select
                                                    value={row.type}
                                                    onChange={(e) => updateRow(index, 'type', e.target.value)}
                                                    required
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm bg-transparent"
                                                >
                                                    <option value="Earning">Earning</option>
                                                    <option value="Deduction">Deduction</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <span className="text-xs text-muted-foreground">GL Head</span>
                                                <select
                                                    value={row.gl_head_id}
                                                    onChange={(e) => updateRow(index, 'gl_head_id', e.target.value)}
                                                    required
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                >
                                                    <option value="">Select Head</option>
                                                    {(() => {
                                                        const filteredHeads = glHeads.filter(h => row.type === 'Earning' ? h.type === 'Expense' : true);
                                                        const roots = filteredHeads.filter(h => !filteredHeads.find(p => p.id === h.parent_id));

                                                        const renderSmartHierarchy = (items: GLHead[], level = 0): React.ReactNode => {
                                                            return items.map(h => {
                                                                const children = filteredHeads.filter(c => c.parent_id === h.id);
                                                                return (
                                                                    <React.Fragment key={h.id}>
                                                                        <option value={h.id}>
                                                                            {'\u00A0'.repeat(level * 4) + h.name} ({h.type})
                                                                        </option>
                                                                        {renderSmartHierarchy(children, level + 1)}
                                                                    </React.Fragment>
                                                                )
                                                            });
                                                        };

                                                        return renderSmartHierarchy(roots);
                                                    })()}
                                                </select>
                                            </div>
                                            <div className="w-24 space-y-1">
                                                <span className="text-xs text-muted-foreground">Amount</span>
                                                <input
                                                    type="number"
                                                    value={row.amount}
                                                    onChange={(e) => updateRow(index, 'amount', Number(e.target.value))}
                                                    required
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeRow(index)} className="h-9 w-9 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded">
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addRow} className="text-sm text-primary hover:underline flex items-center mt-2">
                                        <Plus className="h-3 w-3 mr-1" /> Add Component
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90">{editingId ? 'Update' : 'Create'} Structure</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
