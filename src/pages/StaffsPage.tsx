
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
    getTeachers, createTeacher, updateTeacher, deleteTeacher,
    getStaffMembers, createStaffMember, updateStaffMember, deleteStaffMember
} from '@/lib/api';
import { type Teacher, type Staff } from '@/types';

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
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
                <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                >
                    <Plus className="mr-2 h-4 w-4" /> Add {activeTab === 'teachers' ? 'Teacher' : 'Staff'}
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b flex gap-6">
                <button
                    onClick={() => setActiveTab('teachers')}
                    className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'teachers' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Teachers
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`pb-2 text-sm font-medium transition-colors ${activeTab === 'staff' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Support Staff
                </button>
            </div>

            {/* Search */}
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    placeholder={`Search ${activeTab}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
            </div>

            {/* List */}
            <div className="rounded-md border bg-card">
                <div className="grid grid-cols-12 gap-4 p-4 border-b font-medium text-sm text-muted-foreground">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-3">Role/Designation</div>
                    <div className="col-span-3">Contact</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>
                {filteredList.length > 0 ? filteredList.map((item: any) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-0 text-sm items-center hover:bg-muted/50 transition-colors">
                        <div className="col-span-4 font-medium">{item.first_name} {item.last_name}</div>
                        <div className="col-span-3">
                            <div className="text-foreground">{item.designation}</div>
                            <div className="text-xs text-muted-foreground">{item.category}</div>
                        </div>
                        <div className="col-span-3">
                            <div>{item.email || '-'}</div>
                            <div className="text-muted-foreground">{item.phone || item.mobile_number || '-'}</div>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                            <button onClick={() => handleEdit(item)} className="p-2 hover:bg-muted rounded-md text-blue-600">
                                <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-muted rounded-md text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="p-8 text-center text-muted-foreground">No records found.</div>
                )}
            </div>

            {/* Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold">{editingId ? 'Edit' : 'Add'} {activeTab === 'teachers' ? 'Teacher' : 'Staff Member'}</h2>
                            <button onClick={() => setIsDialogOpen(false)}><X className="h-5 w-5" /></button>
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
                                <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
