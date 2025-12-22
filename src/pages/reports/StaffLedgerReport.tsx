
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getExpenses, getStaffMembers, getTeachers, getFiscalYears } from '@/lib/api';
import { Loader2, Search, X, Filter } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toNepali } from '@/lib/nepaliDate';
import { type FiscalYear } from '@/types';
import { Button } from '@/components/ui/button';

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

    // Fiscal Year State
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [selectedFyId, setSelectedFyId] = useState('');

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
                const [staff, teachers, fyData] = await Promise.all([
                    getStaffMembers(),
                    getTeachers(),
                    getFiscalYears()
                ]);

                setFiscalYears(fyData || []);
                // Auto-select active FY
                const activeFy = fyData?.find((f: any) => f.is_active);
                if (activeFy) setSelectedFyId(activeFy.id);

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

            // Determine Date Range from Selected Fiscal Year
            const selectedFy = fiscalYears.find(f => f.id === selectedFyId);
            const startDate = selectedFy ? new Date(selectedFy.start_date) : new Date('1970-01-01');
            const endDate = selectedFy ? new Date(selectedFy.end_date) : new Date('2100-12-31');

            // Helper to check if date is within range
            const isWithin = (dateStr: string) => {
                const d = new Date(dateStr);
                return d >= startDate && d <= endDate;
            };

            // Filter expenses that look like salary for this person AND are within FY
            const staffExpenses = allExpenses.filter(e =>
                e.description?.includes(`Salary Payment for ${staffName}`) &&
                isWithin(e.expense_date)
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

    // Reload ledger when FY changes
    useEffect(() => {
        if (selectedStaffId) {
            const staff = staffList.find(s => s.id === selectedStaffId);
            if (staff) {
                loadLedger(staff.id, staff.name);
            }
        }
    }, [selectedFyId]);

    // Clear ledger when staff selection is cleared
    useEffect(() => {
        if (!selectedStaffId) {
            setLedger([]);
        }
    }, [selectedStaffId]);

    if (initLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-blue-600">Staff / Teacher Ledger</h1>
            </div>

            {/* Filter Bar */}
            <div className="bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="w-full md:w-48 space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 flex items-center gap-1">
                            <Filter className="h-3 w-3" /> Fiscal Year
                        </label>
                        <select
                            value={selectedFyId}
                            onChange={(e) => setSelectedFyId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="">All Time</option>
                            {fiscalYears.map(fy => (
                                <option key={fy.id} value={fy.id}>{fy.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1 flex items-center gap-1">
                            <Search className="h-3 w-3" /> Employee Search
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search Staff / Teacher..."
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedStaffId('');
                                    }}
                                    className="absolute inset-y-0 right-0 h-full w-9 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}

                            {isSearchFocused && (searchQuery || filteredStaffList.length > 0) && (
                                <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-lg animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                                    {filteredStaffList.map((s, i) => (
                                        <div
                                            key={s.id}
                                            className={cn(
                                                "px-4 py-2.5 cursor-pointer text-sm border-b last:border-0",
                                                focusedIndex === i ? 'bg-blue-50 text-blue-700' : 'hover:bg-muted'
                                            )}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSearchQuery(s.name);
                                                setSelectedStaffId(s.id);
                                                setIsSearchFocused(false);
                                                loadLedger(s.id, s.name);
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold">{s.name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{s.role}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredStaffList.length === 0 && (
                                        <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {ledger.length > 0 ? (
                <div className="space-y-4">
                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {ledger.map((entry) => (
                            <div key={entry.id} className="bg-card rounded-lg border shadow-sm p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{toNepali(entry.date)}</div>
                                        <div className="text-[9px] text-muted-foreground">{formatDate(entry.date)}</div>
                                    </div>
                                    <div className="font-black text-green-600">NPR {entry.amount.toLocaleString()}</div>
                                </div>
                                <div className="text-sm font-medium text-foreground">{entry.description}</div>
                            </div>
                        ))}
                        <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase text-green-700 tracking-widest">Total Paid</span>
                            <span className="font-black text-lg text-green-700">NPR {totalPaid.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-lg border bg-card overflow-hidden shadow-sm">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase text-[11px] tracking-widest">
                                    <th className="h-12 px-4 text-left align-middle">Date(BS)</th>
                                    <th className="h-12 px-4 text-left align-middle">Date(AD)</th>
                                    <th className="h-12 px-4 text-left align-middle">Description</th>
                                    <th className="h-12 px-4 text-right align-middle">Amount Paid</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {ledger.map((entry) => (
                                    <tr key={entry.id} className="transition-colors hover:bg-slate-50">
                                        <td className="p-4 align-middle font-medium whitespace-nowrap">{toNepali(entry.date)}</td>
                                        <td className="p-4 align-middle text-muted-foreground text-xs">{formatDate(entry.date)}</td>
                                        <td className="p-4 align-middle font-medium">{entry.description}</td>
                                        <td className="p-4 align-middle text-right font-black text-green-600">NPR {entry.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-bold">
                                    <td colSpan={3} className="p-4 text-right text-[11px] uppercase tracking-widest text-muted-foreground">Total Paid</td>
                                    <td className="p-4 text-right text-green-700 font-black text-lg">NPR {totalPaid.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (selectedStaffId && !loading && (
                <div className="p-8 text-center border rounded-lg bg-muted/20 text-muted-foreground">
                    No payment history found for this employee.
                </div>
            ))}
        </div>
    );
}
