import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { getExpenses, createExpense, getGLHeads, getFiscalYears } from '@/lib/api';
import { type Expense, type GLHead, type FiscalYear } from '@/types';
import SearchableSelect from '@/components/SearchableSelect';

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

    const [newExpenseState, setNewExpenseState] = useState({
        fiscal_year_id: '',
        expense_head_id: '',
        payment_mode_gl_id: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: ''
    });

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            await createExpense({
                fiscal_year_id: newExpenseState.fiscal_year_id,
                expense_head_id: newExpenseState.expense_head_id,
                payment_mode_gl_id: newExpenseState.payment_mode_gl_id,
                amount: Number(newExpenseState.amount),
                expense_date: newExpenseState.expense_date,
                description: newExpenseState.description,
            });
            setIsDialogOpen(false);
            // Reset form
            setNewExpenseState(prev => ({ ...prev, amount: '', description: '' }));
            fetchData();
        } catch (error) {
            console.error('Error creating expense:', error);
        }
    };

    const getOptionsFromHeads = (heads: GLHead[]) => {
        // Map Heads to Options with Groups
        // First find Map of ID -> Name for parents
        const headMap = new Map(heads.map(h => [h.id, h.name]));

        return heads.map(h => {
            // If it has a parent_id, map usage group name. If no parent, it's 'General' or similar unless it is a parent itself
            let group = 'Other';
            if (h.parent_id && headMap.has(h.parent_id)) {
                group = headMap.get(h.parent_id) || 'Other';
            } else if (!h.parent_id) {
                group = 'Main Categories';
            }

            return {
                value: h.id,
                label: h.name,
                group: group
            };
        }).sort((a, b) => a.group.localeCompare(b.group));
    };

    const expenseOptions = getOptionsFromHeads(expenseHeads);
    // Explicit sort to ensure consistent display
    expenseOptions.sort((a, b) => {
        if (a.group === b.group) return a.label.localeCompare(b.label);
        return a.group.localeCompare(b.group);
    });

    const assetOptions = getOptionsFromHeads(assetHeads);

    const filteredExpenses = expenses.filter(exp =>
        selectedHeadFilter ? exp.expense_head_id === selectedHeadFilter : true
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>

                <div className="flex items-center gap-2">
                    <div className="w-[300px]">
                        <SearchableSelect
                            options={[{ value: '', label: 'All Expense Heads', group: 'Filter' }, ...expenseOptions]}
                            value={selectedHeadFilter}
                            onChange={(val) => setSelectedHeadFilter(val)}
                            placeholder="Search Expense Heads..."
                        />
                    </div>

                    <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                        <Plus className="mr-2 h-4 w-4" /> Add Expense
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-primary text-primary-foreground hover:bg-primary/90">
                                <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Expense Head</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Paid Via</th>
                                <th className="h-12 px-4 text-right align-middle font-medium">Amount</th>
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
                                <select
                                    name="fiscal_year_id"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newExpenseState.fiscal_year_id}
                                    onChange={e => setNewExpenseState({ ...newExpenseState, fiscal_year_id: e.target.value })}
                                >
                                    <option value="">Select FY</option>
                                    {fiscalYears.map(fy => (
                                        <option key={fy.id} value={fy.id}>{fy.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Expense Head</label>
                                <SearchableSelect
                                    options={expenseOptions}
                                    value={newExpenseState.expense_head_id}
                                    onChange={(val) => setNewExpenseState({ ...newExpenseState, expense_head_id: val })}
                                    placeholder="Select Expense Type..."
                                />
                                <input type="hidden" name="expense_head_id" value={newExpenseState.expense_head_id} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount</label>
                                <input
                                    type="number"
                                    name="amount"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newExpenseState.amount}
                                    onChange={e => setNewExpenseState({ ...newExpenseState, amount: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date</label>
                                <input
                                    type="date"
                                    name="expense_date"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newExpenseState.expense_date}
                                    onChange={e => setNewExpenseState({ ...newExpenseState, expense_date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Mode (Paid From)</label>
                                <SearchableSelect
                                    options={assetOptions}
                                    value={newExpenseState.payment_mode_gl_id}
                                    onChange={(val) => setNewExpenseState({ ...newExpenseState, payment_mode_gl_id: val })}
                                    placeholder="Select Asset (Cash/Bank)..."
                                />
                                <input type="hidden" name="payment_mode_gl_id" value={newExpenseState.payment_mode_gl_id} required />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    name="description"
                                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={newExpenseState.description}
                                    onChange={e => setNewExpenseState({ ...newExpenseState, description: e.target.value })}
                                />
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
