import React, { useEffect, useState } from 'react';
import { Plus, Trash, Loader2, Pencil, X } from 'lucide-react';
import { getFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure, getGLHeads, getFiscalYears } from '@/lib/api';
import { type FeeStructure, type GLHead, type FiscalYear } from '@/types';

export default function FeeStructuresPage() {
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [glHeads, setGlHeads] = useState<GLHead[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

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

    const handleCreateOrUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const totalAmount = formRows.reduce((sum, row) => sum + row.amount, 0);

        const commonData = {
            name: formData.get('name') as string,
            fiscal_year_id: formData.get('fiscal_year_id') as string,
            class_name: formData.get('class_name') as string || undefined,
            amount: totalAmount,
        };

        try {
            if (editingStructure) {
                // For update, we only update the fee structure properties, not items for now to keep it simple
                // Or we can warn user that items update is not supported yet in this simple edit
                // Actually, let's just update the structure info (name, class).
                await updateFeeStructure(editingStructure.id, {
                    param_name: commonData.name,
                    class_name: commonData.class_name,
                    // fiscal_year and amount are derived from items/setup, let's allow class update mainly
                } as any); // using any to bypass slight type mismatch if strict

                // Improve: To support full update, we'd need to delete old items and re-create.
                // For this specific bug fix (missing class), we prioritize updating the class.
                await updateFeeStructure(editingStructure.id, commonData);
            } else {
                const items = formRows.map(row => ({
                    gl_head_id: row.gl_head_id,
                    amount: row.amount
                }));
                await createFeeStructure(commonData, items);
            }

            setIsDialogOpen(false);
            setEditingStructure(null);
            setFormRows([{ gl_head_id: '', amount: 0 }]); // Reset
            fetchData();
        } catch (error) {
            console.error('Error saving fee structure:', error);
            alert('Failed to save fee structure');
        }
    };

    const startEdit = (st: FeeStructure) => {
        setEditingStructure(st);
        // Pre-fill logic would be complex for rows, so for now let's only allow editing metadata
        // or just re-populate rows.
        // Simplified: Just populate basics for the Class Name fix.
        if (st.items) {
            setFormRows(st.items.map(i => ({ gl_head_id: i.gl_head_id, amount: i.amount })));
        }
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this fee structure?')) return;
        try {
            await deleteFeeStructure(id);
            fetchData();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Failed to delete fee structure');
        }
    };

    // Helper to reset form when opening "Create"
    const openCreate = () => {
        setEditingStructure(null);
        setFormRows([{ gl_head_id: '', amount: 0 }]);
        setIsDialogOpen(true);
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
                <button onClick={openCreate} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Create Structure
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {structures.map((st) => (
                        <div key={st.id} className="rounded-xl border bg-card text-card-foreground shadow relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button
                                    onClick={() => startEdit(st)}
                                    className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
                                    title="Edit"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(st.id)}
                                    className="p-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                                    title="Delete"
                                >
                                    <Trash className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex flex-col space-y-1.5 p-6">
                                <h3 className="font-semibold leading-none tracking-tight flex justify-between pr-16 text-lg">
                                    {st.name}
                                </h3>
                                <div className="flex gap-2 mt-2">
                                    {st.class_name ? (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-medium">{st.class_name}</span>
                                    ) : (
                                        <span className="text-xs bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-medium">No Class</span>
                                    )}
                                    <span className="text-sm font-medium text-muted-foreground">NPR {st.amount}</span>
                                </div>
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
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">{editingStructure ? 'Edit Fee Structure' : 'New Fee Structure'}</h3>
                            <button onClick={() => setIsDialogOpen(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
                        </div>
                        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Structure Name</label>
                                <input
                                    name="name"
                                    required
                                    defaultValue={editingStructure?.name}
                                    placeholder="e.g. Nursery Tuition"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fiscal Year</label>
                                <select
                                    name="fiscal_year_id"
                                    required
                                    defaultValue={editingStructure?.fiscal_year_id}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    {fiscalYears.map(fy => (
                                        <option key={fy.id} value={fy.id}>{fy.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Class</label>
                                <select
                                    name="class_name"
                                    defaultValue={editingStructure?.class_name || ''}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">Select Class (Optional)</option>
                                    <option value="PG">PG</option>
                                    <option value="Nursery">Nursery</option>
                                    <option value="LKG">LKG</option>
                                    <option value="UKG">UKG</option>
                                    <option value="Graduate">Graduate</option>
                                </select>
                                <p className="text-xs text-muted-foreground">Required for Batch Invoice Generation</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fee Components (GL Mapping)</label>
                                {!editingStructure && (
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
                                )}
                                {editingStructure && (
                                    <div className="p-3 border rounded bg-muted/20 text-sm text-muted-foreground">
                                        Editing fee components is currently disabled. Please create a new structure for major component changes.
                                        You can still update the Name, Class, and Fiscal Year above.
                                    </div>
                                )}
                                {!editingStructure && (
                                    <div className="text-right text-sm font-medium">
                                        Total: {formRows.reduce((s, r) => s + r.amount, 0)}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                                    {editingStructure ? 'Update Structure' : 'Create Structure'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
