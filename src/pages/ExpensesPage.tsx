import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { getExpenses, createExpense, getGLHeads, getFiscalYears } from '@/lib/api';
import { type Expense, type GLHead, type FiscalYear } from '@/types';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form Data
    const [expenseHeads, setExpenseHeads] = useState<GLHead[]>([]);
    const [assetHeads, setAssetHeads] = useState<GLHead[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);

    // Filters
    const [selectedHeadFilter, setSelectedHeadFilter] = useState('');

    const fetchData = async () => {
        try {
            const [expData, glData, fyData] = await Promise.all([
                getExpenses(),
                getGLHeads(),
                getFiscalYears()
            ]);
            setExpenses(expData);
            setExpenseHeads(glData.filter(h => h.type === 'Expense'));
            setAssetHeads(glData.filter(h => h.type === 'Asset'));
            setFiscalYears(fyData.filter(fy => fy.is_active));
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

        const newExpense = {
            fiscal_year_id: formData.get('fiscal_year_id') as string,
            expense_head_id: formData.get('expense_head_id') as string,
            payment_mode_gl_id: formData.get('payment_mode_gl_id') as string,
            amount: Number(formData.get('amount')),
            expense_date: formData.get('expense_date') as string,
            description: formData.get('description') as string,
        };

        try {
            await createExpense(newExpense);
            setIsDialogOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error creating expense:', error);
        }
    };

    const renderGLOptions = (heads: GLHead[]) => {
        // Find IDs that are parents
        const parentIds = new Set(heads.map(h => h.parent_id).filter((id): id is string => !!id));
        const isParent = (id: string) => parentIds.has(id);

        // Filter Categories (nodes that are parents to others in this list)
        const categories = heads.filter(h => isParent(h.id));

        return (
            <>
                {categories.map(cat => (
                    <optgroup key={cat.id} label={cat.name}>
                        {heads
                            .filter(h => h.parent_id === cat.id)
                            .map(child => (
                                <option key={child.id} value={child.id}>{child.name}</option>
                            ))
                        }
                    </optgroup>
                ))}

                {/* Items that don't belong to any of the *visible* categories (Orphans/Top Leaves) */}
                {heads.filter(h => !h.parent_id && !isParent(h.id)).map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                ))}
            </>
        );
    };

    const filteredExpenses = expenses.filter(exp =>
        selectedHeadFilter ? exp.expense_head_id === selectedHeadFilter : true
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>

                <div className="flex items-center gap-2">
                    <select
                        value={selectedHeadFilter}
                        onChange={(e) => setSelectedHeadFilter(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="">All Expense Heads</option>
                        {renderGLOptions(expenseHeads)}
                    </select>

                    <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                        <Plus className="mr-2 h-4 w-4" /> Add Expense
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-md border bg-card">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Expense Head</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Paid Via</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map((exp) => (
                                <tr key={exp.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">{exp.expense_date}</td>
                                    <td className="p-4 align-middle font-medium">{exp.expense_head?.name}</td>
                                    <td className="p-4 align-middle">{exp.description}</td>
                                    <td className="p-4 align-middle">{exp.payment_mode?.name}</td>
                                    <td className="p-4 align-middle text-right">{exp.amount}</td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No expenses recorded.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold mb-4">Record Expense</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fiscal Year</label>
                                <select name="fiscal_year_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    {fiscalYears.map(fy => (
                                        <option key={fy.id} value={fy.id}>{fy.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Expense Head</label>
                                <select name="expense_head_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="">Select Expense Type</option>
                                    {renderGLOptions(expenseHeads)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount</label>
                                <input type="number" name="amount" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date</label>
                                <input type="date" name="expense_date" required defaultValue={new Date().toISOString().split('T')[0]} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Mode (Paid From)</label>
                                <select name="payment_mode_gl_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="">Select Asset (Cash/Bank)</option>
                                    {renderGLOptions(assetHeads)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea name="description" className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Save Expense</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
