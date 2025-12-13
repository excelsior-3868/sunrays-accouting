import React, { useEffect, useState } from 'react';
import { Plus, Trash, Loader2 } from 'lucide-react';
import { getFeeStructures, createFeeStructure, getGLHeads, getFiscalYears } from '@/lib/api';
import { type FeeStructure, type GLHead, type FiscalYear } from '@/types';

export default function FeeStructuresPage() {
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [glHeads, setGlHeads] = useState<GLHead[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [formRows, setFormRows] = useState<{ gl_head_id: string; amount: number }[]>([{ gl_head_id: '', amount: 0 }]);

    const fetchData = async () => {
        try {
            const [stData, glData, fyData] = await Promise.all([
                getFeeStructures(),
                getGLHeads(),
                getFiscalYears()
            ]);
            setStructures(stData);
            setGlHeads(glData.filter(h => h.type === 'Income')); // Only Income heads for fees
            setFiscalYears(fyData.filter(fy => !fy.is_closed)); // Only open years
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

        const totalAmount = formRows.reduce((sum, row) => sum + row.amount, 0);

        const structure = {
            name: formData.get('name') as string,
            fiscal_year_id: formData.get('fiscal_year_id') as string,
            class_name: formData.get('class_name') as string || undefined,
            amount: totalAmount,
        };

        const items = formRows.map(row => ({
            gl_head_id: row.gl_head_id,
            amount: row.amount
        }));

        try {
            await createFeeStructure(structure, items);
            setIsDialogOpen(false);
            setFormRows([{ gl_head_id: '', amount: 0 }]); // Reset
            fetchData();
        } catch (error) {
            console.error('Error creating fee structure:', error);
        }
    };

    const addRow = () => {
        setFormRows([...formRows, { gl_head_id: '', amount: 0 }]);
    };

    const removeRow = (index: number) => {
        const newRows = [...formRows];
        newRows.splice(index, 1);
        setFormRows(newRows);
    };

    const updateRow = (index: number, field: 'gl_head_id' | 'amount', value: any) => {
        const newRows = [...formRows];
        // @ts-ignore
        newRows[index][field] = value;
        setFormRows(newRows);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Fee Structures</h1>
                <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Create Structure
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {structures.map((st) => (
                        <div key={st.id} className="rounded-xl border bg-card text-card-foreground shadow">
                            <div className="flex flex-col space-y-1.5 p-6">
                                <h3 className="font-semibold leading-none tracking-tight flex justify-between">
                                    {st.name}
                                    <div className="flex gap-2">
                                        {st.class_name && <span className="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground self-center">{st.class_name}</span>}
                                        <span className="text-sm font-normal text-muted-foreground"> NPR {st.amount}</span>
                                    </div>
                                </h3>
                            </div>
                            <div className="p-6 pt-0 text-sm text-muted-foreground">
                                <ul className="list-disc pl-4 space-y-1">
                                    {st.items?.map(item => (
                                        <li key={item.id} className="flex justify-between">
                                            <span>{item.gl_head?.name}</span>
                                            <span>{item.amount}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                    {structures.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-10">
                            No fee structures defined.
                        </div>
                    )}
                </div>
            )}

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-lg font-semibold mb-4">New Fee Structure</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Structure Name</label>
                                <input name="name" required placeholder="e.g. Nursery Tuition" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
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
                                <label className="text-sm font-medium">Class</label>
                                <select name="class_name" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                                    <option value="">Select Class (Optional)</option>
                                    <option value="PG">PG</option>
                                    <option value="Nursery">Nursery</option>
                                    <option value="LKG">LKG</option>
                                    <option value="UKG">UKG</option>
                                    <option value="Graduate">Graduate</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fee Components (GL Mapping)</label>
                                <div className="space-y-2 border rounded-md p-3 max-h-60 overflow-y-auto">
                                    {formRows.map((row, index) => (
                                        <div key={index} className="flex gap-2 items-end">
                                            <div className="flex-1 space-y-1">
                                                <span className="text-xs text-muted-foreground">Income GL Head</span>
                                                <select
                                                    value={row.gl_head_id}
                                                    onChange={(e) => updateRow(index, 'gl_head_id', e.target.value)}
                                                    required
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                >
                                                    <option value="">Select Head</option>
                                                    {(() => {
                                                        const getHeadsByParent = (parentId: string | null) => glHeads.filter(h => h.parent_id === parentId);

                                                        const renderHierarchy = (parentId: string | null = null, level = 0): React.ReactNode => {
                                                            const heads = getHeadsByParent(parentId);
                                                            return heads.map(h => (
                                                                <React.Fragment key={h.id}>
                                                                    <option value={h.id}>
                                                                        {'\u00A0'.repeat(level * 4) + h.name}
                                                                    </option>
                                                                    {renderHierarchy(h.id, level + 1)}
                                                                </React.Fragment>
                                                            ));
                                                        };

                                                        return renderHierarchy(null);
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
                                <div className="text-right text-sm font-medium">
                                    Total: {formRows.reduce((s, r) => s + r.amount, 0)}
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
