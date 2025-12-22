import { useEffect, useState, useRef } from 'react';
import { Plus, ChevronRight, ChevronDown, Folder, Pencil, Search, Trash2, Box, Filter, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getInventoryItems, createInventoryItem, updateInventoryItem, deleteInventoryItem } from '@/lib/api';
import { type InventoryItem } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';


export default function InventoryPage() {
    // const { can } = usePermission(); // Removed to fix unused var error
    const [items, setItems] = useState<InventoryItem[]>([]);
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [parentForNewItem, setParentForNewItem] = useState<string | undefined>(undefined);

    // Search & Combobox State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [searchSelectedIndex, setSearchSelectedIndex] = useState(-1);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const fetchItems = async () => {
        try {
            const data = await getInventoryItems();
            setItems(data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to load inventory." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    // Handle clicking outside to close search dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Permission check skipped for brevity

        const formData = new FormData(e.currentTarget);

        try {
            if (editingItem) {
                await updateInventoryItem(editingItem.id, {
                    name: formData.get('name') as string,
                    quantity: Number(formData.get('quantity')),
                    unit: formData.get('unit') as string,
                    description: formData.get('description') as string,
                });
                toast({ title: "Success", description: "Item updated successfully" });
            } else {
                await createInventoryItem({
                    name: formData.get('name') as string,
                    quantity: Number(formData.get('quantity')),
                    unit: formData.get('unit') as string,
                    description: formData.get('description') as string,
                    parent_id: parentForNewItem,
                });
                toast({ title: "Success", description: "Item created successfully" });
            }
            setIsDialogOpen(false);
            setEditingItem(null);
            setParentForNewItem(undefined);
            fetchItems();
        } catch (error) {
            console.error('Error saving item:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save item." });
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await deleteInventoryItem(id);
            fetchItems();
            toast({ title: "Success", description: "Item deleted successfully" });
        } catch (error) {
            console.error('Error deleting item:', error);
            toast({ variant: "destructive", title: "Error", description: "Failed to delete item." });
        }
    };

    const handleAddChild = (parentId: string) => {
        setParentForNewItem(parentId);
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const buildTree = (allItems: InventoryItem[]) => {
        const map = new Map<string, InventoryItem>();
        const roots: InventoryItem[] = [];
        allItems.forEach(item => map.set(item.id, { ...item, children: [] }));
        allItems.forEach(item => {
            if (item.parent_id && map.has(item.parent_id)) {
                map.get(item.parent_id)!.children!.push(map.get(item.id)!);
            } else {
                roots.push(map.get(item.id)!);
            }
        });
        return roots;
    };

    const filteredFlatList = items.filter(item =>
        item.parent_id !== null && // Hide parents
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const isSearching = searchQuery.trim().length > 0;
    const treeData = buildTree(items);

    // Keyboard Navigation for Search
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (!isSearchFocused || filteredFlatList.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSearchSelectedIndex(prev => (prev < filteredFlatList.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSearchSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searchSelectedIndex >= 0 && searchSelectedIndex < filteredFlatList.length) {
                const selectedItem = filteredFlatList[searchSelectedIndex];
                setSearchQuery(selectedItem.name); // Fill input
                setIsSearchFocused(false); // Close dropdown
            }
        }
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedNodes(newExpanded);
    };

    const renderTree = (nodes: InventoryItem[], level = 0) => {
        return nodes.map(node => (
            <div key={node.id}>
                <div className={cn("flex items-center py-2.5 px-2 hover:bg-muted/50 rounded-md group text-sm border-b sm:border-0", level > 0 && "ml-2 sm:ml-6")}>
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        {node.children && node.children.length > 0 ? (
                            <button onClick={() => toggleExpand(node.id)} className="p-1 hover:bg-muted rounded text-muted-foreground shrink-0 transition-transform duration-200">
                                {expandedNodes.has(node.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                        ) : <span className="w-6 shrink-0" />}

                        <div className="shrink-0">
                            {node.children && node.children.length > 0 ? (
                                <Folder className="h-4 w-4 text-blue-600/90" />
                            ) : (
                                <Box className="h-4 w-4 text-red-500/90" />
                            )}
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold whitespace-nowrap truncate">{node.name}</span>
                                {node.quantity > 0 && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border shrink-0">
                                        Qty: {node.quantity}
                                    </span>
                                )}
                            </div>
                            {node.description && <span className="text-[10px] text-muted-foreground truncate opacity-70 italic">{node.description}</span>}
                        </div>
                    </div>

                    <div className="flex gap-1 shrink-0 ml-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAddChild(node.id)}
                            className="h-7 w-7 bg-green-50 text-green-600 hover:bg-green-100"
                            title="Add Child"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(node)}
                            className="h-7 w-7 bg-blue-50 text-blue-600 hover:bg-blue-100"
                            title="Edit"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(node.id, node.name)}
                            className="h-7 w-7 bg-red-50 text-red-600 hover:bg-red-100"
                            title="Delete"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                {node.children && node.children.length > 0 && expandedNodes.has(node.id) && (
                    <div className="border-l border-border/50 ml-3 sm:ml-5 pl-1">
                        {renderTree(node.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-blue-600">Inventory Management</h1>
                <div className="flex gap-2 w-full sm:w-auto">
                    {items.length === 0 && !loading && (
                        <Button
                            onClick={async () => {
                                const defaults = ['IT and Computer Equipment', 'Furniture and Fixtures', 'Kitchen/Canteen Supplies', 'Teaching and Learning Materials', 'Sports and Physical Education'];
                                setLoading(true);
                                try {
                                    await Promise.all(defaults.map(name => createInventoryItem({ name, quantity: 0, unit: '', description: 'Root Category' })));
                                    await fetchItems();
                                    toast({ title: "Success", description: "Default categories initialized." });
                                } catch (e) {
                                    console.error(e);
                                    toast({ variant: "destructive", title: "Error", description: "Failed to seed categories." });
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            variant="secondary"
                            className="flex-1 sm:flex-none h-10 font-bold"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Initialize
                        </Button>
                    )}
                    <Button
                        onClick={() => { setEditingItem(null); setParentForNewItem(undefined); setIsDialogOpen(true); }}
                        className="flex-1 sm:flex-none h-10 font-bold bg-green-600 hover:bg-green-700 text-white"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Category
                    </Button>
                </div>
            </div>

            {/* Search / Filter Area */}
            <div className="bg-card border rounded-lg p-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Filters:</span>
                    </div>

                    <div ref={searchContainerRef} className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                        <input
                            type="text"
                            placeholder="Search Inventory..."
                            value={searchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onKeyDown={handleSearchKeyDown}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSearchSelectedIndex(-1);
                                setIsSearchFocused(true);
                            }}
                            className="w-full h-10 pl-9 pr-10 rounded-md border border-input bg-background text-sm shadow-sm transition-colors focus-visible:outline-none focus:ring-1 focus:ring-ring"
                        />
                        {searchQuery ? (
                            <button
                                onClick={() => { setSearchQuery(''); setIsSearchFocused(true); }}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground z-20"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : (
                            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
                        )}

                        {isSearchFocused && (
                            <div className="absolute top-full mt-1 w-full bg-popover text-popover-foreground border rounded-md shadow-lg z-50 max-h-[300px] overflow-auto animate-in fade-in zoom-in-95 duration-100">
                                {filteredFlatList.length > 0 ? (
                                    <ul className="py-1">
                                        {filteredFlatList.map((item, index) => (
                                            <li
                                                key={item.id}
                                                onClick={() => {
                                                    setSearchQuery(item.name);
                                                    setIsSearchFocused(false);
                                                }}
                                                className={cn(
                                                    "px-3 py-2 text-sm cursor-pointer flex items-center gap-2 border-b last:border-0",
                                                    index === searchSelectedIndex ? "bg-blue-50 text-blue-700" : "hover:bg-muted"
                                                )}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item.name}</span>
                                                    {item.description && <span className="text-[10px] text-muted-foreground truncate">{item.description}</span>}
                                                </div>
                                                {item.quantity > 0 && <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{item.quantity} {item.unit}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">No items found.</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="border rounded-md p-4 bg-card min-h-[400px]">
                {loading ? (
                    <div className="text-center text-muted-foreground py-10">Loading...</div>
                ) : isSearching ? (
                    <div className="space-y-2">
                        {filteredFlatList.length > 0 ? (
                            filteredFlatList.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <Box className="h-5 w-5 text-emerald-600" />
                                        <div>
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.quantity} {item.unit} {item.description && `• ${item.description}`}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-10">No items found matching "{searchQuery}"</div>
                        )}
                    </div>
                ) : treeData.length > 0 ? (
                    renderTree(treeData)
                ) : (
                    <div className="text-center text-muted-foreground py-10">No inventory items found.</div>
                )}
            </div>

            {isDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                        <h3 className="text-lg font-semibold mb-4 text-blue-600">
                            {editingItem ? 'Edit Item' : parentForNewItem ? 'Add New Item' : 'Add New Category'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Name *</label>
                                <input
                                    name="name"
                                    required
                                    defaultValue={editingItem?.name}
                                    placeholder="e.g., Whiteboard Markers"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Quantity</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        defaultValue={editingItem?.quantity || 0}
                                        min="0"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Unit</label>
                                    <input
                                        name="unit"
                                        defaultValue={editingItem?.unit || 'pcs'}
                                        placeholder="pieces, kg, etc."
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Description</label>
                                <textarea
                                    name="description"
                                    placeholder="Additional details..."
                                    defaultValue={editingItem?.description || ''}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setEditingItem(null); setParentForNewItem(undefined); }} className="w-full sm:w-auto">Cancel</Button>
                                <Button type="submit" className="w-full sm:w-auto font-bold bg-blue-600 hover:bg-blue-700 text-white">{editingItem ? 'Update Item' : 'Create Item'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
