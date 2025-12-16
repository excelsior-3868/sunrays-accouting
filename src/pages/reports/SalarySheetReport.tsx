
import { useEffect, useState } from 'react';
import { Loader2, Printer, Filter } from 'lucide-react';
import { getPayrollRuns, getPayrollRunDetails } from '@/lib/api';
import { type PayrollRun } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-2xl font-bold tracking-tight">Salary Sheet</h1>
                <button
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2"
                >
                    <Printer className="mr-2 h-4 w-4" /> Print
                </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-md border shadow-sm print:hidden">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    Filters:
                </div>
                <select
                    value={selectedRunId}
                    onChange={(e) => setSelectedRunId(e.target.value)}
                    className="h-9 rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none w-[300px]"
                >
                    {runs.map(r => (
                        <option key={r.id} value={r.id}>{r.month} (Generated: {r.created_at?.split('T')[0]})</option>
                    ))}
                </select>
            </div>

            {reportData ? (
                <Card className="print:shadow-none print:border-none">
                    <CardHeader className="text-center border-b pb-6">
                        <CardTitle className="text-xl">Monthly Salary Sheet</CardTitle>
                        <p className="text-sm text-muted-foreground">For the Month of {reportData.month}</p>
                        <p className="text-xs text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="h-10 px-4 text-left font-semibold border-r">S.N.</th>
                                        <th className="h-10 px-4 text-left font-semibold border-r">Employee Name</th>
                                        <th className="h-10 px-4 text-right font-semibold border-r">Basic Earnings</th>
                                        <th className="h-10 px-4 text-right font-semibold border-r">Total Deductions</th>
                                        <th className="h-10 px-4 text-right font-semibold">Net Salary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.payslips?.map((slip: any, index: number) => (
                                        <tr key={slip.id} className="border-b last:border-0 hover:bg-muted/50">
                                            <td className="p-3 border-r text-center w-12">{index + 1}</td>
                                            <td className="p-3 border-r font-medium">{slip.employee_name}</td>
                                            <td className="p-3 border-r text-right">{slip.total_earnings?.toLocaleString()}</td>
                                            <td className="p-3 border-r text-right">{slip.total_deductions?.toLocaleString()}</td>
                                            <td className="p-3 text-right font-bold">{slip.net_salary?.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {reportData.payslips?.length === 0 && (
                                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No records found.</td></tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-muted/50 font-bold border-t">
                                    <tr>
                                        <td colSpan={2} className="p-3 border-r text-right">Total</td>
                                        <td className="p-3 border-r text-right">
                                            {reportData.payslips?.reduce((sum: number, s: any) => sum + (s.total_earnings || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="p-3 border-r text-right">
                                            {reportData.payslips?.reduce((sum: number, s: any) => sum + (s.total_deductions || 0), 0).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-right">
                                            {reportData.payslips?.reduce((sum: number, s: any) => sum + (s.net_salary || 0), 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center py-12 text-muted-foreground">Select a payroll run to view the sheet.</div>
            )}
        </div>
    );
}
