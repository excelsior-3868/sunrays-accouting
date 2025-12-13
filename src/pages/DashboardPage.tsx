import { useEffect, useState } from 'react';
import { Loader2, DollarSign, CreditCard, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { getInvoices, getPayments, getExpenses } from '@/lib/api';


export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalInvoiced: 0,
        totalCollected: 0,
        totalExpenses: 0,
        outstanding: 0,
        recentTxns: [] as any[]
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [invData, payData, expData] = await Promise.all([
                    getInvoices(),
                    getPayments(),
                    getExpenses()
                ]);

                // Calculate Totals
                const totalInvoiced = invData.reduce((sum, i) => sum + i.total_amount, 0);
                // @ts-ignore
                const totalCollected = payData.reduce((sum, p) => sum + p.amount, 0);
                const totalExpenses = expData.reduce((sum, e) => sum + e.amount, 0);

                // Outstanding is tricky because of partials, but simplified:
                // Sum of unpaid invoices? No, Invoiced - Collected is better macro metric
                const outstanding = totalInvoiced - totalCollected;

                // Recent Transactions
                const payments = payData.map(p => ({
                    id: p.id,
                    date: p.payment_date,
                    // @ts-ignore
                    description: `Fee Payment - ${p.invoice?.student_name}`,
                    amount: p.amount,
                    type: 'Income'
                }));

                const expenses = expData.map(e => ({
                    id: e.id,
                    date: e.expense_date,
                    description: `${e.expense_head?.name} - ${e.description || ''}`,
                    amount: e.amount,
                    type: 'Expense'
                }));

                const allTxns = [...payments, ...expenses]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5);

                setStats({
                    totalInvoiced,
                    totalCollected,
                    totalExpenses,
                    outstanding,
                    recentTxns: allTxns
                });

            } catch (error) {
                console.error('Error dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card title="Total Assessed Fees" value={stats.totalInvoiced} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
                <Card title="Total Collection" value={stats.totalCollected} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} className="text-green-600" />
                <Card title="Total Expenses" value={stats.totalExpenses} icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />} className="text-red-600" />
                <Card title="Outstanding Dues" value={stats.outstanding} icon={<CreditCard className="h-4 w-4 text-muted-foreground" />} />
            </div>

            {/* Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
                    <div className="p-6 flex flex-col space-y-1.5">
                        <h3 className="font-semibold leading-none tracking-tight">Recent Transactions</h3>
                        <p className="text-sm text-muted-foreground">Latest income and expenses.</p>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="space-y-4">
                            {stats.recentTxns.map((txn, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${txn.type === 'Income' ? 'bg-green-100' : 'bg-red-100'}`}>
                                            {txn.type === 'Income' ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{txn.description}</p>
                                            <p className="text-xs text-muted-foreground">{txn.date}</p>
                                        </div>
                                    </div>
                                    <div className={`font-medium ${txn.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {txn.type === 'Income' ? '+' : '-'} NPR {txn.amount}
                                    </div>
                                </div>
                            ))}
                            {stats.recentTxns.length === 0 && <div className="text-muted-foreground text-sm">No recent activity.</div>}
                        </div>
                    </div>
                </div>

                <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
                    <div className="p-6 flex flex-col space-y-1.5">
                        <h3 className="font-semibold leading-none tracking-tight">Quick Actions</h3>
                    </div>
                    <div className="p-6 pt-0 flex flex-col gap-2">
                        {/* Placeholder for quick links */}
                        <div className="text-sm text-muted-foreground">Use the sidebar to navigate to specific modules.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Card({ title, value, icon, className }: { title: string, value: number, icon: any, className?: string }) {
    return (
        <div className="rounded-xl border bg-card text-card-foreground shadow">
            <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">{title}</h3>
                {icon}
            </div>
            <div className="p-6 pt-0">
                <div className={`text-2xl font-bold ${className}`}>NPR {value.toLocaleString()}</div>
            </div>
        </div>
    );
}
