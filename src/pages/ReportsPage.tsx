import { useEffect, useState } from 'react';
import { Loader2, Filter, Search, X } from 'lucide-react';
import { getPayments, getExpenses, getGLHeads, getStudents } from '@/lib/api';
import { type GLHead } from '@/types';

type Transaction = {
    id: string;
    date: string;
    type: 'Income' | 'Expense';
    particulars: string;
    amount: number;
    gl_head?: string;
    class_name?: string;
};

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<'daybook' | 'ledger'>('daybook');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [heads, setHeads] = useState<GLHead[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filteredTxns, setFilteredTxns] = useState<Transaction[]>([]);
    const [selectedHeadId, setSelectedHeadId] = useState<string>('all');
    // Searchable GL Head Filter States
    const [glSearchQuery, setGlSearchQuery] = useState('');
    const [isGlSearchFocused, setIsGlSearchFocused] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Memoize the filtered list to allow safe indexing
    const filteredHeads = heads.filter(h => h.name.toLowerCase().includes(glSearchQuery.toLowerCase()));

    // Reset focused index when query changes
    useEffect(() => {
        setFocusedIndex(-1);
    }, [glSearchQuery]);

    // const [selectedClass, setSelectedClass] = useState<string>('All');
    // const [availableClasses, setAvailableClasses] = useState<string[]>([]);

    useEffect(() => {
        const fetchRemote = async () => {
            try {
                const [payData, expData, glData, studentData] = await Promise.all([
                    getPayments(),
                    getExpenses(),
                    getGLHeads(),
                    getStudents()
                ]);

                // Map Student -> Class
                const studentClassMap = new Map(studentData.map((s: any) => [s.id, s.class_name || s.class || 'Unassigned']));
                // Standard classes
                // const PREDEFINED_CLASSES = ['Play Group', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
                // const dynamicClasses = Array.from(new Set(studentData.map((s: any) => s.class_name || s.class || 'Unassigned'))).filter(Boolean) as string[];
                // const classes = Array.from(new Set([...PREDEFINED_CLASSES, ...dynamicClasses])).sort();
                // setAvailableClasses(classes);

                // Normalize data
                const incomeTxns: Transaction[] = payData.map(p => {
                    // @ts-ignore
                    const studentId = p.invoice?.student_id;
                    const className = studentId ? studentClassMap.get(studentId) : undefined;

                    return {
                        id: p.id,
                        date: p.payment_date,
                        type: 'Income',
                        // @ts-ignore
                        particulars: `Fee Receipt - ${p.invoice?.student_name} - ${p.invoice?.month || 'N/A'}`,
                        amount: p.amount,
                        gl_head: p.payment_mode_gl_id, // This is the Asset GL (Cash/Bank)
                        class_name: className
                    };
                });

                const expenseTxns: Transaction[] = expData.map(e => ({
                    id: e.id,
                    date: e.expense_date,
                    type: 'Expense',
                    particulars: `${e.expense_head?.name} ${e.description ? '-' + e.description : ''}`,
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
        let result = transactions;

        // 1. Filter by Head (General Ledger Tab)
        if (selectedHeadId !== 'all') {
            result = result.filter(t => t.gl_head === selectedHeadId);
        }

        // 2. Filter by Class (Project requirement: Removed Class filter)
        // if (selectedClass !== 'All') {
        //     result = result.filter(t => t.class_name === selectedClass);
        // }

        setFilteredTxns(result);
    }, [selectedHeadId, /* selectedClass, */ transactions]);


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

            <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                {/* GL Head Searchable Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search GL Head..."
                        className="pl-10 pr-8 h-9 w-[400px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={glSearchQuery}
                        onChange={(e) => {
                            setGlSearchQuery(e.target.value);
                            if (selectedHeadId !== 'all') setSelectedHeadId('all');
                        }}
                        onFocus={() => setIsGlSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsGlSearchFocused(false), 200)}
                        onKeyDown={(e) => {
                            if (!isGlSearchFocused) return;
                            const options = [{ id: 'all', name: 'All GL Heads', type: '' }, ...filteredHeads];

                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
                            } else if (e.key === 'Enter') {
                                e.preventDefault();
                                if (focusedIndex >= 0 && focusedIndex < options.length) {
                                    const selected = options[focusedIndex];
                                    if (selected.id === 'all') {
                                        setSelectedHeadId('all');
                                        setGlSearchQuery('');
                                    } else {
                                        setSelectedHeadId(selected.id);
                                        setGlSearchQuery(selected.name);
                                    }
                                    setIsGlSearchFocused(false);
                                }
                            }
                        }}
                    />
                    {glSearchQuery && (
                        <button
                            onClick={() => {
                                setGlSearchQuery('');
                                setSelectedHeadId('all');
                            }}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    {isGlSearchFocused && (
                        <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                            <div
                                className={`px-3 py-2 cursor-pointer text-sm font-medium border-b hover:bg-muted ${focusedIndex === 0 ? 'bg-muted' : ''}`}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent blur
                                    setSelectedHeadId('all');
                                    setGlSearchQuery('');
                                    setIsGlSearchFocused(false);
                                }}
                            >
                                All GL Heads
                            </div>
                            {filteredHeads.map((h, i) => (
                                <div
                                    key={h.id}
                                    className={`px-3 py-2 cursor-pointer text-sm flex justify-between hover:bg-muted ${focusedIndex === i + 1 ? 'bg-muted' : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur
                                        setSelectedHeadId(h.id);
                                        setGlSearchQuery(h.name);
                                        setIsGlSearchFocused(false);
                                    }}
                                >
                                    <span>{h.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2 capitalize">{h.type}</span>
                                </div>
                            ))}
                            {filteredHeads.length === 0 && (
                                <div className="p-2 text-sm text-muted-foreground text-center">No results</div>
                            )}
                        </div>
                    )}
                </div>


            </div>

            <div className="rounded-lg border bg-card overflow-hidden">
                <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors bg-primary text-primary-foreground hover:bg-primary/90">
                            <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                            <th className="h-12 px-4 text-left align-middle font-medium">Type</th>
                            <th className="h-12 px-4 text-left align-middle font-medium">Particulars</th>
                            <th className="h-12 px-4 text-left align-middle font-medium">Class</th>
                            <th className="h-12 px-4 text-right align-middle font-medium">Debit (In)</th>
                            <th className="h-12 px-4 text-right align-middle font-medium">Credit (Out)</th>
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
                                <td className="p-4 align-middle text-muted-foreground text-xs">{txn.class_name || '-'}</td>
                                <td className="p-4 align-middle text-right text-green-600">
                                    {txn.type === 'Income' ? txn.amount : '-'}
                                </td>
                                <td className="p-4 align-middle text-right text-red-600">
                                    {txn.type === 'Expense' ? txn.amount : '-'}
                                </td>
                            </tr>
                        ))}
                        {filteredTxns.length === 0 && (
                            <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No transactions found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
