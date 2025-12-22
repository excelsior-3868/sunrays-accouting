import { useEffect, useState } from 'react';
import { Loader2, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getPayments, recordDirectIncome, getGLHeads, getFiscalYears, getInvoices } from '@/lib/api';
import { type Payment, type GLHead, type FiscalYear } from '@/types';
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

export default function IncomePage() {
    const { can } = usePermission();
    const [loading, setLoading] = useState(true);
    const [incomes, setIncomes] = useState<Payment[]>([]);
    const [invoiceIncomes, setInvoiceIncomes] = useState<any[]>([]); // For invoice-based income
    const [incomeHeads, setIncomeHeads] = useState<GLHead[]>([]);
    const [paymentModes, setPaymentModes] = useState<GLHead[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const { toast } = useToast();

    const [newIncomeState, setNewIncomeState] = useState({
        income_date: new Date().toISOString().split('T')[0],
        amount: '',
        income_head_id: '',
        payment_mode_gl_id: '',
        payment_method: 'Cash',
        fiscal_year_id: '',
        transaction_reference: '',
        remarks: ''
    });

    // Filter state
    const [selectedIncomeHeadFilter, setSelectedIncomeHeadFilter] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50); // Show 50 items per page

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [payments, glHeads, fyData, invoices] = await Promise.all([
                getPayments(),
                getGLHeads(),
                getFiscalYears(),
                getInvoices()
            ]);

            // Filter only direct income (payments without invoice_id)
            const directIncomes = payments.filter(p => !p.invoice_id);
            setIncomes(directIncomes);

            // Get invoice-based income (payments WITH invoice_id)
            const invoicePayments = payments.filter(p => p.invoice_id);

            // Create income records from invoice payments with their GL head breakdown
            const invoiceIncomeRecords = invoicePayments.flatMap(payment => {
                // @ts-ignore
                const invoice = invoices.find(inv => inv.id === payment.invoice_id);
                if (!invoice || !invoice.items) return [];

                // Each invoice item represents income to a specific GL head
                return invoice.items.map((item: any) => ({
                    id: `${payment.id}-${item.id}`,
                    payment_date: payment.payment_date,
                    income_head_id: item.gl_head_id,
                    income_head: item.gl_head,
                    amount: item.amount,
                    // @ts-ignore
                    remarks: `Fee Receipt - ${invoice.student_name} - ${invoice.month || 'N/A'}`,
                    payment_mode: payment.payment_mode,
                    isFromInvoice: true
                }));
            });

            setInvoiceIncomes(invoiceIncomeRecords);

            // Income Heads (type = Income)
            const incomeGLHeads = glHeads.filter(h => h.type === 'Income');
            setIncomeHeads(incomeGLHeads);

            // Payment Modes (type = Asset: Cash, Bank, etc.)
            const assetGLHeads = glHeads.filter(h => h.type === 'Asset');
            setPaymentModes(assetGLHeads);

            setFiscalYears(fyData);

            // Auto-select active fiscal year
            const activeFy = fyData.find(fy => fy.is_active);
            if (activeFy) {
                setNewIncomeState(prev => ({ ...prev, fiscal_year_id: activeFy.id }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load data." });
        } finally {
            setLoading(false);
        }
    };
    // Helper function to create grouped options for Income Heads
    const getIncomeHeadOptions = () => {
        const headMap = new Map(incomeHeads.map(h => [h.id, h.name]));

        // Get all income heads that are "leaf" nodes (actual recordable income types)
        // These are heads that have a parent, and that parent also has a parent
        // (i.e., they are grandchildren of the top "Income" node)
        return incomeHeads
            .filter(h => {
                if (!h.parent_id) return false; // Skip top-level "Income"
                const parent = incomeHeads.find(p => p.id === h.parent_id);
                return parent && parent.parent_id; // Parent must also have a parent
            })
            .map(h => {
                let group = 'Other';
                if (h.parent_id && headMap.has(h.parent_id)) {
                    group = headMap.get(h.parent_id) || 'Other';
                }

                return {
                    value: h.id,
                    label: h.name,
                    group: group
                };
            })
            .sort((a, b) => {
                if (a.group === b.group) return a.label.localeCompare(b.label);
                return a.group.localeCompare(b.group);
            });
    };

    const incomeHeadOptions = getIncomeHeadOptions();

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmDialog(true);
    };

    const handleConfirmPost = async () => {
        try {
            // Map selected payment method to GL Head ID
            let paymentHeadId = undefined;
            if (newIncomeState.payment_method) {
                if (newIncomeState.payment_method === 'Cash') {
                    paymentHeadId = paymentModes.find(h => h.name.toLowerCase().includes('cash'))?.id;
                } else {
                    paymentHeadId = paymentModes.find(h => h.name.toLowerCase().includes('bank'))?.id;
                }

                // Final Fallback
                if (!paymentHeadId && paymentModes.length > 0) {
                    paymentHeadId = paymentModes[0].id;
                }
            }

            if (!paymentHeadId) {
                toast({ variant: "destructive", title: "Error", description: "Could not map Payment Mode to a Ledger." });
                return;
            }

            await recordDirectIncome({
                income_head_id: newIncomeState.income_head_id,
                amount: parseFloat(newIncomeState.amount),
                payment_date: newIncomeState.income_date,
                payment_mode_gl_id: paymentHeadId,
                payment_method: newIncomeState.payment_method,
                fiscal_year_id: newIncomeState.fiscal_year_id,
                transaction_reference: newIncomeState.transaction_reference || undefined,
                remarks: newIncomeState.remarks || undefined
            });

            toast({ title: "Success", description: "Income recorded successfully" });
            setIsDialogOpen(false);
            setShowConfirmDialog(false);
            setNewIncomeState({
                income_date: new Date().toISOString().split('T')[0],
                amount: '',
                income_head_id: '',
                payment_mode_gl_id: '',
                payment_method: 'Cash',
                fiscal_year_id: newIncomeState.fiscal_year_id,
                transaction_reference: '',
                remarks: ''
            });
            fetchData();
        } catch (error) {
            console.error('Error creating income:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to record income." });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    // Combine both direct income and invoice-based income
    const allIncomeTransactions = [
        ...incomes.map(i => ({ ...i, isFromInvoice: false })),
        ...invoiceIncomes
    ].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

    // Filter transactions
    const filteredTransactions = allIncomeTransactions.filter(income =>
        selectedIncomeHeadFilter ? income.income_head_id === selectedIncomeHeadFilter : true
    );

    // Pagination calculations
    const totalItems = filteredTransactions.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    // Reset to page 1 when filter changes
    const handleFilterChange = (val: string) => {
        setSelectedIncomeHeadFilter(val);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold tracking-tight text-blue-600">Income</h1>
                    {can('income:create') && (
                        <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto font-bold bg-green-600 hover:bg-green-700 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Add Income
                        </Button>
                    )}
                </div>

                {/* Responsive Filter & Summary Bar */}
                <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-medium text-muted-foreground uppercase ml-1 flex items-center gap-1">
                                <Filter className="h-3 w-3" /> Income Head Filter
                            </label>
                            <SearchableSelect
                                options={[
                                    { value: '', label: 'All Income Heads', group: 'Filter' },
                                    ...incomeHeadOptions
                                ]}
                                value={selectedIncomeHeadFilter}
                                onChange={handleFilterChange}
                                placeholder="Search Income Heads..."
                                className="w-full"
                            />
                        </div>

                        {/* Total Amount Display - Optimized for Mobile */}
                        <div className="flex items-center justify-between md:justify-end gap-3 bg-red-600 p-3 rounded-lg md:min-w-[240px]">
                            <span className="text-xs font-bold text-white uppercase tracking-wider opacity-90">
                                {selectedIncomeHeadFilter
                                    ? `${incomeHeadOptions.find(opt => opt.value === selectedIncomeHeadFilter)?.label || 'Selected'} Total`
                                    : 'Total Income'}
                            </span>
                            <span className="text-lg font-black text-white whitespace-nowrap">
                                NPR {filteredTransactions
                                    .reduce((sum, income) => sum + income.amount, 0)
                                    .toLocaleString()}
                            </span>
                        </div>

                        {/* Main action moved to top-level header for consistency */}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {paginatedTransactions.map((income) => (
                        <div key={income.id} className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="text-lg font-bold text-blue-600">NPR {income.amount.toLocaleString()}</div>
                                    <div className="font-medium text-sm">{income.income_head?.name}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-muted-foreground">{toNepali(income.payment_date)}</div>
                                    <div className="text-[10px] text-muted-foreground">{new Date(income.payment_date).toLocaleDateString('en-GB')}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Mode</span>
                                    <div className="text-xs font-medium">{income.payment_mode?.name || '-'}</div>
                                </div>
                                <div className="space-y-0.5 text-right">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold text-right block">Source</span>
                                    <div className={`text-xs font-bold ${income.isFromInvoice ? 'text-green-600' : 'text-blue-600'}`}>
                                        {income.isFromInvoice ? 'Invoice' : 'Direct'}
                                    </div>
                                </div>
                            </div>

                            {income.remarks && (
                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded italic">
                                    {income.remarks}
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
                                <th className="h-12 px-4 text-left align-middle font-medium">Income Head</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Remarks</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Payment Mode</th>
                                <th className="h-12 px-4 text-right align-middle font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedTransactions.map((income) => (
                                <tr key={income.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">{toNepali(income.payment_date)}</td>
                                    <td className="p-4 align-middle text-muted-foreground">{new Date(income.payment_date).toLocaleDateString('en-GB')}</td>
                                    <td className="p-4 align-middle font-medium">{income.income_head?.name}</td>
                                    <td className="p-4 align-middle">{income.remarks || '-'}</td>
                                    <td className="p-4 align-middle">{income.payment_mode?.name}</td>
                                    <td className="p-4 align-middle text-right font-semibold">NPR {income.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {paginatedTransactions.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground border rounded-lg bg-card">No income records found.</div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
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

            {/* Create Income Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-lg font-bold text-blue-600 uppercase tracking-widest mb-4">Record Direct Income</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Income Head *</label>
                                    <SearchableSelect
                                        options={incomeHeadOptions}
                                        value={newIncomeState.income_head_id}
                                        onChange={(val) => setNewIncomeState({ ...newIncomeState, income_head_id: val })}
                                        placeholder="Select Income Type..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Amount (NPR) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={newIncomeState.amount}
                                        onChange={e => setNewIncomeState({ ...newIncomeState, amount: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Income Date (BS)</label>
                                <NepaliDatePicker
                                    value={newIncomeState.income_date}
                                    onChange={(adDate) => setNewIncomeState({ ...newIncomeState, income_date: adDate })}
                                    placeholder="Select Income Date"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Payment Mode *</label>
                                    <SearchableSelect
                                        options={[
                                            { value: 'Cash', label: 'Cash', group: 'Methods' },
                                            { value: 'Bank Account', label: 'Bank Account', group: 'Methods' },
                                            { value: 'Digital Payment', label: 'Digital Payment', group: 'Methods' },
                                            { value: 'Cheque', label: 'Cheque', group: 'Methods' },
                                        ]}
                                        value={newIncomeState.payment_method}
                                        onChange={(val) => setNewIncomeState({ ...newIncomeState, payment_method: val })}
                                        placeholder="Select Payment Mode..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Fiscal Year *</label>
                                    <select
                                        required
                                        value={newIncomeState.fiscal_year_id}
                                        onChange={e => setNewIncomeState({ ...newIncomeState, fiscal_year_id: e.target.value })}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    >
                                        <option value="">Select Fiscal Year</option>
                                        {fiscalYears.map(fy => (
                                            <option key={fy.id} value={fy.id}>{fy.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Transaction Reference</label>
                                <input
                                    type="text"
                                    value={newIncomeState.transaction_reference}
                                    onChange={e => setNewIncomeState({ ...newIncomeState, transaction_reference: e.target.value })}
                                    placeholder="Receipt #, Check #, Transaction ID..."
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Remarks</label>
                                <textarea
                                    value={newIncomeState.remarks}
                                    onChange={e => setNewIncomeState({ ...newIncomeState, remarks: e.target.value })}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                                    placeholder="Additional details..."
                                />
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                                <Button type="submit" className="w-full sm:w-auto font-bold bg-blue-600 hover:bg-blue-700 text-white">Record Income</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Income Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please review the details before confirming:
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-2 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-semibold text-muted-foreground">Date:</span>
                            <span className="col-span-2">{toNepali(newIncomeState.income_date)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-semibold text-muted-foreground">Income Head:</span>
                            <span className="col-span-2">{incomeHeads.find(h => h.id === newIncomeState.income_head_id)?.name}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-semibold text-muted-foreground">Amount:</span>
                            <span className="col-span-2 font-bold">NPR {parseFloat(newIncomeState.amount || '0').toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <span className="font-semibold text-muted-foreground">Payment Mode:</span>
                            <span className="col-span-2">{newIncomeState.payment_method}</span>
                        </div>
                        {newIncomeState.transaction_reference && (
                            <div className="grid grid-cols-3 gap-2">
                                <span className="font-semibold text-muted-foreground">Reference:</span>
                                <span className="col-span-2">{newIncomeState.transaction_reference}</span>
                            </div>
                        )}
                        {newIncomeState.remarks && (
                            <div className="grid grid-cols-3 gap-2">
                                <span className="font-semibold text-muted-foreground">Remarks:</span>
                                <span className="col-span-2">{newIncomeState.remarks}</span>
                            </div>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmPost}>Confirm & Post</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
