import { useEffect, useState } from 'react';
import { Loader2, Printer, Filter } from 'lucide-react';
import { getPayrollRuns, getPayrollRunDetails } from '@/lib/api';
import { type PayrollRun } from '@/types';
import { Button } from '@/components/ui/button';

export default function SalarySheetReport() {
    const [loading, setLoading] = useState(true);
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string>('');
    const [reportData, setReportData] = useState<any | null>(null);

    // Initial load of runs
    useEffect(() => {
        getPayrollRuns().then(data => {
            setRuns(data);
            if (data.length > 0) {
                // Default to latest run ideally
                setSelectedRunId(data[0].id);
            }
            setLoading(false);
        }).catch(console.error);
    }, []);

    // Load detailed data when run changes
    useEffect(() => {
        if (selectedRunId) {
            fetchReportDetails(selectedRunId);
        }
    }, [selectedRunId]);

    const fetchReportDetails = async (id: string) => {
        setReportData(null); // Clear old while loading
        try {
            const details = await getPayrollRunDetails(id);
            setReportData(details);
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <h1 className="text-2xl font-bold tracking-tight text-blue-600">Salary Sheet</h1>
                <Button
                    variant="outline"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 font-bold border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                    <Printer className="h-4 w-4" /> Print Sheet
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="bg-card p-4 rounded-lg border shadow-sm print:hidden">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 flex items-center gap-1">
                            <Filter className="h-3 w-3" /> Select Payroll Month
                        </label>
                        <select
                            value={selectedRunId}
                            onChange={(e) => setSelectedRunId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                        >
                            {runs.map(r => (
                                <option key={r.id} value={r.id}>{r.month} (Generated: {r.created_at?.split('T')[0]})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {reportData ? (
                <div className="space-y-4">
                    {/* Header for Print/View */}
                    <div className="text-center space-y-1 pb-4 border-b">
                        <h2 className="text-xl font-black uppercase tracking-widest text-foreground">Monthly Salary Sheet</h2>
                        <div className="text-sm font-bold text-blue-600 uppercase">For the Month of {reportData.month}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Generated on {new Date().toLocaleDateString()}</div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 md:hidden print:hidden">
                        {reportData.payslips?.map((slip: any) => (
                            <div key={slip.id} className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                                <div className="font-bold text-lg text-foreground">{slip.employee_name}</div>
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-2">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Earnings</span>
                                        <div className="text-xs font-bold text-green-600">NPR {slip.total_earnings?.toLocaleString()}</div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Deductions</span>
                                        <div className="text-xs font-bold text-red-600">NPR {slip.total_deductions?.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Net Salary</span>
                                    <span className="font-black text-blue-700">NPR {slip.net_salary?.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-lg border bg-card overflow-hidden shadow-sm print:block print:border-none print:shadow-none">
                        <table className="w-full caption-bottom text-sm print:text-xs">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase text-[11px] tracking-widest print:bg-slate-100 print:text-slate-900">
                                    <th className="h-12 px-4 text-left align-middle w-12">S.N.</th>
                                    <th className="h-12 px-4 text-left align-middle">Employee Name</th>
                                    <th className="h-12 px-4 text-right align-middle">Earnings</th>
                                    <th className="h-12 px-4 text-right align-middle">Deductions</th>
                                    <th className="h-12 px-4 text-right align-middle">Net Salary</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {reportData.payslips?.map((slip: any, index: number) => (
                                    <tr key={slip.id} className="transition-colors hover:bg-slate-50 print:hover:bg-transparent">
                                        <td className="p-4 align-middle text-muted-foreground text-xs">{index + 1}</td>
                                        <td className="p-4 align-middle font-bold text-foreground">{slip.employee_name}</td>
                                        <td className="p-4 align-middle text-right text-green-600 font-medium">{slip.total_earnings?.toLocaleString()}</td>
                                        <td className="p-4 align-middle text-right text-red-600 font-medium">{slip.total_deductions?.toLocaleString()}</td>
                                        <td className="p-4 align-middle text-right font-black text-blue-700">NPR {slip.net_salary?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold print:bg-white">
                                <tr>
                                    <td colSpan={2} className="p-4 text-right text-[11px] uppercase tracking-widest text-muted-foreground">Total Summary</td>
                                    <td className="p-4 text-right text-green-700 font-black">
                                        {reportData.payslips?.reduce((sum: number, s: any) => sum + (s.total_earnings || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right text-red-700 font-black">
                                        {reportData.payslips?.reduce((sum: number, s: any) => sum + (s.total_deductions || 0), 0).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right text-blue-800 font-black text-lg">
                                        NPR {reportData.payslips?.reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0).toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/20 border border-dashed rounded-lg space-y-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Filter className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-foreground">No Report Selected</p>
                        <p className="text-xs text-muted-foreground">Please select a payroll month to view the salary sheet.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
