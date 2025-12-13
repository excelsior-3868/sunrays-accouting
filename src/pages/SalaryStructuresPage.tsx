import React, { useEffect, useState } from 'react';
import { Plus, Trash, Loader2 } from 'lucide-react';
import { getSalaryStructures, createSalaryStructure, getGLHeads, getFiscalYears } from '@/lib/api';
import { type SalaryStructure, type GLHead, type FiscalYear, type SalaryComponentType } from '@/types';

export default function SalaryStructuresPage() {
    const [structures, setStructures] = useState<SalaryStructure[]>([]);
    const [glHeads, setGlHeads] = useState<GLHead[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [formRows, setFormRows] = useState<{ gl_head_id: string; amount: number; type: SalaryComponentType }[]>([{ gl_head_id: '', amount: 0, type: 'Earning' }]);

    const fetchData = async () => {
        try {
            const [stData, glData, fyData] = await Promise.all([
                getSalaryStructures(),
                getGLHeads(),
                getFiscalYears()
            ]);
            setStructures(stData);
            setGlHeads(glData); // We need both Expense (Earnings) and Liability/Other (Deductions)
            setFiscalYears(fyData.filter(fy => !fy.is_closed));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const structure = {
            employee_id: formData.get('employee_id') as string,
            employee_name: formData.get('employee_name') as string,
            fiscal_year_id: formData.get('fiscal_year_id') as string,
        };

        const items = formRows.map(row => ({
            gl_head_id: row.gl_head_id,
            amount: row.amount,
            type: row.type
        }));

        try {
            await createSalaryStructure(structure, items);
            setIsDialogOpen(false);
            setFormRows([{ gl_head_id: '', amount: 0, type: 'Earning' }]); // Reset
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
                <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Define Structure
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {structures.map((st) => (
                        <div key={st.id} className="rounded-xl border bg-card text-card-foreground shadow">
                            <div className="flex flex-col space-y-1.5 p-6">
                                <h3 className="font-semibold leading-none tracking-tight">{st.employee_name}</h3>
                                <p className="text-sm text-muted-foreground">ID: {st.employee_id}</p>
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
                    ))}
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
                        <h3 className="text-lg font-semibold mb-4">New Salary Structure</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Employee ID</label>
                                    <input name="employee_id" required placeholder="E-001" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Employee Name</label>
                                    <input name="employee_name" required placeholder="Jane Doe" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
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
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Create Structure</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
