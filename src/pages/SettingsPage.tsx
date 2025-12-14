import { useEffect, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { getFiscalYears, createFiscalYear, setActiveFiscalYear } from '@/lib/api';
import { type FiscalYear } from '@/types';


export default function SettingsPage() {
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchYears = async () => {
        try {
            const data = await getFiscalYears();
            setFiscalYears(data);
        } catch (error) {
            console.error('Error fetching fiscal years:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchYears();
    }, []);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newYear = {
            name: formData.get('name') as string,
            start_date: formData.get('start_date') as string,
            end_date: formData.get('end_date') as string,
            is_active: false,
            is_closed: false,
        };

        try {
            await createFiscalYear(newYear);
            setIsDialogOpen(false);
            fetchYears();
        } catch (error) {
            console.error('Error creating fiscal year:', error);
        }
    };

    const handleSetActive = async (id: string) => {
        try {
            await setActiveFiscalYear(id);
            fetchYears();
        } catch (error) {
            console.error('Error setting active year:', error);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Fiscal Years Settings</h1>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Fiscal Years</h2>
                    <button
                        onClick={() => setIsDialogOpen(true)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Fiscal Year
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                    <div className="rounded-md border bg-card">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Start Date</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">End Date</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {fiscalYears.map((fy) => (
                                        <tr key={fy.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="p-4 align-middle font-medium">{fy.name}</td>
                                            <td className="p-4 align-middle">{fy.start_date}</td>
                                            <td className="p-4 align-middle">{fy.end_date}</td>
                                            <td className="p-4 align-middle">
                                                <div className="flex gap-2">
                                                    {fy.is_active && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-500/15 text-green-700">Active</span>}
                                                    {fy.is_closed && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">Closed</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle text-right">
                                                {!fy.is_active && !fy.is_closed && (
                                                    <button onClick={() => handleSetActive(fy.id)} className="text-primary hover:underline text-sm font-medium mr-4">Set Active</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {fiscalYears.length === 0 && (
                                        <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No fiscal years found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Simple Modal Implementation for Speed */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-semibold mb-4">New Fiscal Year</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name (e.g. 2080-2081)</label>
                                <input name="name" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Date</label>
                                    <input type="date" name="start_date" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Date</label>
                                    <input type="date" name="end_date" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
                                <button type="submit" className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium transition-colors rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
