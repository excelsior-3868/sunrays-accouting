
import { useEffect, useState } from 'react';
import { getExpenses, getPayments, getGLHeads } from '@/lib/api';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PLItem = {
    head_id: string;
    head_name: string;
    amount: number;
    type: 'Income' | 'Expense';
};

export default function ProfitLossReport() {
    const [loading, setLoading] = useState(true);
    const [incomeItems, setIncomeItems] = useState<PLItem[]>([]);
    const [expenseItems, setExpenseItems] = useState<PLItem[]>([]);
    const [netProfit, setNetProfit] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [paymentsData, expensesData, glHeads] = await Promise.all([
                getPayments(),
                getExpenses(),
                getGLHeads()
            ]);

            const headMap = new Map(glHeads.map(h => [h.id, h.name]));

            // 1. Calculate Income (grouped by Fee Structure usually, but we only have PaymentGL in Payment table)
            // Ideally Income should be tracked by Income GL Head.
            // In our system: 
            // - Invoices have Items -> GL Head (Income). 
            // - Payments are for Invoices.
            // For a Cash P&L, we treat Collections as Income. 
            // Since we don't have detailed breakdown of WHICH GL head a payment pays off (unless we split payment pro-rata),
            // We can treat "Fee Income" as a single aggregate or group by Fiscal Year if needed.
            // For now, let's group by "Tuition/Fee Income" (Generic) or if we can find a way.
            // Payment has `payment_mode_gl_id` (Asset - Cash/Bank). 
            // The CREDIT side is the Income.
            // Let's assume all Payments are "Fee Income" for now unless we do complex invoice item matching.

            const totalIncome = paymentsData.reduce((sum, p) => sum + p.amount, 0);
            const incomeBreakdown: PLItem[] = [{
                head_id: 'fees',
                head_name: 'Academic Fees Collection',
                amount: totalIncome,
                type: 'Income'
            }];

            // 2. Calculate Expenses (grouped by Expense Head)
            const expenseMap = new Map<string, number>();
            expensesData.forEach(e => {
                const current = expenseMap.get(e.expense_head_id) || 0;
                expenseMap.set(e.expense_head_id, current + e.amount);
            });

            const expenseBreakdown: PLItem[] = Array.from(expenseMap.entries()).map(([id, amount]) => ({
                head_id: id,
                head_name: headMap.get(id) || 'Unknown Expense',
                amount: amount,
                type: 'Expense' as const
            })).sort((a, b) => b.amount - a.amount);

            const totalExpense = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);

            setIncomeItems(incomeBreakdown);
            setExpenseItems(expenseBreakdown);
            setNetProfit(totalIncome - totalExpense);

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
            <h1 className="text-2xl font-bold tracking-tight">Profit & Loss Statement</h1>

            {/* Top Level Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                    title="Total Income"
                    value={incomeItems.reduce((s, i) => s + i.amount, 0)}
                    icon={<TrendingUp className="h-6 w-6" />}
                    gradient="from-[#10B981] to-[#059669]"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title="Total Expenses"
                    value={expenseItems.reduce((s, i) => s + i.amount, 0)}
                    icon={<TrendingDown className="h-6 w-6" />}
                    gradient="from-[#FF5757] to-[#E63946]"
                    iconBg="bg-white/20"
                />
                <StatCard
                    title={netProfit >= 0 ? "Net Profit" : "Net Loss"}
                    value={Math.abs(netProfit)}
                    icon={netProfit >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                    gradient={netProfit >= 0 ? "from-[#5B7FED] to-[#4A6BD9]" : "from-[#FF5757] to-[#E63946]"}
                    iconBg="bg-white/20"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Income Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-green-700 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" /> Income
                        </CardTitle>
                        <span className="font-bold text-xl text-green-700">
                            {formatCurrency(incomeItems.reduce((s, i) => s + i.amount, 0))}
                        </span>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <tbody>
                                {incomeItems.map(item => (
                                    <tr key={item.head_id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="py-3">{item.head_name}</td>
                                        <td className="py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Expense Section */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-red-700 flex items-center gap-2">
                            <TrendingDown className="h-5 w-5" /> Expenses
                        </CardTitle>
                        <span className="font-bold text-xl text-red-700">
                            {formatCurrency(expenseItems.reduce((s, i) => s + i.amount, 0))}
                        </span>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <tbody>
                                {expenseItems.map(item => (
                                    <tr key={item.head_id} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="py-3">{item.head_name}</td>
                                        <td className="py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                                    </tr>
                                ))}
                                {expenseItems.length === 0 && (
                                    <tr><td colSpan={2} className="py-4 text-center text-muted-foreground">No expenses recorded.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
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
        <div className={`relative overflow-hidden rounded-xl shadow-lg bg-gradient-to-br ${gradient} text-white transition-all duration-300 hover:shadow-xl hover:scale-105`}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${iconBg}`}>
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
