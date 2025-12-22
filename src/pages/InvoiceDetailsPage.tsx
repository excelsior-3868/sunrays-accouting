import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, CreditCard, Printer } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getInvoiceById, recordPayment, getFiscalYears, getGLHeads, getStudentUnpaidStats } from '@/lib/api';
import { type Invoice, type FiscalYear, type GLHead } from '@/types';
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

export default function InvoiceDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { can } = usePermission();
    const { toast } = useToast();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

    // Payment Confirmation State
    const [confirmPaymentData, setConfirmPaymentData] = useState<any>(null);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

    // Live calculation of previous dues
    const [stats, setStats] = useState<{ amount: number, months: string }>({ amount: 0, months: '' });

    // Data for payment form
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [paymentModes, setPaymentModes] = useState<GLHead[]>([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Cash');

    const fetchInvoice = async () => {
        if (!id) return;
        try {
            const [data, fyData, glData] = await Promise.all([
                getInvoiceById(id),
                getFiscalYears(),
                getGLHeads()
            ]);
            setInvoice(data);
            setFiscalYears(fyData.filter(fy => fy.is_active));
            setPaymentModes(glData.filter(h => h.type === 'Asset'));

            if (data && data.created_at) {
                // Fetch live stats for previous dues
                const liveStats = await getStudentUnpaidStats(data.student_id, data.created_at);
                setStats(liveStats);
            }

        } catch (error) {
            console.error('Error fetching invoice:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    const handlePayment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!invoice || !can('invoices.create')) return;

        // Map selected payment method to GL Head ID
        let paymentHeadId = undefined;
        if (selectedPaymentMethod) {
            if (selectedPaymentMethod === 'Cash') {
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

        const formData = new FormData(e.currentTarget);
        const payment = {
            invoice_id: invoice.id,
            amount: Number(formData.get('amount')),
            payment_date: formData.get('payment_date') as string,
            fiscal_year_id: formData.get('fiscal_year_id') as string,
            payment_mode_gl_id: paymentHeadId,
            payment_method: selectedPaymentMethod,
            remarks: formData.get('remarks') as string,
        };

        // Open confirmation instead of immediate save
        setConfirmPaymentData(payment);
        setIsConfirmDialogOpen(true);
    };

    const confirmAndRecordPayment = async () => {
        if (!confirmPaymentData) return;

        try {
            await recordPayment(confirmPaymentData);
            setIsConfirmDialogOpen(false);
            setIsPaymentDialogOpen(false);
            setConfirmPaymentData(null);
            fetchInvoice(); // Refresh to see updated status
            toast({ title: "Success", description: "Payment recorded successfully" });
        } catch (error) {
            console.error('Error recording payment:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to record payment" });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    if (!invoice) return <div>Invoice not found</div>;

    // Use live stats if available, otherwise fallback to stored (though live should be accurate)
    // The user explicitly wants "if Month 1 is clear, don't show". Live stats handle this.
    const effectivePrevDues = stats.amount;
    const effectivePrevMonths = stats.months;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/invoices')} className="p-2 hover:bg-muted rounded-full shrink-0 border sm:border-0">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Invoice {invoice.invoice_number}</h1>
                        <span className={`w-fit inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${invoice.status === 'Paid' ? 'bg-green-500/15 text-green-700' :
                            invoice.status === 'Partial' ? 'bg-yellow-500/15 text-yellow-700' :
                                'bg-red-500/15 text-red-700'
                            }`}>
                            {invoice.status}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="flex-1 sm:flex-none">
                        <Printer className="mr-2 h-4 w-4" /> Print
                    </Button>
                    {invoice.status !== 'Paid' && can('invoices.create') && (
                        <Button size="sm" onClick={() => setIsPaymentDialogOpen(true)} className="flex-1 sm:flex-none">
                            <CreditCard className="mr-2 h-4 w-4" /> Receive Payment
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5 sm:p-6">
                    <h3 className="font-semibold mb-4 text-blue-600 uppercase text-[10px] tracking-widest">Student Details</h3>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">ID</span>
                            <span className="font-medium">{invoice.student_id}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Name</span>
                            <span className="font-medium">{invoice.student_name}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Due Date</span>
                            <span className="font-medium">{invoice.due_date}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                            <span className="text-muted-foreground">Month</span>
                            <span className="font-medium text-blue-600">{invoice.month || '-'}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5 sm:p-6">
                    <h3 className="font-semibold mb-4 text-blue-600 uppercase text-[10px] tracking-widest">Payment Summary</h3>
                    <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Current Amount {invoice.month ? `(${invoice.month})` : ''}</span>
                            <span className="font-medium">NPR {invoice.total_amount}</span>
                        </div>
                        {effectivePrevDues > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                                <span className="flex flex-col">
                                    <span>Previous Dues</span>
                                    {effectivePrevMonths && <span className="text-[10px] opacity-70">({effectivePrevMonths})</span>}
                                </span>
                                <span className="font-medium">NPR {effectivePrevDues}</span>
                            </div>
                        )}
                        <div className="border-t border-dashed my-2 pt-2 flex justify-between font-bold text-lg">
                            <span className="text-base font-semibold">Total Payable</span>
                            <span className="text-blue-600">NPR {invoice.total_amount + effectivePrevDues}</span>
                        </div>
                    </div>
                    {invoice.status !== 'Paid' && can('invoices.create') && (
                        <Button onClick={() => setIsPaymentDialogOpen(true)} className="w-full sm:hidden">
                            <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                        </Button>
                    )}
                </div>
            </div>

            <div className="rounded-lg border bg-card overflow-hidden">
                <div className="p-4 font-semibold border-b flex items-center justify-between">
                    <span className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Invoice Lines</span>
                    <span className="text-xs text-muted-foreground">{invoice.items?.length || 0} items</span>
                </div>

                {/* Mobile View for Items */}
                <div className="block sm:hidden divide-y">
                    {invoice.items?.map((item) => (
                        <div key={item.id} className="p-4 space-y-1">
                            <div className="flex justify-between items-start">
                                <div className="font-semibold text-blue-600">{item.gl_head?.name}</div>
                                <div className="font-bold">NPR {item.amount}</div>
                            </div>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                    ))}
                </div>

                {/* Desktop View for Items */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead>
                            <tr className="border-b transition-colors bg-blue-600 text-primary-foreground hover:bg-blue-600/90">
                                <th className="h-10 px-4 text-left align-middle font-medium">GL Head</th>
                                <th className="h-10 px-4 text-left align-middle font-medium">Description</th>
                                <th className="h-10 px-4 text-right align-middle font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items?.map((item) => (
                                <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle font-medium">{item.gl_head?.name}</td>
                                    <td className="p-4 align-middle">{item.description}</td>
                                    <td className="p-4 align-middle text-right font-bold">NPR {item.amount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isPaymentDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Amount</label>
                                <input type="number" name="amount" defaultValue={invoice.total_amount} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Date</label>
                                <input type="date" name="payment_date" required defaultValue={new Date().toISOString().split('T')[0]} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Payment Mode</label>
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Fiscal Year</label>
                                <select name="fiscal_year_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    {fiscalYears.map(fy => (
                                        <option key={fy.id} value={fy.id}>{fy.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Remarks</label>
                                <textarea name="remarks" className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm border-gray-200" />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsPaymentDialogOpen(false)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Receive Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirmation Dialog */}
            <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to record a payment of <span className="font-bold text-foreground">NPR {confirmPaymentData?.amount}</span> for <span className="font-bold text-foreground">{invoice.student_name}</span>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Invoice No:</span>
                            <span>{invoice.invoice_number}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{confirmPaymentData?.payment_date}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                            <span className="text-muted-foreground">Mode:</span>
                            <span>{confirmPaymentData?.payment_method}</span>
                        </div>
                        {confirmPaymentData?.remarks && (
                            <div className="flex flex-col gap-1 pt-1">
                                <span className="text-muted-foreground">Remarks:</span>
                                <span>{confirmPaymentData.remarks}</span>
                            </div>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmAndRecordPayment} className="bg-primary text-primary-foreground hover:bg-primary/90">Confirm Payment</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
