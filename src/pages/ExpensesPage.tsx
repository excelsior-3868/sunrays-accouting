import { useEffect, useState } from 'react';
import { Plus, Loader2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getExpenses, createExpense, getGLHeads, getFiscalYears } from '@/lib/api';
import { type Expense, type GLHead, type FiscalYear } from '@/types';
import SearchableSelect from '@/components/SearchableSelect';
import { usePermission } from '@/hooks/usePermission';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import NepaliDatePicker from '@/components/NepaliDatePicker';
import { toNepali } from '@/lib/nepaliDate';

export default function ExpensesPage() {
    const { can } = usePermission();
    const { toast } = useToast();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

    // Form Data
    const [expenseHeads, setExpenseHeads] = useState<GLHead[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);

    // Filters
    const [selectedHeadFilter, setSelectedHeadFilter] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50); // Show 50 items per page

    const fetchData = async () => {
        try {
            const [expData, glData, fyData] = await Promise.all([
                getExpenses(),
                getGLHeads(),
                getFiscalYears()
            ]);
            setExpenses(expData);
            setExpenseHeads(glData.filter(h => h.type === 'Expense'));
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
        payment_method: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: ''
    });

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!can('expenses.manage')) return;

        setIsConfirmDialogOpen(true);
    };

    const handleConfirmPost = async () => {
        try {
            const activeFyId = fiscalYears.find(fy => fy.is_active)?.id;
            if (!activeFyId) {
                toast({ variant: "destructive", title: "Error", description: "No active fiscal year found." });
                return;
            }

            await createExpense({
                fiscal_year_id: activeFyId,
                expense_head_id: newExpenseState.expense_head_id,
                payment_method: newExpenseState.payment_method,
                amount: Number(newExpenseState.amount),
                expense_date: newExpenseState.expense_date,
                description: newExpenseState.description,
            });
            setIsConfirmDialogOpen(false);
            setIsDialogOpen(false);
            // Reset form
            setNewExpenseState(prev => ({ ...prev, amount: '', description: '' }));
            fetchData();
            toast({ title: "Success", description: "Expense recorded successfully" });
        } catch (error) {
            console.error('Error creating expense:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to create expense" });
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

    const filteredExpenses = expenses.filter(exp =>
        selectedHeadFilter ? exp.expense_head_id === selectedHeadFilter : true
    );

    // Pagination calculations
    const totalItems = filteredExpenses.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

    // Reset to page 1 when filter changes
    const handleFilterChange = (val: string) => {
        setSelectedHeadFilter(val);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
                {can('expenses.manage') && (
                    <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                        <Plus className="mr-2 h-4 w-4" /> Add Expense
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-lg border justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>
                    <div className="w-[300px]">
                        <SearchableSelect
                            options={[
                                { value: '', label: 'All Expense Heads', group: 'Filter' },
                                ...expenseOptions
                            ]}
                            value={selectedHeadFilter}
                            onChange={handleFilterChange}
                            placeholder="Search Expense Heads..."
                        />
                    </div>
                </div>

                {/* Total Amount Display */}
                <div className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-md">
                    <span className="text-sm font-medium text-white">
                        {selectedHeadFilter
                            ? `${expenseOptions.find(opt => opt.value === selectedHeadFilter)?.label || 'Selected'} Total:`
                            : 'Total Expenses:'}
                    </span>
                    <span className="text-lg font-bold text-white">
                        NPR {filteredExpenses
                            .reduce((sum, expense) => sum + expense.amount, 0)
                            .toLocaleString()}
                    </span>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-lg border bg-card overflow-x-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-blue-600 text-primary-foreground hover:bg-blue-600/90">
                                <th className="h-12 px-4 text-left align-middle font-medium">Date (BS)</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Date (AD)</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Expense Head</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Remarks</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Payment Mode</th>
                                <th className="h-12 px-4 text-right align-middle font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedExpenses.map((exp) => (
                                <tr key={exp.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">{toNepali(exp.expense_date)}</td>
                                    <td className="p-4 align-middle text-muted-foreground">{new Date(exp.expense_date).toLocaleDateString('en-GB')}</td>
                                    <td className="p-4 align-middle font-medium">{exp.expense_head?.name}</td>
                                    <td className="p-4 align-middle">{exp.description}</td>
                                    <td className="p-4 align-middle">{exp.payment_method || exp.payment_mode?.name}</td>
                                    <td className="p-4 align-middle text-right font-semibold">NPR {exp.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                            {paginatedExpenses.length === 0 && (
                                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No expenses found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-card border rounded-lg">
                    <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="inline-flex items-center justify-center h-8 w-8 rounded border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    // Show first, last, current, and adjacent pages
                                    return page === 1 ||
                                        page === totalPages ||
                                        Math.abs(page - currentPage) <= 1;
                                })
                                .map((page, index, array) => (
                                    <div key={page} className="flex items-center">
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="px-2 text-muted-foreground">...</span>
                                        )}
                                        <button
                                            onClick={() => setCurrentPage(page)}
                                            className={`inline-flex items-center justify-center h-8 w-8 rounded border ${currentPage === page
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-background hover:bg-accent'
                                                }`}
                                        >
                                            {page}
                                        </button>
                                    </div>
                                ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="inline-flex items-center justify-center h-8 w-8 rounded border bg-background hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold mb-4">Record Expense</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fiscal Year</label>
                                <input
                                    type="text"
                                    disabled
                                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-100" // opacity-100 to ensure readability
                                    value={fiscalYears.find(fy => fy.is_active)?.name || 'No Active FY'}
                                />
                                <input type="hidden" name="fiscal_year_id" value={fiscalYears.find(fy => fy.is_active)?.id || ''} />
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
                                <label className="text-sm font-medium">Date (BS)</label>
                                <NepaliDatePicker
                                    value={newExpenseState.expense_date}
                                    onChange={(adDate) => setNewExpenseState({ ...newExpenseState, expense_date: adDate })}
                                    placeholder="Select Expense Date"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Mode (Paid From)</label>
                                <SearchableSelect
                                    options={[
                                        { value: 'Cash', label: 'Cash', group: 'Methods' },
                                        { value: 'Bank Account', label: 'Bank Account', group: 'Methods' },
                                        { value: 'Digital Payment', label: 'Digital Payment', group: 'Methods' },
                                        { value: 'Cheque', label: 'Cheque', group: 'Methods' },
                                    ]}
                                    value={newExpenseState.payment_method}
                                    onChange={(val) => setNewExpenseState({ ...newExpenseState, payment_method: val })}
                                    placeholder="Select Payment Mode..."
                                />
                                <input type="hidden" name="payment_method" value={newExpenseState.payment_method} required />
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

            <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Expense Details</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please review the expense details before posting.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-2 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-semibold text-muted-foreground">Date:</span>
                            <span className="col-span-2">{toNepali(newExpenseState.expense_date)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-semibold text-muted-foreground">Head:</span>
                            <span className="col-span-2">
                                {expenseHeads.find(h => h.id === newExpenseState.expense_head_id)?.name || 'Unknown'}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-semibold text-muted-foreground">Paid Via:</span>
                            <span className="col-span-2">
                                {newExpenseState.payment_method || 'Unknown'}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-semibold text-muted-foreground">Amount:</span>
                            <span className="col-span-2 font-bold text-red-600">NPR {Number(newExpenseState.amount).toLocaleString()}</span>
                        </div>
                        {newExpenseState.description && (
                            <div className="grid grid-cols-3 gap-2">
                                <span className="font-semibold text-muted-foreground">Note:</span>
                                <span className="col-span-2 italic">{newExpenseState.description}</span>
                            </div>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmPost} className="bg-primary hover:bg-primary/90">
                            Confirm & Post
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
