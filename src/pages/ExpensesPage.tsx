import { useEffect, useState } from 'react';
import { Plus, Loader2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getExpenses, createExpense, getGLHeads, getFiscalYears } from '@/lib/api';
import { type Expense, type GLHead, type FiscalYear } from '@/types';
import SearchableSelect from '@/components/SearchableSelect';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
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
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold tracking-tight text-blue-600">Expenses</h1>
                    {can('expenses.manage') && (
                        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto font-bold bg-green-600 hover:bg-green-700 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Add Expense
                        </Button>
                    )}
                </div>

                <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-medium text-muted-foreground uppercase ml-1 flex items-center gap-1">
                                <Filter className="h-3 w-3" /> Filter by Head
                            </label>
                            <SearchableSelect
                                options={[
                                    { value: '', label: 'All Expense Heads', group: 'Filter' },
                                    ...expenseOptions
                                ]}
                                value={selectedHeadFilter}
                                onChange={handleFilterChange}
                                placeholder="Search Expense Heads..."
                                className="w-full"
                            />
                        </div>

                        {/* Grand Total Display */}
                        <div className="flex items-center justify-between md:justify-end gap-3 bg-red-600 p-3 rounded-lg md:min-w-[240px]">
                            <span className="text-xs font-bold text-white uppercase tracking-wider opacity-90">
                                {selectedHeadFilter
                                    ? `${expenseOptions.find(opt => opt.value === selectedHeadFilter)?.label || 'Selected'} Total`
                                    : 'Total Expenses'}
                            </span>
                            <span className="text-lg font-black text-white whitespace-nowrap">
                                NPR {filteredExpenses
                                    .reduce((sum, expense) => sum + expense.amount, 0)
                                    .toLocaleString()}
                            </span>
                        </div>

                        {/* Main action moved to top-level header for consistency */}
                    </div>
                </div>

            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="space-y-4">
                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {paginatedExpenses.map((exp) => (
                            <div key={exp.id} className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="text-lg font-bold text-red-600">NPR {exp.amount.toLocaleString()}</div>
                                        <div className="font-medium text-sm">{exp.expense_head?.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-muted-foreground">{toNepali(exp.expense_date)}</div>
                                        <div className="text-[10px] text-muted-foreground">{new Date(exp.expense_date).toLocaleDateString('en-GB')}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Paid Via</span>
                                        <div className="text-xs font-medium">{exp.payment_method || exp.payment_mode?.name || '-'}</div>
                                    </div>
                                    <div className="space-y-0.5 text-right">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold text-right block">Fiscal Year</span>
                                        <div className="text-xs font-medium">{fiscalYears.find(fy => fy.is_active)?.name || '-'}</div>
                                    </div>
                                </div>

                                {exp.description && (
                                    <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded italic">
                                        {exp.description}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-lg border bg-card overflow-x-auto">
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
                            </tbody>
                        </table>
                    </div>

                    {paginatedExpenses.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground border rounded-lg bg-card">No expenses found.</div>
                    )}
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-card border rounded-lg">
                    <div className="text-sm text-muted-foreground order-2 sm:order-1">
                        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems}
                    </div>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                                    if (isMobile) {
                                        return page === 1 || page === totalPages || page === currentPage;
                                    }
                                    return page === 1 ||
                                        page === totalPages ||
                                        Math.abs(page - currentPage) <= 1;
                                })
                                .map((page, index, array) => (
                                    <div key={page} className="flex items-center">
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="px-1 text-muted-foreground text-xs">...</span>
                                        )}
                                        <Button
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="icon"
                                            onClick={() => setCurrentPage(page)}
                                            className="h-8 w-8 text-xs"
                                        >
                                            {page}
                                        </Button>
                                    </div>
                                ))}
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-lg font-bold text-blue-600 uppercase tracking-widest mb-4">Record Expense</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Fiscal Year</label>
                                <input
                                    type="text"
                                    disabled
                                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-100 shadow-sm"
                                    value={fiscalYears.find(fy => fy.is_active)?.name || 'No Active FY'}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Expense Head *</label>
                                <SearchableSelect
                                    options={expenseOptions}
                                    value={newExpenseState.expense_head_id}
                                    onChange={(val) => setNewExpenseState({ ...newExpenseState, expense_head_id: val })}
                                    placeholder="Select Expense Type..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Amount (NPR) *</label>
                                <input
                                    type="number"
                                    name="amount"
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    placeholder="0.00"
                                    value={newExpenseState.amount}
                                    onChange={e => setNewExpenseState({ ...newExpenseState, amount: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Date (BS)</label>
                                <NepaliDatePicker
                                    value={newExpenseState.expense_date}
                                    onChange={(adDate) => setNewExpenseState({ ...newExpenseState, expense_date: adDate })}
                                    placeholder="Select Expense Date"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Payment Mode *</label>
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
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Description</label>
                                <textarea
                                    name="description"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    placeholder="Additional details..."
                                    value={newExpenseState.description}
                                    onChange={e => setNewExpenseState({ ...newExpenseState, description: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                                <Button type="submit" className="w-full sm:w-auto font-bold bg-blue-600 hover:bg-blue-700 text-white">Save Expense</Button>
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
