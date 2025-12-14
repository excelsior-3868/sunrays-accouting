import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { getPayrollRuns, generatePayrollRun, getFiscalYears, approvePayrollRun, getPayrollRunDetails } from '@/lib/api';
import { type PayrollRun, type FiscalYear } from '@/types';

export default function PayrollPage() {
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchData = async () => {
        try {
            const [runData, fyData] = await Promise.all([
                getPayrollRuns(),
                getFiscalYears()
            ]);
            setRuns(runData);
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

    const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const fyId = formData.get('fiscal_year_id') as string;
        const month = formData.get('month') as string;

        try {
            await generatePayrollRun(fyId, month);
            setIsDialogOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error generating payroll:', error);
        }
    };

    const handleApprove = async (id: string) => {
        if (!confirm('Are you sure you want to approve and pay for this payroll run? This will create expense records and cannot be undone.')) return;
        try {
            await approvePayrollRun(id);
            fetchData();
            alert('Payroll approved and expenses recorded successfully!');
        } catch (error) {
            console.error('Error approving payroll:', error);
            alert('Failed to approve payroll.');
        }
    };

    const [viewingRun, setViewingRun] = useState<any | null>(null);

    const handleView = async (id: string) => {
        try {
            const runDetails = await getPayrollRunDetails(id);
            setViewingRun(runDetails);
        } catch (error) {
            console.error('Error fetching details:', error);
            alert('Failed to fetch payslips.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
                <button onClick={() => setIsDialogOpen(true)} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus className="mr-2 h-4 w-4" /> Run Payroll
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-md border bg-card">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Month</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Run Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Approve Status</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {runs.map((run) => (
                                <tr key={run.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle font-medium">{run.month}</td>
                                    <td className="p-4 align-middle">{run.created_at?.split('T')[0]}</td>
                                    <td className="p-4 align-middle">
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${run.is_posted ? 'bg-green-500/15 text-green-700' : 'bg-yellow-500/15 text-yellow-700'
                                            }`}>
                                            {run.is_posted ? 'Posted' : 'Draft'}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="text-primary hover:underline font-medium"
                                                onClick={() => handleView(run.id)}
                                            >
                                                Review
                                            </button>
                                            {!run.is_posted && (
                                                <>
                                                    <span className="text-muted-foreground/30">|</span>
                                                    <button
                                                        className="text-primary hover:underline font-medium"
                                                        onClick={() => handleApprove(run.id)}
                                                    >
                                                        Pay
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {runs.length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No payroll runs found.</td></tr>
                            )}
                        </tbody>
                    </table>
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
                                <input name="month" required placeholder="e.g. Baisakh" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
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
                                <thead className="bg-muted/50">
                                    <tr>
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

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setViewingRun(null)} className="h-9 px-4 rounded-md border text-sm hover:bg-accent">Close</button>
                            {!viewingRun.is_posted && (
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
            )}
        </div>
    );
}
