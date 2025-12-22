import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getRoles } from '@/lib/api';
import { Search, Loader2, UserPlus, Eye, EyeOff, Pencil, Trash2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { type Role } from '@/types';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UsersPage() {
    const { can } = usePermission();
    const canManage = can('users.manage');
    const { toast } = useToast();

    const [users, setUsers] = useState<any[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [userToDelete, setUserToDelete] = useState<any>(null);

    // Create form state
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRoleId, setNewUserRoleId] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editRoleId, setEditRoleId] = useState('');

    // Visibility state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [createLoading, setCreateLoading] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);

    // Filtered Users Logic (Moved up for accessibility)
    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Keyboard Navigation
    const [selectedIndex, setSelectedIndex] = useState(-1);

    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchQuery]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isSearchOpen || filteredUsers.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => prev < filteredUsers.length - 1 ? prev + 1 : prev);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && filteredUsers[selectedIndex]) {
                    const user = filteredUsers[selectedIndex];
                    setSearchQuery(user.full_name || user.email);
                    setIsSearchOpen(false);
                }
                break;
            case 'Escape':
                setIsSearchOpen(false);
                break;
        }
    };

    useEffect(() => {
        fetchData();
    }, [canManage]); // Refetch if permission changes (unlikely but safe)

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Users
            try {
                const usersData = await fetchUsersData();
                setUsers(usersData || []);
            } catch (err: any) {
                console.error("Error fetching users:", err);
                toast({ variant: "destructive", title: "Error", description: "Failed to load users: " + err.message });
            }

            // Fetch Roles (independently)
            try {
                const rolesData = await getRoles();
                setRoles(rolesData || []);

                // Set default role for new user to 'User' or first one
                if (rolesData && rolesData.length > 0) {
                    const defaultRole = rolesData.find((r: Role) => r.name === 'User') || rolesData[0];
                    if (defaultRole) setNewUserRoleId(defaultRole.id);
                } else {
                    console.warn("Roles fetched but returned empty array.");
                }
            } catch (err: any) {
                console.error("Error fetching roles:", err);
                // Temporarily alert to help debug
                // alert("Failed to load roles (Likely RLS issue): " + err.message);
            }

        } catch (error: any) {
            // Catch any other unforeseen errors
            console.error('General error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };


    const fetchUsersData = async () => {
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                role:roles!role(id, name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManage) return;

        setCreateLoading(true);
        try {
            if (newUserPassword !== newUserConfirmPassword) {
                toast({ variant: "destructive", title: "Error", description: "Passwords do not match" });
                setCreateLoading(false);
                return;
            }

            if (!newUserPassword) {
                toast({ variant: "destructive", title: "Error", description: "Password is required for initial creation." });
                setCreateLoading(false);
                return;
            }

            if (!newUserRoleId) {
                toast({ variant: "destructive", title: "Error", description: "Please select a role." });
                setCreateLoading(false);
                return;
            }

            // Attempt to create user via Auth
            const { data, error } = await supabase.auth.signUp({
                email: newUserEmail,
                password: newUserPassword,
                options: {
                    data: {
                        full_name: newUserName,
                        role: newUserRoleId
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPassword('');
                setNewUserConfirmPassword('');
                // Reset role to default if exists
                if (roles.length > 0) {
                    const defaultRole = roles.find(r => r.name === 'User') || roles[0];
                    if (defaultRole) setNewUserRoleId(defaultRole.id);
                }

                setIsCreateModalOpen(false);
                toast({ title: "Success", description: "User created successfully! Please check email for confirmation if enabled." });
                const updatedUsers = await fetchUsersData();
                setUsers(updatedUsers || []);
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: "Error creating user: " + error.message });
        } finally {
            setCreateLoading(false);
        }
    };

    const handleEdit = (user: any) => {
        if (!canManage) return;
        setEditingUser(user);
        setEditName(user.full_name || '');
        setEditRoleId(user.role?.id || '');
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser || !canManage) return;

        if (!editRoleId) {
            toast({ variant: "destructive", title: "Error", description: "Please select a valid role." });
            return;
        }

        setUpdateLoading(true);

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: editName,
                    role: editRoleId
                })
                .eq('id', editingUser.id);

            if (error) throw error;

            setIsEditModalOpen(false);
            setEditingUser(null);
            const updatedUsers = await fetchUsersData();
            setUsers(updatedUsers || []);
            toast({ title: "Success", description: "User updated successfully." });
        } catch (error: any) {
            console.error('Error updating user:', error);
            toast({ variant: "destructive", title: "Error", description: "Error updating user: " + error.message });
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleDeleteClick = (user: any) => {
        if (!canManage) return;
        setUserToDelete(user);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userToDelete.id);

            if (error) throw error;
            const updatedUsers = await fetchUsersData();
            setUsers(updatedUsers || []);
            toast({ title: "Success", description: "User deleted successfully" });
        } catch (error: any) {
            console.error("Error deleting user:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete user: " + error.message });
        } finally {
            setUserToDelete(null);
        }
    };

    return (
        <div className="space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-blue-600">Users</h1>
                    <p className="text-muted-foreground">Manage system users and access.</p>
                </div>
                {canManage && (
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full sm:w-auto h-10 font-bold bg-green-600 hover:bg-green-700 text-white"
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="bg-card border rounded-lg p-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Filters:</span>
                    </div>

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                            onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                            onKeyDown={handleKeyDown}
                            className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {isSearchOpen && (searchQuery.length > 0 || users.length > 0) && (
                            <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-lg animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                                {filteredUsers.length > 0 ? (
                                    <ul className="py-1">
                                        {filteredUsers.map((user, index) => (
                                            <li
                                                key={user.id}
                                                className={cn(
                                                    "px-3 py-2 cursor-pointer text-sm border-b last:border-0",
                                                    index === selectedIndex ? "bg-blue-50 text-blue-700" : "hover:bg-muted"
                                                )}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setSearchQuery(user.full_name || user.email);
                                                    setIsSearchOpen(false);
                                                }}
                                            >
                                                <div className="font-medium">{user.full_name || 'No Name'}</div>
                                                <div className="text-[10px] text-muted-foreground">{user.email}</div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-4 text-sm text-muted-foreground text-center">No users found</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile List View (Cards) */}
            <div className="grid grid-cols-1 gap-4 sm:hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-card border rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                        <p className="text-sm text-muted-foreground font-medium">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center bg-card border rounded-lg text-muted-foreground">
                        No users found.
                    </div>
                ) : (
                    filteredUsers.map((user) => (
                        <div key={user.id} className="bg-card border rounded-lg p-4 shadow-sm hover:ring-1 hover:ring-blue-500 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg text-foreground truncate">{user.full_name || '-'}</h3>
                                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                                </div>
                                <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                    user.role?.name === 'Super Admin' ? 'bg-red-50 text-red-700 border-red-100' :
                                        user.role?.name === 'Admin' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                            'bg-blue-50 text-blue-700 border-blue-100'
                                )}>
                                    {user.role?.name || 'User'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest whitespace-nowrap">
                                    Joined: {new Date(user.created_at).toLocaleDateString()}
                                </span>
                                {canManage && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleEdit(user)}
                                            className="h-8 w-8 p-0 text-blue-600 bg-blue-50 hover:bg-blue-100"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleDeleteClick(user)}
                                            className="h-8 w-8 p-0 text-red-600 bg-red-50 hover:bg-red-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block rounded-lg border bg-white overflow-hidden shadow-sm">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-blue-600 text-white hover:bg-blue-700">
                                <th className="h-12 px-4 text-left align-middle font-bold uppercase text-[11px] tracking-widest">Name</th>
                                <th className="h-12 px-4 text-left align-middle font-bold uppercase text-[11px] tracking-widest">Email</th>
                                <th className="h-12 px-4 text-left align-middle font-bold uppercase text-[11px] tracking-widest">Role</th>
                                <th className="h-12 px-4 text-left align-middle font-bold uppercase text-[11px] tracking-widest">Joined</th>
                                {canManage && <th className="h-12 px-4 text-right align-middle font-bold uppercase text-[11px] tracking-widest">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {loading ? (
                                <tr>
                                    <td colSpan={canManage ? 5 : 4} className="p-8 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                                        <p className="text-muted-foreground font-medium">Loading users...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={canManage ? 5 : 4} className="p-8 text-center text-muted-foreground">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b transition-colors hover:bg-slate-50">
                                        <td className="p-4 align-middle font-bold text-slate-900">{user.full_name || '-'}</td>
                                        <td className="p-4 align-middle text-slate-600">{user.email}</td>
                                        <td className="p-4 align-middle">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                                                user.role?.name === 'Super Admin' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    user.role?.name === 'Admin' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                        'bg-blue-50 text-blue-700 border-blue-100'
                                            )}>
                                                {user.role?.name || 'User'}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                        {canManage && (
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(user)}
                                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                        title="Edit User"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(user)}
                                                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg bg-white">
                        <h3 className="mb-4 text-lg font-bold text-blue-600 uppercase tracking-widest">Create New User</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Role *</label>
                                <select
                                    value={newUserRoleId}
                                    onChange={(e) => setNewUserRoleId(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm bg-transparent shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="" disabled>Select Role</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Password *</label>
                                <p className="text-[10px] text-muted-foreground italic mb-1">Set initial password for this user.</p>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input px-3 py-2 pr-10 text-sm bg-transparent shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                        placeholder="Min 6 characters"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        tabIndex={-1}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={newUserConfirmPassword}
                                        onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input px-3 py-2 pr-10 text-sm bg-transparent shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                        placeholder="Confirm selection"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        tabIndex={-1}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t mt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createLoading}
                                    className="w-full sm:w-auto font-bold bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create User
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg bg-white">
                        <h3 className="mb-4 text-lg font-semibold">Edit User</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <select
                                    value={editRoleId}
                                    onChange={(e) => setEditRoleId(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                >
                                    <option value="" disabled>Select Role</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t mt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={updateLoading}
                                    className="w-full sm:w-auto font-bold bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {updateLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update User
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the user profile for <strong>{userToDelete?.full_name || userToDelete?.email}</strong>.
                            They may still exist in the Authentication system but will lose access to this application.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
