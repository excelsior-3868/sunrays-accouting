import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getRoles } from '@/lib/api';
import { Search, Loader2, UserPlus, Eye, EyeOff, Pencil, Trash2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { type Role } from '@/types';
import { usePermission } from '@/hooks/usePermission';
import { Button } from '@/components/ui/button';
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

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Users</h2>
                    <p className="text-muted-foreground">Manage system users and access.</p>
                </div>
                {canManage && (
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    {isSearchOpen && (searchQuery.length > 0 || users.length > 0) && (
                        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md animate-in fade-in-0 zoom-in-95 max-h-[300px] overflow-y-auto">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user, index) => (
                                    <div
                                        key={user.id}
                                        className={`px-3 py-2 cursor-pointer text-sm ${index === selectedIndex ? "bg-accent" : "hover:bg-accent"}`}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setSearchQuery(user.full_name || user.email);
                                            setIsSearchOpen(false);
                                        }}
                                    >
                                        <div className="font-medium">{user.full_name || 'No Name'}</div>
                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-2 text-sm text-muted-foreground text-center">No users found</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-lg border bg-white overflow-hidden">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors bg-blue-600 text-primary-foreground hover:bg-blue-600/90 data-[state=selected]:bg-muted">
                                <th className="h-10 px-4 text-left align-middle font-medium">Name</th>
                                <th className="h-10 px-4 text-left align-middle font-medium">Email</th>
                                <th className="h-10 px-4 text-left align-middle font-medium">Role</th>
                                <th className="h-10 px-4 text-left align-middle font-medium">Created At</th>
                                {canManage && <th className="h-10 px-4 text-right align-middle font-medium">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {loading ? (
                                <tr>
                                    <td colSpan={canManage ? 5 : 4} className="p-4 text-center">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                        Loading...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={canManage ? 5 : 4} className="p-4 text-center">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle font-medium">{user.full_name || '-'}</td>
                                        <td className="p-4 align-middle">{user.email}</td>
                                        <td className="p-4 align-middle capitalize">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${user.role?.name === 'Admin' || user.role?.name === 'Super Admin' ? 'bg-red-500/15 text-red-700' : 'bg-blue-500/15 text-blue-700'
                                                }`}>
                                                {user.role?.name || 'User'}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle">{new Date(user.created_at).toLocaleDateString()}</td>
                                        {canManage && (
                                            <td className="p-4 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(user)}
                                                        className="h-8 w-8 text-primary hover:bg-primary/20"
                                                        title="Edit User"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick(user)}
                                                        className="h-8 w-8 text-red-600 hover:bg-red-100"
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
                        <h3 className="mb-4 text-lg font-semibold">Create New User</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Full Name (Display Name)</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                    placeholder="user@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Role</label>
                                <select
                                    value={newUserRoleId}
                                    onChange={(e) => setNewUserRoleId(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm bg-transparent"
                                >
                                    <option value="" disabled>Select Role</option>
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Password</label>
                                <p className="text-xs text-muted-foreground">User will receive an email to set their password (if configured), or set initial here.</p>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 pr-10 text-sm bg-transparent"
                                        placeholder="Initial password (required)"
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
                                <label className="text-sm font-medium">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={newUserConfirmPassword}
                                        onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input px-3 py-1 pr-10 text-sm bg-transparent"
                                        placeholder="Confirm password"
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
                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createLoading}
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
                            <div className="flex justify-end gap-2 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={updateLoading}
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
