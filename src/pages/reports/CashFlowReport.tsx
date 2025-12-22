import { useEffect, useState } from 'react';
import { getExpenses, getPayments } from '@/lib/api';
import { Loader2, DollarSign, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { toNepali } from '@/lib/nepaliDate';
import { cn } from '@/lib/utils';

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-blue-600">Cash Flow Report</h1>
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-3 py-1 rounded-full border">
                    <DollarSign className="h-3 w-3" /> Real-time Analytics
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                <StatCard
                    title="Total Inflow"
                    value={totalInflow}
                    icon={<ArrowDownRight className="h-6 w-6" />}
                    gradient="from-emerald-500 to-emerald-700"
                    iconBg="bg-white/20"
                    description="From Fee Collections"
                />
                <StatCard
                    title="Total Outflow"
                    value={totalOutflow}
                    icon={<ArrowUpRight className="h-6 w-6" />}
                    gradient="from-rose-500 to-rose-700"
                    iconBg="bg-white/20"
                    description="Expenses & Payroll"
                />
                <StatCard
                    title="Net Cash Flow"
                    value={netCashFlow}
                    icon={<DollarSign className="h-6 w-6" />}
                    gradient={netCashFlow >= 0 ? "from-blue-500 to-blue-700" : "from-rose-600 to-rose-800"}
                    iconBg="bg-white/20"
                    description="Inflow - Outflow"
                />
            </div>

            {/* Recent Transactions Table (Mixed) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Transaction History</h3>
                </div>

                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {[...inflows, ...outflows]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((item) => (
                            <div key={item.id} className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{toNepali(item.date)}</div>
                                        <div className="text-[9px] text-muted-foreground">{item.date}</div>
                                    </div>
                                    <span className={cn(
                                        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset",
                                        item.type === 'Income'
                                            ? "bg-green-50 text-green-700 ring-green-700/10"
                                            : "bg-red-50 text-red-700 ring-red-700/10"
                                    )}>
                                        {item.type}
                                    </span>
                                </div>
                                <div className="text-sm font-medium text-foreground">{item.description}</div>
                                <div className={cn(
                                    "text-right font-black text-lg pt-1",
                                    item.type === 'Income' ? 'text-green-600' : 'text-red-600'
                                )}>
                                    {item.type === 'Expense' ? '-' : '+'}{formatCurrency(item.amount)}
                                </div>
                            </div>
                        ))}
                    {[...inflows, ...outflows].length === 0 && (
                        <div className="p-8 text-center text-muted-foreground bg-card border rounded-lg italic text-sm">No transactions recorded yet.</div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block rounded-lg border bg-card overflow-hidden shadow-sm">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b sticky top-0 bg-secondary/90 backdrop-blur-sm z-10">
                            <tr className="border-b transition-colors bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase text-[11px] tracking-widest">
                                <th className="h-12 px-4 text-left align-middle">Date(BS)</th>
                                <th className="h-12 px-4 text-left align-middle">Date(AD)</th>
                                <th className="h-12 px-4 text-left align-middle">Description</th>
                                <th className="h-12 px-4 text-center align-middle">Type</th>
                                <th className="h-12 px-4 text-right align-middle">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {[...inflows, ...outflows]
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((item) => (
                                    <tr key={item.id} className="transition-colors hover:bg-slate-50">
                                        <td className="p-4 align-middle font-medium whitespace-nowrap">{toNepali(item.date)}</td>
                                        <td className="p-4 align-middle text-muted-foreground text-xs whitespace-nowrap">{item.date}</td>
                                        <td className="p-4 align-middle font-medium">{item.description}</td>
                                        <td className="p-4 align-middle text-center">
                                            <span className={cn(
                                                "inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ring-1 ring-inset",
                                                item.type === 'Income'
                                                    ? "bg-green-50 text-green-700 ring-green-700/10"
                                                    : "bg-red-50 text-red-700 ring-red-700/10"
                                            )}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className={cn(
                                            "p-4 align-middle text-right font-black text-lg",
                                            item.type === 'Income' ? 'text-green-600' : 'text-red-600'
                                        )}>
                                            {item.type === 'Expense' ? '-' : '+'}{formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))}
                            {[...inflows, ...outflows].length === 0 && (
                                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground font-medium bg-slate-50/50 text-sm">No transactions recorded.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon,
    gradient,
    iconBg,
    description
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    gradient: string;
    iconBg: string;
    description?: string;
}) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br text-white transition-all duration-300 hover:shadow-xl hover:scale-105",
            gradient
        )}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", iconBg)}>
                        {icon}
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-white/90">{title}</p>
                    <p className="text-3xl font-bold">NPR {value.toLocaleString()}</p>
                    {description && <p className="text-xs text-white/80">{description}</p>}
                </div>
            </div>
            {/* Decorative circle */}
            <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10"></div>
        </div>
    );
}
