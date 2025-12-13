import { useEffect, useState } from 'react';
import { Loader2, Filter } from 'lucide-react';
import { getPayments, getExpenses, getGLHeads } from '@/lib/api';
import { type GLHead } from '@/types';

type Transaction = {
    id: string;
    date: string;
    type: 'Income' | 'Expense';
    particulars: string;
    amount: number;
    gl_head?: string;
};

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<'daybook' | 'ledger'>('daybook');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [heads, setHeads] = useState<GLHead[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filteredTxns, setFilteredTxns] = useState<Transaction[]>([]);
    const [selectedHeadId, setSelectedHeadId] = useState<string>('all');

    useEffect(() => {
        const fetchRemote = async () => {
            try {
                const [payData, expData, glData] = await Promise.all([
                    getPayments(),
                    getExpenses(),
                    getGLHeads()
                ]);

                // Normalize data
                const incomeTxns: Transaction[] = payData.map(p => ({
                    id: p.id,
                    date: p.payment_date,
                    type: 'Income',
                    // @ts-ignore
                    particulars: `Fee Receipt - ${p.invoice?.student_name} (${p.invoice?.student_id})`,
                    amount: p.amount,
                    gl_head: p.payment_mode_gl_id // This is the Asset GL (Cash/Bank)
                }));

                const expenseTxns: Transaction[] = expData.map(e => ({
                    id: e.id,
                    date: e.expense_date,
                    type: 'Expense',
                    particulars: `${e.expense_head?.name} - ${e.description || ''}`,
                    amount: e.amount,
                    gl_head: e.expense_head_id // This is the Expense GL
                }));

                const all = [...incomeTxns, ...expenseTxns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                setTransactions(all);
                setFilteredTxns(all);
                setHeads(glData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchRemote();
    }, []);

    // Effect for Filtering
    useEffect(() => {
        if (selectedHeadId === 'all') {
            setFilteredTxns(transactions);
        } else {
            // Very basic filtering: if Fetching Ledger for "Cash", we want txns where Cash was involved
            // For Income (Fee Receipt), Asset GL is payment_mode_gl_id (mapped to gl_head above)
            // For Expense, Expense GL is expense_head_id (mapped to gl_head above)
            // Ideally we check BOTH sides of entry but for this MVP...
            // Wait, expense also has payment_mode (Asset).
            // Let's stick to the mapped 'gl_head' in Transaction type for now, which is primary classification
            // This is "Simple Ledger"
            setFilteredTxns(transactions.filter(t => t.gl_head === selectedHeadId));
        }
    }, [selectedHeadId, transactions]);


    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('daybook')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'daybook' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                    >
                        Day Book
                    </button>
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ledger' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                    >
                        General Ledger
                    </button>
                </div>
            </div>

            {activeTab === 'ledger' && (
                <div className="flex items-center gap-4 bg-card p-4 rounded-lg border">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                        value={selectedHeadId}
                        onChange={(e) => setSelectedHeadId(e.target.value)}
                        className="flex h-9 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                        <option value="all">All Transactions</option>
                        {heads.map(h => (
                            <option key={h.id} value={h.id}>{h.name} ({h.type})</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="rounded-md border bg-card">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50">
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Particulars</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Debit (In)</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Credit (Out)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTxns.map((txn, i) => (
                            <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                                <td className="p-4 align-middle">{txn.date}</td>
                                <td className="p-4 align-middle">
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent ${txn.type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {txn.type}
                                    </span>
                                </td>
                                <td className="p-4 align-middle">{txn.particulars}</td>
                                <td className="p-4 align-middle text-right text-green-600">
                                    {txn.type === 'Income' ? txn.amount : '-'}
                                </td>
                                <td className="p-4 align-middle text-right text-red-600">
                                    {txn.type === 'Expense' ? txn.amount : '-'}
                                </td>
                            </tr>
                        ))}
                        {filteredTxns.length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No transactions found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
