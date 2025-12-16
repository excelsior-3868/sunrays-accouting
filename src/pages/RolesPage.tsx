import { useState, useEffect } from 'react';
import { getRoles, getPermissions, createRole, updateRole, deleteRole } from '@/lib/api';
import { Loader2, Plus, Pencil, Trash2, Shield, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { type Role, type Permission } from '@/types';
import { usePermission } from '@/hooks/usePermission';

export default function RolesPage() {
    const { can } = usePermission();
    const canManage = can('roles.manage');
    const { toast } = useToast();

    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesData, permissionsData] = await Promise.all([
                getRoles(),
                getPermissions()
            ]);
            setRoles(rolesData);
            setPermissions(permissionsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (role?: Role) => {
        if (!canManage) return;
        if (role) {
            setEditingRole(role);
            setFormData({ name: role.name, description: role.description || '' });
            setSelectedPermissions(new Set(role.permissions?.map(p => p.id) || []));
        } else {
            setEditingRole(null);
            setFormData({ name: '', description: '' });
            setSelectedPermissions(new Set());
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManage) return;
        setSaving(true);
        try {
            const permIds = Array.from(selectedPermissions);
            if (editingRole) {
                await updateRole(editingRole.id, formData, permIds);
                toast({ title: "Success", description: "Role updated successfully" });
            } else {
                await createRole(formData, permIds);
                toast({ title: "Success", description: "Role created successfully" });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: "Error saving role: " + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!canManage) return;
        if (!confirm('Are you sure you want to delete this role? Users assigned to this role may lose access.')) return;
        try {
            await deleteRole(id);
            fetchData();
            toast({ title: "Success", description: "Role deleted successfully" });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: "Error deleting role: " + error.message });
        }
    };

    const togglePermission = (id: string) => {
        const newSet = new Set(selectedPermissions);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedPermissions(newSet);
    };

    // Group permissions by resource (first part of slug)
    const groupedPermissions = permissions.reduce((acc, perm) => {
        const resource = perm.slug.split('.')[0];
        if (!acc[resource]) acc[resource] = [];
        acc[resource].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
                    <p className="text-muted-foreground">Manage user roles and their associated permissions.</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        Create Role
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {roles.map((role) => (
                        <div key={role.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
                                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-blue-600" />
                                    {role.name}
                                </h3>
                                {canManage && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(role)} className="text-muted-foreground hover:text-foreground">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        {role.name !== 'Super Admin' && ( // Prevent deleting Super Admin if desired
                                            <button onClick={() => handleDelete(role.id)} className="text-destructive hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="p-6 pt-0">
                                <p className="text-sm text-muted-foreground mb-4">{role.description || 'No description'}</p>
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold uppercase text-muted-foreground">Permissions ({role.permissions?.length || 0})</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions?.slice(0, 5).map(perm => (
                                            <span key={perm.id} className="inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium text-foreground">
                                                {perm.slug}
                                            </span>
                                        ))}
                                        {(role.permissions?.length || 0) > 5 && (
                                            <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                +{role.permissions!.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-lg bg-background p-6 shadow-lg bg-white my-8">
                        <h3 className="mb-4 text-lg font-semibold">{editingRole ? 'Edit Role' : 'Create New Role'}</h3>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Role Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                        placeholder="e.g. Accountant"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                        placeholder="Role description"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 border rounded-md p-4 bg-muted/30 max-h-[400px] overflow-y-auto">
                                <h4 className="text-sm font-medium">Permissions</h4>
                                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                                    <div key={resource} className="space-y-2">
                                        <h5 className="text-xs font-semibold uppercase text-muted-foreground border-b pb-1">{resource}</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {perms.map(perm => (
                                                <label key={perm.id} className="flex items-center space-x-2 rounded border p-2 hover:bg-muted cursor-pointer bg-white">
                                                    <div
                                                        className={`flex h-4 w-4 items-center justify-center rounded border ${selectedPermissions.has(perm.id)
                                                            ? 'bg-primary border-primary bg-blue-600 border-blue-600 text-white'
                                                            : 'border-input'
                                                            }`}
                                                    >
                                                        {selectedPermissions.has(perm.id) && <Check className="h-3 w-3" />}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={selectedPermissions.has(perm.id)}
                                                        onChange={() => togglePermission(perm.id)}
                                                    />
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium leading-none">{perm.slug}</p>
                                                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingRole ? 'Update Role' : 'Create Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
