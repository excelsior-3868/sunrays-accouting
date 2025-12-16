
import { useEffect, useState } from 'react';
import { getExpenses, getStaffMembers, getTeachers } from '@/lib/api';
import { Loader2, Search, X, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type LedgerEntry = {
    id: string;
    date: string;
    description: string;
    amount: number;
};

export default function StaffLedgerReport() {
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);

    // Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    // Filtered List
    const filteredStaffList = staffList.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10);

    // Reset focused index
    useEffect(() => {
        setFocusedIndex(-1);
    }, [searchQuery]);

    // Total Paid
    const totalPaid = ledger.reduce((sum, item) => sum + item.amount, 0);

    useEffect(() => {
        async function loadHeads() {
            try {
                // Fetch both Staff and Teachers as both are on payroll
                const [staff, teachers] = await Promise.all([
                    getStaffMembers(),
                    getTeachers()
                ]);

                const formattedStaff = staff.map(s => ({
                    id: s.id,
                    name: `${s.first_name} ${s.last_name}`,
                    role: 'Staff'
                }));

                const formattedTeachers = teachers.map(t => ({
                    id: t.id,
                    name: `${t.first_name} ${t.last_name}`,
                    role: 'Teacher'
                }));

                setStaffList([...formattedStaff, ...formattedTeachers]);
            } catch (err) {
                console.error(err);
            } finally {
                setInitLoading(false);
            }
        }
        loadHeads();
    }, []);

    const loadLedger = async (staffId: string, staffName: string) => {
        if (!staffId) return;
        setLoading(true);

        try {
            const allExpenses = await getExpenses();

            // Filter expenses that look like salary for this person
            const staffExpenses = allExpenses.filter(e =>
                e.description?.includes(`Salary Payment for ${staffName}`)
            ).map(e => ({
                id: e.id,
                date: e.expense_date,
                description: e.description || 'Salary Payment',
                amount: e.amount
            }));

            setLedger(staffExpenses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (initLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Staff / Teacher Ledger</h1>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-md border shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    Filters:
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search Staff / Teacher..."
                        className="pl-10 pr-8 h-9 w-[300px] md:w-[400px] rounded-md border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder:text-gray-400"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (selectedStaffId) setSelectedStaffId('');
                        }}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        onKeyDown={(e) => {
                            if (!isSearchFocused) return;
                            const options = filteredStaffList;

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
                                    setSearchQuery(selected.name);
                                    setSelectedStaffId(selected.id);
                                    setIsSearchFocused(false);
                                    loadLedger(selected.id, selected.name);
                                }
                            }
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedStaffId('');
                            }}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    {isSearchFocused && (searchQuery || filteredStaffList.length > 0) && (
                        <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                            {filteredStaffList.map((s, i) => (
                                <div
                                    key={s.id}
                                    className={`px-3 py-2 cursor-pointer text-sm hover:bg-muted ${focusedIndex === i ? 'bg-muted' : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevent blur
                                        setSearchQuery(s.name);
                                        setSelectedStaffId(s.id);
                                        setIsSearchFocused(false);
                                        loadLedger(s.id, s.name);
                                    }}
                                >
                                    <div className="font-medium">{s.name}</div>
                                    <div className="text-xs text-muted-foreground">{s.role}</div>
                                </div>
                            ))}
                            {filteredStaffList.length === 0 && (
                                <div className="p-2 text-sm text-muted-foreground text-center">No results</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {ledger.length > 0 ? (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-blue-600 text-primary-foreground hover:bg-blue-600/90">
                                <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium">Description</th>
                                <th className="h-12 px-4 text-right align-middle font-medium">Amount Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.map((entry) => (
                                <tr key={entry.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">{formatDate(entry.date)}</td>
                                    <td className="p-4 align-middle">{entry.description}</td>
                                    <td className="p-4 align-middle text-right font-medium">{entry.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr className="bg-muted/50 font-bold border-t">
                                <td colSpan={2} className="p-4 text-right">Total Paid</td>
                                <td className="p-4 text-right text-green-600">{totalPaid.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (selectedStaffId && !loading && (
                <div className="p-8 text-center border rounded-lg bg-muted/20 text-muted-foreground">
                    No payment history found for this employee.
                </div>
            ))}
        </div>
    );
}
