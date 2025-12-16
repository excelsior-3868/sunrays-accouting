
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, PlusCircle, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
    getSalaryStructures, createSalaryStructure, updateSalaryStructure, deleteSalaryStructure,
    getFiscalYears, getGLHeads, getStaffMembers, getTeachers
} from '@/lib/api';
import { type SalaryStructure, type FiscalYear, type GLHead, type SalaryStructureItem } from '@/types';
import { Loader2 } from 'lucide-react';

export default function SalaryStructuresPage() {
    const { toast } = useToast();
    const [structures, setStructures] = useState<SalaryStructure[]>([]);
    const [loading, setLoading] = useState(true);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [glHeads, setGlHeads] = useState<GLHead[]>([]);
    const [employees, setEmployees] = useState<{ id: string, name: string, role: string }[]>([]);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        employee_id: '',
        fiscal_year_id: '',
        items: [] as Omit<SalaryStructureItem, 'id' | 'structure_id' | 'created_at'>[],
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [structs, fys, heads, staff, teachers] = await Promise.all([
                getSalaryStructures(),
                getFiscalYears(),
                getGLHeads(),
                getStaffMembers(),
                getTeachers()
            ]);
            setStructures(structs);
            setFiscalYears(fys);

            // Filter heads: Expense for Earnings, Liability (or specific payables) for Deductions? 
            // Usually Earnings are Expenses for the company. Deductions are Liabilities (Tax Payable) or just negative.
            // For simplicity, let's load all or just Expense/Liability.
            setGlHeads(heads);

            // Combine employees
            const allEmployees = [
                ...staff.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, role: 'Staff' })),
                ...teachers.map(t => ({ id: t.id, name: `${t.first_name} ${t.last_name}`, role: 'Teacher' }))
            ];
            setEmployees(allEmployees);

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            employee_id: '',
            fiscal_year_id: fiscalYears.find(fy => fy.is_active)?.id || '',
            items: []
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (structure: SalaryStructure) => {
        setEditingId(structure.id);
        setFormData({
            employee_id: structure.employee_id,
            fiscal_year_id: structure.fiscal_year_id,
            items: structure.items?.map(i => ({
                gl_head_id: i.gl_head_id,
                amount: i.amount,
                type: i.type
            })) || []
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Salary Structure?')) return;
        try {
            await deleteSalaryStructure(id);
            toast({ title: "Success", description: "Salary Structure deleted" });
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete" });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const employeeName = employees.find(e => e.id === formData.employee_id)?.name || 'Unknown';

        const payload = {
            employee_id: formData.employee_id,
            employee_name: employeeName,
            fiscal_year_id: formData.fiscal_year_id,
            items: formData.items
        };

        try {
            if (editingId) {
                // Remove items from payload for the 'structure' argument, pass distinct items array as third argument
                const { items: itemsList, ...structureData } = payload;
                await updateSalaryStructure(editingId, structureData, itemsList);
                toast({ title: "Success", description: "Updated successfully" });
            } else {
                // Split payload into structure and items
                const { items: itemsList, ...structureData } = payload;
                await createSalaryStructure(structureData, itemsList);
                toast({ title: "Success", description: "Created successfully" });
            }
            setIsDialogOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save" });
        }
    };

    // Form Field Helpers
    const updateItem = (index: number, field: keyof typeof formData.items[0], value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { gl_head_id: glHeads[0]?.id || '', amount: 0, type: 'Earning' }]
        });
    };

    const removeItem = (index: number) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const calculateNet = (items: typeof formData.items) => {
        return items.reduce((acc, item) => {
            if (item.type === 'Earning') return acc + (Number(item.amount) || 0);
            if (item.type === 'Deduction') return acc - (Number(item.amount) || 0);
            return acc;
        }, 0);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Salary Structures</h1>
                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" /> Define Salary
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {structures.map(struct => {
                    const totalEarnings = struct.items?.filter(i => i.type === 'Earning').reduce((sum, i) => sum + i.amount, 0) || 0;
                    const totalDeductions = struct.items?.filter(i => i.type === 'Deduction').reduce((sum, i) => sum + i.amount, 0) || 0;

                    return (
                        <div key={struct.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                            <div className="p-6 flex flex-col gap-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-muted p-2 rounded-full">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold leading-none tracking-tight">{struct.employee_name}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {fiscalYears.find(fy => fy.id === struct.fiscal_year_id)?.name}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Base Earnings:</span>
                                        <span className="font-medium text-green-600">{totalEarnings.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Deductions:</span>
                                        <span className="font-medium text-red-600">-{totalDeductions.toLocaleString()}</span>
                                    </div>
                                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                        <span>Net Salary</span>
                                        <span>{(totalEarnings - totalDeductions).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                    <button onClick={() => handleEdit(struct)} className="p-2 hover:bg-muted rounded-md text-blue-600">
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(struct.id)} className="p-2 hover:bg-muted rounded-md text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold">{editingId ? 'Edit Salary Structure' : 'New Salary Structure'}</h2>
                            <button onClick={() => setIsDialogOpen(false)}><X className="h-5 w-5" /></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Employee</label>
                                    <select
                                        required
                                        value={formData.employee_id}
                                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        disabled={!!editingId} // Usually can't change employee for existing structure
                                    >
                                        <option value="">Select Employee...</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fiscal Year</label>
                                    <select
                                        required
                                        value={formData.fiscal_year_id}
                                        onChange={(e) => setFormData({ ...formData, fiscal_year_id: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="">Select Year...</option>
                                        {fiscalYears.map(fy => <option key={fy.id} value={fy.id}>{fy.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">Structure Components</label>
                                    <button type="button" onClick={addItem} className="text-sm flex items-center text-primary hover:underline">
                                        <PlusCircle className="h-4 w-4 mr-1" /> Add Component
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <select
                                                value={item.type}
                                                onChange={(e) => updateItem(index, 'type', e.target.value)}
                                                className="w-32 h-9 rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                <option value="Earning">Earning</option>
                                                <option value="Deduction">Deduction</option>
                                            </select>
                                            <select
                                                value={item.gl_head_id}
                                                onChange={(e) => updateItem(index, 'gl_head_id', e.target.value)}
                                                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                {glHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                            </select>
                                            <input
                                                type="number"
                                                value={item.amount}
                                                onChange={(e) => updateItem(index, 'amount', e.target.value)}
                                                className="w-24 h-9 rounded-md border border-input bg-background px-3 text-sm"
                                                placeholder="Amount"
                                            />
                                            <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No components added.</p>}
                                </div>

                                <div className="flex justify-end gap-6 font-medium text-sm">
                                    <div className="text-green-600">Total Earnings: {formData.items.filter(i => i.type === 'Earning').reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString()}</div>
                                    <div className="text-red-600">Total Deductions: {formData.items.filter(i => i.type === 'Deduction').reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString()}</div>
                                    <div className="text-foreground border-l pl-4 font-bold">Net Salary: {calculateNet(formData.items).toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Save Structure</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
