import { useEffect, useState } from 'react';
import { Plus, Loader2, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useToast } from '@/components/ui/use-toast';
import { getPayrollRuns, generatePayrollRun, getFiscalYears, approvePayrollRun, getPayrollRunDetails, deletePayrollRun, getGLHeads } from '@/lib/api';
import { type PayrollRun, type FiscalYear, type GLHead } from '@/types';
import SearchableSelect from '@/components/SearchableSelect';
import { usePermission } from '@/hooks/usePermission';
import { toNepali } from '@/lib/nepaliDate';

export default function PayrollPage() {
    const { can } = usePermission();
    const { toast } = useToast();
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Posted'>('All');
    const [monthFilter, setMonthFilter] = useState('');
    const [glHeads, setGlHeads] = useState<GLHead[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash'); // Default to Cash

    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        type: 'approve' | 'delete';
        id: string | null;
        title: string;
        description: string;
    }>({
        isOpen: false,
        type: 'approve',
        id: null,
        title: '',
        description: ''
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50); // 50 items per page

    const fetchData = async () => {
        try {
            const [runData, fyData, glData] = await Promise.all([
                getPayrollRuns(),
                getFiscalYears(),
                getGLHeads()
            ]);
            setRuns(runData);
            setFiscalYears(fyData.filter(fy => fy.is_active));
            setGlHeads(glData.filter(h => h.type === 'Asset'));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!can('payroll.manage')) return;
        const formData = new FormData(e.currentTarget);

        const fyId = formData.get('fiscal_year_id') as string;
        const month = formData.get('month') as string;

        // Validation: Check if payroll for this month and FY already exists
        const exists = runs.some(r => r.fiscal_year_id === fyId && r.month === month);
        if (exists) {
            toast({ variant: "destructive", title: "Error", description: `Payroll for ${month} already exists in this fiscal year!` });
            return;
        }

        try {
            await generatePayrollRun(fyId, month);
            setIsDialogOpen(false);
            fetchData();
            toast({ title: "Success", description: "Payroll run generated successfully" });
        } catch (error) {
            console.error('Error generating payroll:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to generate payroll run" });
        }
    };

    const handleApprove = (id: string) => {
        if (!can('payroll.manage')) return;
        setAlertConfig({
            isOpen: true,
            type: 'approve',
            id,
            title: 'Approve Payroll Run',
            description: 'Are you sure you want to approve and pay for this payroll run? This will create expense records and cannot be undone.'
        });
    };

    const confirmApprove = async () => {
        const id = alertConfig.id;
        if (!id) return;
        try {
            // Map selected payment method to GL Head ID
            let paymentHeadId = undefined;
            if (selectedPaymentMethod) {
                if (selectedPaymentMethod === 'Cash') {
                    paymentHeadId = glHeads.find(h => h.name.toLowerCase().includes('cash'))?.id;
                } else {
                    // Start with Bank, if not found try loose match
                    paymentHeadId = glHeads.find(h => h.name.toLowerCase().includes('bank'))?.id;
                }

                // Final Fallback: First Asset Head if we really can't find anything but user selected something
                if (!paymentHeadId && glHeads.length > 0) {
                    paymentHeadId = glHeads[0].id;
                }
            }

            await approvePayrollRun(id, paymentHeadId);
            fetchData();
            toast({ title: "Success", description: "Payroll approved and expenses recorded successfully!" });
        } catch (error) {
            console.error('Error approving payroll:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to approve payroll." });
        } finally {
            setAlertConfig(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleDelete = (id: string) => {
        if (!can('payroll.manage')) return;
        setAlertConfig({
            isOpen: true,
            type: 'delete',
            id,
            title: 'Delete Payroll Run',
            description: 'Are you sure you want to delete this payroll run? All associated payslips will be removed. This cannot be undone.'
        });
    };

    const confirmDelete = async () => {
        const id = alertConfig.id;
        if (!id) return;
        try {
            await deletePayrollRun(id);
            fetchData();
            toast({ title: "Success", description: "Payroll run deleted" });
        } catch (error) {
            console.error('Error deleting payroll:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete payroll run." });
        } finally {
            setAlertConfig(prev => ({ ...prev, isOpen: false }));
        }
    };

    const [viewingRun, setViewingRun] = useState<any | null>(null);

    const handleView = async (id: string) => {
        try {
            const runDetails = await getPayrollRunDetails(id);
            setViewingRun(runDetails);
        } catch (error) {
            console.error('Error fetching details:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to fetch payslips." });
        }
    };

    const filteredRuns = runs.filter(run => {
        // Status Filter
        if (statusFilter !== 'All') {
            if (statusFilter === 'Posted' && !run.is_posted) return false;
            if (statusFilter === 'Draft' && run.is_posted) return false;
        }

        // Month Filter
        if (monthFilter && run.month !== monthFilter) return false;

        return true;
    });

    // Pagination calculations
    const totalItems = filteredRuns.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRuns = filteredRuns.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, monthFilter]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>

                <div className="flex items-center gap-2">
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="">All Months</option>
                        {['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'].map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="All">All Status</option>
                        <option value="Draft">Draft (Not Paid)</option>
                        <option value="Posted">Posted (Paid)</option>
                    </select>

                    {can('payroll.manage') && (
                        <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                            <Plus className="mr-2 h-4 w-4" /> Run Payroll
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-blue-600 text-primary-foreground hover:bg-blue-600/90">
                                <th className="h-12 px-4 text-left align-middle font-medium">Month</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Run Date(BS)</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Run Date(AD)</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Approve Status</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedRuns.map((run) => (
                                <tr key={run.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle font-medium">{run.month}</td>
                                    <td className="p-4 align-middle font-medium whitespace-nowrap">{toNepali(run.created_at?.split('T')[0])}</td>
                                    <td className="p-4 align-middle text-muted-foreground whitespace-nowrap">{run.created_at?.split('T')[0]}</td>
                                    <td className="p-4 align-middle">
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${run.is_posted ? 'bg-green-500/15 text-green-700' : 'bg-yellow-500/15 text-yellow-700'
                                            }`}>
                                            {run.is_posted ? 'Posted' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 text-blue-600"
                                                onClick={() => handleView(run.id)}
                                                title={run.is_posted ? "View Details" : "View & Approve"}
                                            >
                                                <Eye size={18} />
                                            </button>

                                            {!run.is_posted && can('payroll.manage') && (
                                                <button
                                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9 text-red-600"
                                                    onClick={() => handleDelete(run.id)}
                                                    title="Delete Run"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {paginatedRuns.length === 0 && (
                                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No payroll runs found.</td></tr>
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
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold mb-4">Run Payroll</h3>
                        <form onSubmit={handleGenerate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fiscal Year</label>
                                <select name="fiscal_year_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    {fiscalYears.map(fy => (
                                        <option key={fy.id} value={fy.id}>{fy.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Month</label>
                                <select name="month" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="" disabled selected>Select Month</option>
                                    {['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Generate</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {viewingRun && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Payroll Review - {viewingRun.month}</h3>
                                <p className="text-sm text-muted-foreground">{viewingRun.is_posted ? 'Posted' : 'Draft'} • {viewingRun.payslips?.length || 0} Employees</p>
                            </div>
                            <button onClick={() => setViewingRun(null)} className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted">
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors bg-blue-600 text-primary-foreground hover:bg-blue-600/90">
                                        <th className="h-10 px-4 text-left font-medium">Employee</th>
                                        <th className="h-10 px-4 text-right font-medium">Earnings</th>
                                        <th className="h-10 px-4 text-right font-medium">Deductions</th>
                                        <th className="h-10 px-4 text-right font-medium">Net Salary</th>
                                        <th className="h-10 px-4 text-center font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingRun.payslips?.map((slip: any) => (
                                        <tr key={slip.id} className="border-t">
                                            <td className="p-3 font-medium">{slip.employee_name}</td>
                                            <td className="p-3 text-right text-green-600">{slip.total_earnings?.toLocaleString()}</td>
                                            <td className="p-3 text-right text-red-500">{slip.total_deductions?.toLocaleString()}</td>
                                            <td className="p-3 text-right font-bold">{slip.net_salary?.toLocaleString()}</td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${slip.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {slip.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {!viewingRun.is_posted && (
                            <div className="mt-4 flex items-center justify-between bg-muted/30 p-4 rounded-md border">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Payment Method</p>
                                    <p className="text-xs text-muted-foreground">Select how salary will be paid.</p>
                                </div>
                                <div className="w-[250px]">
                                    <SearchableSelect
                                        options={[
                                            { value: 'Cash', label: 'Cash', group: 'Methods' },
                                            { value: 'Bank Account', label: 'Bank Account', group: 'Methods' },
                                            { value: 'Digital Payment', label: 'Digital Payment', group: 'Methods' },
                                            { value: 'Cheque', label: 'Cheque', group: 'Methods' },
                                        ]}
                                        value={selectedPaymentMethod}
                                        onChange={setSelectedPaymentMethod}
                                        placeholder="Select Payment Mode..."
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setViewingRun(null)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent">Close</button>
                            {!viewingRun.is_posted && can('payroll.manage') && (
                                <button
                                    onClick={() => {
                                        handleApprove(viewingRun.id);
                                        setViewingRun(null);
                                    }}
                                    className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                                >
                                    Approve All & Pay
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
            {/* Alert Dialog */}
            <AlertDialog open={alertConfig.isOpen} onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, isOpen: open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertConfig.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={alertConfig.type === 'approve' ? confirmApprove : confirmDelete}
                            className={alertConfig.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                            {alertConfig.type === 'approve' ? 'Approve' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
