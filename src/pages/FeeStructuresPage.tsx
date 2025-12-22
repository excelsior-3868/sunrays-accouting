
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, PlusCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure, getFiscalYears, getGLHeads } from '@/lib/api';
import { type FeeStructure, type FiscalYear, type GLHead, type FeeStructureItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function FeeStructuresPage() {
    const { toast } = useToast();
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [loading, setLoading] = useState(true);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [glHeads, setGlHeads] = useState<GLHead[]>([]);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        fiscal_year_id: '',
        class_name: '',
        amount: 0,
        items: [] as Omit<FeeStructureItem, 'id' | 'structure_id' | 'created_at'>[],
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [structs, fys, heads] = await Promise.all([
                getFeeStructures(),
                getFiscalYears(),
                getGLHeads()
            ]);
            setStructures(structs);
            setFiscalYears(fys);
            setGlHeads(heads.filter(h => h.type === 'Income')); // Filter only income heads
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
            name: '',
            fiscal_year_id: fiscalYears.find(fy => fy.is_active)?.id || '',
            class_name: 'Play Group', // Default
            amount: 0,
            items: []
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (structure: FeeStructure) => {
        setEditingId(structure.id);
        setFormData({
            name: structure.name,
            fiscal_year_id: structure.fiscal_year_id,
            class_name: structure.class_name || '',
            amount: structure.amount,
            // Map items for form
            items: structure.items?.map(i => ({
                gl_head_id: i.gl_head_id,
                amount: i.amount
            })) || []
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Fee Structure?')) return;
        try {
            await deleteFeeStructure(id);
            toast({ title: "Success", description: "Fee Structure deleted" });
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete" });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Calculate total amount from items
        const totalAmount = formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        const structureData = {
            name: formData.name,
            fiscal_year_id: formData.fiscal_year_id,
            class_name: formData.class_name,
            amount: totalAmount
        };
        const itemsData = formData.items;

        try {
            if (editingId) {
                await updateFeeStructure(editingId, structureData, itemsData);
                toast({ title: "Success", description: "Updated successfully" });
            } else {
                await createFeeStructure(structureData, itemsData);
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
            items: [...formData.items, { gl_head_id: glHeads[0]?.id || '', amount: 0 }]
        });
    };

    const removeItem = (index: number) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    const allowedClasses = ['Play Group', 'Nursery', 'LKG', 'UKG'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Fee Structures</h1>
                <Button
                    onClick={handleOpenCreate}
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Fee Structure
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {structures.map(struct => (
                    <div key={struct.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-6 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-semibold leading-none tracking-tight">{struct.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{struct.class_name}</p>
                                </div>
                                <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                                    {fiscalYears.find(fy => fy.id === struct.fiscal_year_id)?.name}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {struct.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{item.gl_head?.name}</span>
                                        <span className="font-medium">{item.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>{struct.amount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(struct)} className="p-2 hover:bg-muted rounded-md text-blue-600">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(struct.id)} className="p-2 hover:bg-muted rounded-md text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold">{editingId ? 'Edit Fee Structure' : 'New Fee Structure'}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)}><X className="h-5 w-5" /></Button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Structure Name</label>
                                    <input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        placeholder="e.g. Monthly Tuition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Class</label>
                                    <select
                                        value={formData.class_name}
                                        onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        {allowedClasses.map(c => <option key={c} value={c}>{c}</option>)}
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
                                    <label className="text-sm font-medium">Fee Items</label>
                                    <Button type="button" variant="ghost" onClick={addItem} className="text-sm flex items-center text-primary hover:underline">
                                        <PlusCircle className="h-4 w-4 mr-1" /> Add Item
                                    </Button>
                                </div>

                                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-2">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-center">
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
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {formData.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No items added.</p>}
                                </div>

                                <div className="text-right font-medium">
                                    Total: {formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0).toLocaleString()}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Save Structure</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
