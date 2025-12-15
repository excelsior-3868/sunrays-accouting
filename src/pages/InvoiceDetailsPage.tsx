import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, CreditCard, Printer } from 'lucide-react';
import { getInvoiceById, recordPayment, getFiscalYears, getGLHeads, getStudentUnpaidStats } from '@/lib/api';
import { type Invoice, type FiscalYear, type GLHead } from '@/types';

export default function InvoiceDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

    // Live calculation of previous dues
    const [stats, setStats] = useState<{ amount: number, months: string }>({ amount: 0, months: '' });

    // Data for payment form
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [paymentModes, setPaymentModes] = useState<GLHead[]>([]);

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
        if (!invoice) return;

        const formData = new FormData(e.currentTarget);
        const payment = {
            invoice_id: invoice.id,
            amount: Number(formData.get('amount')),
            payment_date: formData.get('payment_date') as string,
            fiscal_year_id: formData.get('fiscal_year_id') as string,
            payment_mode_gl_id: formData.get('payment_mode_gl_id') as string,
            remarks: formData.get('remarks') as string,
        };

        try {
            await recordPayment(payment);
            setIsPaymentDialogOpen(false);
            fetchInvoice(); // Refresh to see updated status
        } catch (error) {
            console.error('Error recording payment:', error);
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
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/invoices')} className="p-2 hover:bg-muted rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">Invoice {invoice.invoice_number}</h1>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${invoice.status === 'Paid' ? 'bg-green-500/15 text-green-700' :
                    invoice.status === 'Partial' ? 'bg-yellow-500/15 text-yellow-700' :
                        'bg-red-500/15 text-red-700'
                    }`}>
                    {invoice.status}
                </span>
                <button onClick={() => window.print()} className="ml-auto inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                    <Printer className="mr-2 h-4 w-4" /> Print
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <h3 className="font-semibold mb-4">Student Details</h3>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between py-1 border-b">
                            <span className="text-muted-foreground">ID</span>
                            <span className="font-medium">{invoice.student_id}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b">
                            <span className="text-muted-foreground">Name</span>
                            <span className="font-medium">{invoice.student_name}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b">
                            <span className="text-muted-foreground">Due Date</span>
                            <span className="font-medium">{invoice.due_date}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b">
                            <span className="text-muted-foreground">Month</span>
                            <span className="font-medium">{invoice.month || '-'}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
                    <h3 className="font-semibold mb-4 flex justify-between items-center">
                        <div>Summary</div>
                        {invoice.status !== 'Paid' && (
                            <button onClick={() => setIsPaymentDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-8 px-3">
                                <CreditCard className="mr-2 h-3.5 w-3.5" /> Record Payment
                            </button>
                        )}
                    </h3>
                    <div className="space-y-1 mb-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Current Amount {invoice.month ? `(${invoice.month})` : ''}</span>
                            <span>NPR {invoice.total_amount}</span>
                        </div>
                        {effectivePrevDues > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                                <span>Previous Dues {effectivePrevMonths ? `(${effectivePrevMonths})` : ''}</span>
                                <span>NPR {effectivePrevDues}</span>
                            </div>
                        )}
                        <div className="border-t my-2 pt-2 flex justify-between font-bold">
                            <span>Total Payable</span>
                            <span>NPR {invoice.total_amount + effectivePrevDues}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border bg-card overflow-hidden">
                <div className="p-4 font-semibold border-b">Lines</div>
                <table className="w-full caption-bottom text-sm">
                    <thead>
                        <tr className="border-b transition-colors bg-primary text-primary-foreground hover:bg-primary/90">
                            <th className="h-10 px-4 text-left align-middle font-medium">GL Head</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">Description</th>
                            <th className="h-10 px-4 text-right align-middle font-medium">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items?.map((item) => (
                            <tr key={item.id} className="border-b transition-colors">
                                <td className="p-4 align-middle">{item.gl_head?.name}</td>
                                <td className="p-4 align-middle">{item.description}</td>
                                <td className="p-4 align-middle text-right">{item.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                                <label className="text-sm font-medium">Payment Mode (Asset GL)</label>
                                <select name="payment_mode_gl_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="">Select Mode (e.g. Cash, Bank)</option>
                                    {paymentModes.map(h => (
                                        <option key={h.id} value={h.id}>{h.name}</option>
                                    ))}
                                </select>
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
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-green-600 text-white hover:bg-green-700">Receive Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
