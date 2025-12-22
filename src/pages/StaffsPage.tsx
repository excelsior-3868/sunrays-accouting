
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Search, Loader2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
    getTeachers, createTeacher, updateTeacher, deleteTeacher,
    getStaffMembers, createStaffMember, updateStaffMember, deleteStaffMember
} from '@/lib/api';
import { type Teacher, type Staff } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function StaffsPage() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<'teachers' | 'staff'>('teachers');
    const [loading, setLoading] = useState(true);

    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Dialog
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Search Dropdown State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    // Generic Form Data
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        designation: '',
        category: '', // Teaching Staff / Support Staff or other
        employment_type: 'Full Time',
        service_status: 'Active'
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tData, sData] = await Promise.all([
                getTeachers(),
                getStaffMembers()
            ]);
            setTeachers(tData);
            setStaff(sData);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredList = activeTab === 'teachers'
        ? teachers.filter(t => `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
        : staff.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()));

    // Reset selected index when search query changes
    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchQuery, isSearchOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const listToNavigate = filteredList.slice(0, 10); // Use same slice as render
        if (!isSearchOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsSearchOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => prev < listToNavigate.length - 1 ? prev + 1 : prev);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && listToNavigate[selectedIndex]) {
                    const item = listToNavigate[selectedIndex];
                    const name = `${item.first_name} ${item.last_name}`;
                    setSearchQuery(name);
                    setIsSearchOpen(false);
                }
                break;
            case 'Escape':
                setIsSearchOpen(false);
                break;
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            address: '',
            designation: activeTab === 'teachers' ? 'Teacher' : 'Staff',
            category: activeTab === 'teachers' ? 'Teaching Staff' : 'Support Staff',
            employment_type: 'Full Time',
            service_status: 'Active'
        });
        setIsDialogOpen(true);
    };

    const handleEdit = (item: Teacher | Staff) => {
        setEditingId(item.id);
        // Map fields safely
        setFormData({
            first_name: item.first_name,
            last_name: item.last_name,
            email: (item as Teacher).email || '',
            phone: (item as Teacher).phone || (item as Staff).mobile_number || '',
            address: item.address || '',
            designation: item.designation || '',
            category: item.category || '',
            employment_type: (item as Staff).employment_type || 'Full Time',
            service_status: (item as Staff).service_status || 'Active'
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`Are you sure you want to delete this ${activeTab === 'teachers' ? 'Teacher' : 'Staff Member'}?`)) return;
        try {
            if (activeTab === 'teachers') {
                await deleteTeacher(id);
            } else {
                await deleteStaffMember(id);
            }
            toast({ title: "Success", description: "Deleted successfully" });
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete" });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload: any = {
                first_name: formData.first_name,
                last_name: formData.last_name,
                address: formData.address,
                designation: formData.designation,
                category: formData.category,
            };

            if (activeTab === 'teachers') {
                payload.email = formData.email;
                payload.phone = formData.phone;

                if (editingId) await updateTeacher(editingId, payload);
                else await createTeacher(payload);
            } else {
                payload.mobile_number = formData.phone;
                payload.employment_type = formData.employment_type;
                payload.service_status = formData.service_status;

                if (editingId) await updateStaffMember(editingId, payload);
                else await createStaffMember(payload);
            }

            toast({ title: "Success", description: "Saved successfully" });
            setIsDialogOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save" });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-blue-600">Staff Management</h1>
                <Button
                    onClick={handleOpenCreate}
                    className="w-full sm:w-auto font-bold bg-green-600 hover:bg-green-700 text-white"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add {activeTab === 'teachers' ? 'Teacher' : 'Staff'}
                </Button>
            </div>

            {/* Tabs */}
            <div className="border-b flex gap-6">
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('teachers')}
                    className={cn(
                        "rounded-none border-b-2 bg-transparent px-2 pb-2 pt-1 font-medium hover:bg-transparent",
                        activeTab === 'teachers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    Teachers
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('staff')}
                    className={cn(
                        "rounded-none border-b-2 bg-transparent px-2 pb-2 pt-1 font-medium hover:bg-transparent",
                        activeTab === 'staff' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                >
                    Support Staff
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Quick Search</span>
                    </div>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            placeholder={`Search ${activeTab === 'teachers' ? 'Teachers' : 'Support Staff'}...`}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                            onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                            onKeyDown={handleKeyDown}
                            className="pl-10 flex h-10 sm:h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {isSearchOpen && (searchQuery.length > 0 || filteredList.length > 0) && (
                            <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-lg animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                                {filteredList.length > 0 ? (
                                    filteredList.slice(0, 10).map((item: any, index: number) => (
                                        <div
                                            key={item.id}
                                            className={`px-4 py-2.5 cursor-pointer text-sm border-b last:border-0 ${index === selectedIndex ? "bg-accent" : "hover:bg-accent"}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSearchQuery(`${item.first_name} ${item.last_name}`);
                                                setIsSearchOpen(false);
                                            }}
                                        >
                                            <div className="font-bold text-blue-600">{item.first_name} {item.last_name}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{item.designation} • {item.category}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-sm text-muted-foreground text-center">No results found.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="hidden sm:grid grid-cols-12 gap-4 p-4 border-b font-bold text-xs uppercase tracking-wider transition-colors bg-blue-600 text-primary-foreground">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-3">Role / Designation</div>
                    <div className="col-span-3">Contact Information</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>
                {filteredList.length > 0 ? (
                    <div className="divide-y">
                        {filteredList.map((item: any) => (
                            <div key={item.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 p-4 text-sm items-center hover:bg-muted/30 transition-colors">
                                <div className="sm:col-span-4 flex flex-col">
                                    <span className="font-bold text-base sm:text-sm text-foreground">{item.first_name} {item.last_name}</span>
                                    <span className="sm:hidden text-xs text-muted-foreground">{item.designation} ({item.category})</span>
                                </div>
                                <div className="hidden sm:block sm:col-span-3">
                                    <div className="font-medium text-foreground">{item.designation}</div>
                                    <div className="text-[10px] uppercase tracking-tighter text-muted-foreground font-bold">{item.category}</div>
                                </div>
                                <div className="sm:col-span-3">
                                    <div className="flex items-center gap-1.5 text-muted-foreground sm:text-foreground">
                                        <span className="sm:hidden font-medium text-xs">Ph:</span>
                                        {item.phone || item.mobile_number || '-'}
                                    </div>
                                    {item.email && (
                                        <div className="hidden sm:block text-xs text-muted-foreground truncate" title={item.email}>{item.email}</div>
                                    )}
                                </div>
                                <div className="sm:col-span-2 flex justify-end gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(item)}
                                        className="h-9 w-9 border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100"
                                        title="Edit"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(item.id)}
                                        className="h-9 w-9 border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <Search className="h-10 w-10 mb-2 opacity-10" />
                        <p className="font-medium">No records found matching your search.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-blue-600 uppercase tracking-widest">{editingId ? 'Edit' : 'Add'} {activeTab === 'teachers' ? 'Teacher' : 'Staff Member'}</h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(false)}><X className="h-5 w-5" /></Button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">First Name</label>
                                    <input required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Last Name</label>
                                    <input required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Designation</label>
                                <input value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm" placeholder="e.g. Senior Teacher, Driver" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {activeTab === 'teachers' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email</label>
                                        <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phone / Mobile</label>
                                    <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Address</label>
                                <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="flex min-h-[60px] w-full rounded-md border border-input px-3 py-2 text-sm" />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">Save</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
