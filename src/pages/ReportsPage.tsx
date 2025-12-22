import { useEffect, useState } from 'react';
import { Loader2, Filter, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPayments, getExpenses, getGLHeads, getStudents } from '@/lib/api';
import { type GLHead } from '@/types';
import { toNepali } from '@/lib/nepaliDate';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50); // 50 items per page

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

                    // @ts-ignore
                    const particulars = p.invoice_id
                        // @ts-ignore
                        ? `Fee Receipt - ${p.invoice?.student_name} - ${p.invoice?.month || 'N/A'}`
                        // @ts-ignore
                        : `Direct Income - ${p.income_head?.name || 'Miscellaneous'}`;

                    return {
                        id: p.id,
                        date: p.payment_date,
                        type: 'Income',
                        particulars,
                        amount: p.amount,
                        // @ts-ignore
                        gl_head: p.invoice_id ? p.payment_mode_gl_id : p.income_head_id, // Show Income GL for direct income
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

        // Reset to page 1 when filter changes
        setCurrentPage(1);
    }, [selectedHeadId, /* selectedClass, */ transactions]);

    // Pagination calculations
    const totalItems = filteredTxns.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTxns = filteredTxns.slice(startIndex, endIndex);


    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-blue-600">Reports</h1>
                <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto">
                    <Button
                        variant={activeTab === 'daybook' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('daybook')}
                        className={cn(
                            "flex-1 sm:flex-none font-bold",
                            activeTab === 'daybook' ? "bg-green-600 hover:bg-green-700 text-white" : "text-muted-foreground"
                        )}
                    >
                        Day Book
                    </Button>
                    <Button
                        variant={activeTab === 'ledger' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('ledger')}
                        className={cn(
                            "flex-1 sm:flex-none font-bold",
                            activeTab === 'ledger' ? "bg-green-600 hover:bg-green-700 text-white" : "text-muted-foreground"
                        )}
                    >
                        General Ledger
                    </Button>
                </div>
            </div>

            <div className="bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Filters:</span>
                    </div>

                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search GL Head..."
                            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
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
                            <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-lg animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                                <div
                                    className={cn(
                                        "px-4 py-2.5 cursor-pointer text-sm font-medium border-b",
                                        focusedIndex === 0 ? 'bg-blue-50 text-blue-700' : 'hover:bg-muted'
                                    )}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
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
                                        className={cn(
                                            "px-4 py-2.5 cursor-pointer text-sm border-b last:border-0",
                                            focusedIndex === i + 1 ? 'bg-blue-50 text-blue-700' : 'hover:bg-muted'
                                        )}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setSelectedHeadId(h.id);
                                            setGlSearchQuery(h.name);
                                            setIsGlSearchFocused(false);
                                        }}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold">{h.name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{h.type}</span>
                                        </div>
                                    </div>
                                ))}
                                {filteredHeads.length === 0 && (
                                    <div className="p-4 text-sm text-muted-foreground text-center">No results found</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                    {paginatedTxns.map((txn, i) => (
                        <div key={i} className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{toNepali(txn.date)}</div>
                                    <div className="text-[9px] text-muted-foreground">{new Date(txn.date).toLocaleDateString('en-GB')}</div>
                                </div>
                                <span className={cn(
                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                    txn.type === 'Income' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                )}>
                                    {txn.type}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <div className="font-bold text-sm text-foreground leading-snug">{txn.particulars}</div>
                                {txn.class_name && (
                                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Class: {txn.class_name}</div>
                                )}
                            </div>

                            <div className="flex justify-between items-end pt-2 border-t">
                                <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Amount</div>
                                <div className={cn(
                                    "font-black text-lg",
                                    txn.type === 'Income' ? 'text-green-600' : 'text-red-600'
                                )}>
                                    NPR {txn.amount.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {paginatedTxns.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground bg-card border rounded-lg">No transactions found.</div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block rounded-lg border bg-card overflow-hidden shadow-sm">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase text-[11px] tracking-widest">
                                <th className="h-12 px-4 text-left align-middle">Date (BS)</th>
                                <th className="h-12 px-4 text-left align-middle">Date (AD)</th>
                                <th className="h-12 px-4 text-left align-middle">Type</th>
                                <th className="h-12 px-4 text-left align-middle">Particulars</th>
                                <th className="h-12 px-4 text-left align-middle">Class</th>
                                <th className="h-12 px-4 text-right align-middle">Debit (In)</th>
                                <th className="h-12 px-4 text-right align-middle">Credit (Out)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {paginatedTxns.map((txn, i) => (
                                <tr key={i} className="transition-colors hover:bg-slate-50">
                                    <td className="p-4 align-middle font-medium">{toNepali(txn.date)}</td>
                                    <td className="p-4 align-middle text-muted-foreground text-xs">{new Date(txn.date).toLocaleDateString('en-GB')}</td>
                                    <td className="p-4 align-middle">
                                        <span className={cn(
                                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                            txn.type === 'Income' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                        )}>
                                            {txn.type}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle font-medium">{txn.particulars}</td>
                                    <td className="p-4 align-middle">
                                        {txn.class_name ? (
                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase">
                                                {txn.class_name}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="p-4 align-middle text-right font-black text-green-600">
                                        {txn.type === 'Income' ? `NPR ${txn.amount.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="p-4 align-middle text-right font-black text-red-600">
                                        {txn.type === 'Expense' ? `NPR ${txn.amount.toLocaleString()}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {paginatedTxns.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground font-medium">No transactions found matching your filters.</div>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-card border rounded-lg">
                    <div className="text-sm text-muted-foreground order-2 sm:order-1">
                        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems}
                    </div>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => {
                                    // More aggressive filtering for mobile
                                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                                    if (isMobile) {
                                        return page === 1 || page === totalPages || page === currentPage;
                                    }
                                    return page === 1 ||
                                        page === totalPages ||
                                        Math.abs(page - currentPage) <= 1;
                                })
                                .map((page, index, array) => (
                                    <div key={page} className="flex items-center">
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="px-1 text-muted-foreground text-xs">...</span>
                                        )}
                                        <Button
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="icon"
                                            onClick={() => setCurrentPage(page)}
                                            className="h-8 w-8 text-xs font-bold"
                                        >
                                            {page}
                                        </Button>
                                    </div>
                                ))}
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
