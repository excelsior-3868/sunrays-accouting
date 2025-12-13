import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { getPayrollRuns, generatePayrollRun, getFiscalYears } from '@/lib/api';
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
                                        <button className="text-primary hover:underline" onClick={() => alert('View Payslips not implemented completely in Phase 3 demo')}>View</button>
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
        </div>
    );
}
