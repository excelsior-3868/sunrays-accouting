
import { useEffect, useState } from 'react';
import { getExpenses, getPayments } from '@/lib/api';
import { Loader2, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CashFlowReport() {
    const [loading, setLoading] = useState(true);
    const [totalInflow, setTotalInflow] = useState(0);
    const [totalOutflow, setTotalOutflow] = useState(0);
    const [netCashFlow, setNetCashFlow] = useState(0);

    // Detailed Lists
    const [inflows, setInflows] = useState<any[]>([]);
    const [outflows, setOutflows] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [paymentsData, expensesData] = await Promise.all([
                getPayments(),
                getExpenses()
            ]);

            // 1. Inflows (Fee Collections)
            const income = paymentsData.map(p => ({
                id: p.id,
                date: p.payment_date,
                description: `Fee Receipt ${p.transaction_reference ? `(${p.transaction_reference})` : ''}`,
                amount: p.amount,
                type: 'Income'
            }));
            const totalInc = income.reduce((sum, item) => sum + item.amount, 0);

            // 2. Outflows (Expenses + Payroll)
            // Note: Our Payroll posting logic creates entries in 'Expenses' table automatically!
            // (See api.ts: approvePayrollRun -> createExpense)
            // So fetching getExpenses() is sufficient to capture BOTH general expenses AND payroll.
            // We just need to ensure we don't double count if we were to fetch payslips separately.
            // Confirmed in api.ts lines 523-530.

            const expense = expensesData.map(e => ({
                id: e.id,
                date: e.expense_date,
                description: `${e.expense_head?.name || 'Expense'} - ${e.description || ''}`,
                amount: e.amount,
                type: 'Expense'
            }));
            const totalExp = expense.reduce((sum, item) => sum + item.amount, 0);

            setInflows(income);
            setOutflows(expense);
            setTotalInflow(totalInc);
            setTotalOutflow(totalExp);
            setNetCashFlow(totalInc - totalExp);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    const formatCurrency = (amount: number) => `NPR ${amount.toLocaleString()}`;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Cash Flow Report</h1>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalInflow)}</div>
                        <p className="text-xs text-muted-foreground">From Fee Collections</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutflow)}</div>
                        <p className="text-xs text-muted-foreground">Expenses & Payroll</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(netCashFlow)}
                        </div>
                        <p className="text-xs text-muted-foreground">Inflow - Outflow</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Transactions Table (Mixed) */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">Transaction History</h3>
                </div>
                <div className="max-h-[500px] overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b sticky top-0 bg-secondary/90 backdrop-blur-sm">
                            <tr className="border-b transition-colors bg-muted/50">
                                <th className="h-10 px-4 text-left align-middle font-medium">Date</th>
                                <th className="h-10 px-4 text-left align-middle font-medium">Description</th>
                                <th className="h-10 px-4 text-left align-middle font-medium">Type</th>
                                <th className="h-10 px-4 text-right align-middle font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...inflows, ...outflows]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((item) => (
                                    <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle">{item.date}</td>
                                        <td className="p-4 align-middle">{item.description}</td>
                                        <td className="p-4 align-middle">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent ${item.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className={`p-4 align-middle text-right font-medium ${item.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.type === 'Expense' ? '-' : '+'}{formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))}
                            {[...inflows, ...outflows].length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No transactions recorded.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
