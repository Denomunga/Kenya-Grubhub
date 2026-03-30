import React, { useState, useRef, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Edit, Trash, Plus, X, Search, Grid3x3, List, Package, AlertCircle, DollarSign } from 'lucide-react';
import { useData } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { MenuItem } from '@/lib/data';

// Input sanitization utility
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length to prevent abuse
};

const UNIT_OPTIONS = [
  "pcs",
  "kg",
  "litre",
  "packet",
  "bottle",
  "bag",
  "tube",
  "box",
];

interface DraggableMenuItemProps {
  item: MenuItem;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onDelete: (id: string) => void;
  onEdit: (item: MenuItem) => void;
}

const DraggableMenuItem: React.FC<DraggableMenuItemProps> = ({ item, index, moveItem, onDelete, onEdit }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: 'menu-item',
    item: { index },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'menu-item',
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        moveItem(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}`}
    >
      <Card className="mb-3 border shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="cursor-grab active:cursor-grabbing hover:bg-muted/50 p-1 rounded">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="relative shrink-0">
              <img 
                src={item.images?.[0] || 'https://placehold.co/64x64?text=Product'} 
                alt={item.name} 
                className="h-16 w-16 rounded-lg object-cover border" 
              />
              {item.images && item.images.length > 1 && (
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {item.images.length}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{item.name}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                {item.stock !== undefined && (
                  <Badge variant="outline" className="text-xs">
                    Stock: {item.stock}
                  </Badge>
                )}
                <Badge variant={item.available ? "default" : "outline"} className="text-xs">
                  {item.available ? "Available" : "Out of Stock"}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-primary mt-1">KES {item.price.toLocaleString()}</p>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => onEdit(item)}
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(item.id)}
                className="h-8 w-8 hover:text-destructive"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const DragDropMenuManager: React.FC = () => {
  const { menu, addMenuItem, deleteMenuItem, updateMenuItem } = useData();
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>(menu);
  const [newItem, setNewItem] = useState<{ 
    name: string; 
    category: string; 
    price: number; 
    images: string[];
    description: string;
    imageFiles: File[];
    subcategory?: string;
    unit?: string;
    quantityStep?: number;
    brand?: string;
    condition?: "new" | "used" | "refurbished";
    size?: string;
    color?: string;
    year?: number;
    material?: string;
    location?: string;
    stock?: number;
    tags?: string[];
    costPrice?: number;
  }>({ name: '', category: 'HP', price: 0, costPrice: undefined, images: [], description: '', imageFiles: [], unit: 'pcs', quantityStep: 1 });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingImageFiles, setEditingImageFiles] = useState<File[]>([]);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<MenuItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  React.useEffect(() => {
    setMenuItems(menu);
  }, [menu]);

  const moveItem = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = menuItems[dragIndex];
    const newItems = [...menuItems];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);
    setMenuItems(newItems);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Check if adding these files would exceed 10 images
      const totalImages = newItem.imageFiles.length + files.length;
      if (totalImages > 10) {
        toast({ title: 'Error', description: 'Maximum 10 images allowed per product', variant: 'destructive' });
        return;
      }
      setNewItem({ ...newItem, imageFiles: [...newItem.imageFiles, ...files] });
    }
  };

  const removeImage = (index: number) => {
    setNewItem(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index)
    }));
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    let uploadedImages: string[] = [];
    
    // Upload all images
    if (newItem.imageFiles.length > 0) {
      for (const file of newItem.imageFiles) {
        const formData = new FormData();
        formData.append('image', file);
        
        try {
          const response = await apiFetch('/api/uploads', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            uploadedImages.push(data.url);
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          toast({ title: 'Error', description: `Failed to upload ${file.name}`, variant: 'destructive' });
          return;
        }
      }
    }

    const item: MenuItem = {
      id: Date.now().toString(),
      name: sanitizeInput(newItem.name),
      category: newItem.category,
      price: newItem.price,
      costPrice: (newItem as any).costPrice,
      description: sanitizeInput(newItem.description || ''),
      available: true,
      images: uploadedImages.length > 0 ? uploadedImages : ["https://placehold.co/400x300?text=Product"],
      subcategory: newItem.subcategory ? sanitizeInput(newItem.subcategory) : undefined,
      unit: newItem.unit ? sanitizeInput(newItem.unit) : undefined,
      quantityStep: newItem.quantityStep,
      brand: newItem.brand ? sanitizeInput(newItem.brand) : undefined,
      condition: newItem.condition,
      size: newItem.size ? sanitizeInput(newItem.size) : undefined,
      color: newItem.color ? sanitizeInput(newItem.color) : undefined,
      year: newItem.year,
      material: newItem.material ? sanitizeInput(newItem.material) : undefined,
      location: newItem.location ? sanitizeInput(newItem.location) : undefined,
      stock: newItem.stock,
      tags: newItem.tags?.map(tag => sanitizeInput(tag)) || []
    };

    try {
    await addMenuItem(item);
    setNewItem({ 
      name: '', 
      category: 'HP', 
      price: 0,
      costPrice: undefined,
      images: [], 
      description: '', 
      imageFiles: [],
      subcategory: '',
      unit: 'pcs',
      quantityStep: 1,
      brand: '',
      condition: undefined,
      size: '',
      color: '',
      year: undefined,
      material: '',
      location: '',
      stock: undefined,
      tags: []
    });
    toast({ title: 'Success', description: `${item.name} added to menu with ${uploadedImages.length} image(s)` });
  } catch (error) {
    toast({ title: 'Error', description: `Failed to add product: ${error instanceof Error ? error.message : 'Unknown error'}`, variant: 'destructive' });
  }
  };

  const handleDeleteItem = (id: string) => {
    const item = menuItems.find(item => item.id === id);
    if (item) {
      setDeleteConfirmItem(item);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteItem = () => {
    if (deleteConfirmItem) {
      deleteMenuItem(deleteConfirmItem.id);
      toast({ title: 'Success', description: 'Item removed from menu' });
      setDeleteConfirmItem(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setEditingImageFiles([]); // Reset image files when opening edit modal
    setIsEditModalOpen(true);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Check if adding these files would exceed 10 images total
      const currentImageCount = editingItem?.images?.length || 0;
      const totalImages = currentImageCount + editingImageFiles.length + files.length;
      if (totalImages > 10) {
        toast({ title: 'Error', description: 'Maximum 10 images allowed per product', variant: 'destructive' });
        return;
      }
      setEditingImageFiles([...editingImageFiles, ...files]);
    }
  };

  const removeEditingImage = (index: number) => {
    setEditingImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    if (!editingItem) return;
    const newImages = editingItem.images?.filter((_, i) => i !== index) || [];
    setEditingItem({ ...editingItem, images: newImages });
  };

  const handleUpdateItem = async () => {
    if (!editingItem) {
      toast({ title: 'Error', description: 'No item selected for editing', variant: 'destructive' });
      return;
    }

    // Handle image uploads first
    let uploadedImages: string[] = [];
    if (editingImageFiles.length > 0) {
      for (const file of editingImageFiles) {
        const formData = new FormData();
        formData.append('image', file);
        
        try {
          const response = await apiFetch('/api/uploads', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          
          if (response.ok) {
            const data = await response.json();
            uploadedImages.push(data.url);
          } else {
            throw new Error('Upload failed');
          }
        } catch (error) {
          toast({ title: 'Error', description: `Failed to upload ${file.name}`, variant: 'destructive' });
          return;
        }
      }
    }

    // Combine existing images with newly uploaded ones
    const finalImages = [...(editingItem.images || []), ...uploadedImages];

    // Update the item with sanitized data and new images
    const updatedItem = {
      ...editingItem,
      name: sanitizeInput(editingItem.name),
      description: sanitizeInput(editingItem.description || ''),
      subcategory: editingItem.subcategory ? sanitizeInput(editingItem.subcategory) : undefined,
      unit: (editingItem as any).unit ? sanitizeInput((editingItem as any).unit) : undefined,
      brand: editingItem.brand ? sanitizeInput(editingItem.brand) : undefined,
      size: editingItem.size ? sanitizeInput(editingItem.size) : undefined,
      color: editingItem.color ? sanitizeInput(editingItem.color) : undefined,
      material: editingItem.material ? sanitizeInput(editingItem.material) : undefined,
      location: editingItem.location ? sanitizeInput(editingItem.location) : undefined,
      tags: editingItem.tags?.map(tag => sanitizeInput(tag)) || [],
      images: finalImages
    };

    await updateMenuItem(updatedItem);
    setIsEditModalOpen(false);
    setEditingItem(null);
    setEditingImageFiles([]);
    toast({ title: 'Success', description: `${updatedItem.name} updated successfully` });
  };

  const [productFormMode, setProductFormMode] = useState<'ordinary' | 'simple'>('ordinary');
  const showLaptopFieldsForNewItem = productFormMode === 'ordinary';
  const [editingFormMode, setEditingFormMode] = useState<'ordinary' | 'simple'>('ordinary');
  const showLaptopFieldsForEditingItem = editingFormMode === 'ordinary';

  // Filter and search logic
  const filteredItems = useMemo(() => {
    let items = menuItems;
    
    // Category filter
    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    return items;
  }, [menuItems, categoryFilter, searchQuery]);

  // Stats calculations
  const stats = useMemo(() => {
    const total = menuItems.length;
    const available = menuItems.filter(i => i.available).length;
    const outOfStock = menuItems.filter(i => !i.available).length;
    const totalValue = menuItems.reduce((sum, i) => sum + (i.price * (i.stock || 0)), 0);
    const lowStock = menuItems.filter(i => i.stock !== undefined && i.stock < 10).length;
    
    return { total, available, outOfStock, totalValue, lowStock };
  }, [menuItems]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(menuItems.map(i => i.category)));
  }, [menuItems]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Catalog</h2>
          <p className="text-muted-foreground mt-1">Manage your store inventory and pricing</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-medium">Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">KES {stats.totalValue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, category, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {(searchQuery || categoryFilter !== 'all') && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {filteredItems.length} of {menuItems.length} products</span>
              {(searchQuery || categoryFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                  }}
                  className="h-6 px-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Products</h3>
          {viewMode === 'list' && <p className="text-sm text-muted-foreground">Drag to reorder</p>}
        </div>
        {filteredItems.length === 0 ? (
          <Card className="border shadow-sm">
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">
                  {menuItems.length === 0 ? 'No products yet' : 'No products match your filters'}
                </p>
                <p className="text-sm mt-1">
                  {menuItems.length === 0 ? 'Add your first product above!' : 'Try adjusting your search or filters'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="space-y-2">
            {filteredItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <DraggableMenuItem
                  item={item}
                  index={index}
                  moveItem={moveItem}
                  onDelete={handleDeleteItem}
                  onEdit={handleEditItem}
                />

              {isEditModalOpen && editingItem?.id === item.id && (
                <div className="mb-6">
                  <Card className="gradient-mesh border-animated-gradient">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-4 text-holographic">Edit Menu Item</h3>
                      <div className="space-y-4">
                        <Input
                          placeholder="Item name"
                          value={editingItem.name}
                          onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          className="liquid-transition"
                        />
                        <div className="space-y-1">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Category (type custom name)"
                              value={editingItem.category}
                              onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                              className="flex-1 liquid-transition"
                            />
                            <Select
                              value={editingFormMode}
                              onValueChange={(value: 'ordinary' | 'simple') => setEditingFormMode(value)}
                            >
                              <SelectTrigger className="w-[140px] liquid-transition">
                                <SelectValue placeholder="Form mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ordinary">Ordinary (all)</SelectItem>
                                <SelectItem value="simple">Simple (reduced)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-xs text-muted-foreground">Select form mode or type custom category</p>
                        </div>
                        <Input
                          placeholder="Subcategory (optional)"
                          value={editingItem.subcategory || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, subcategory: e.target.value })}
                          className="liquid-transition"
                        />
                        {showLaptopFieldsForEditingItem && (
                          <>
                            <Input
                              placeholder="Brand (optional)"
                              value={editingItem.brand || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                              className="liquid-transition"
                            />
                            <Select
                              value={editingItem.condition || ''}
                              onValueChange={(value: "new" | "used" | "refurbished" | "") => 
                                setEditingItem({ ...editingItem, condition: value || undefined })
                              }
                            >
                              <SelectTrigger className="liquid-transition">
                                <SelectValue placeholder="Condition (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No condition</SelectItem>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="used">Used</SelectItem>
                                <SelectItem value="refurbished">Refurbished</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Size (optional)"
                              value={editingItem.size || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, size: e.target.value })}
                              className="liquid-transition"
                            />
                            <Input
                              placeholder="Color (optional)"
                              value={editingItem.color || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                              className="liquid-transition"
                            />
                            <Input
                              type="number"
                              placeholder="Year (optional)"
                              value={editingItem.year || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, year: parseInt(e.target.value) || undefined })}
                              className="liquid-transition"
                            />
                            <Input
                              placeholder="Material (optional)"
                              value={editingItem.material || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, material: e.target.value })}
                              className="liquid-transition"
                            />
                            <Input
                              placeholder="Location (optional)"
                              value={editingItem.location || ''}
                              onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                              className="liquid-transition"
                            />
                          </>
                        )}
                        <Input
                          type="number"
                          placeholder="Stock (optional)"
                          value={editingItem.stock || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, stock: parseFloat(e.target.value) || undefined })}
                          className="liquid-transition"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Select
                            value={(editingItem as any).unit || 'pcs'}
                            onValueChange={(value: string) => setEditingItem({ ...(editingItem as any), unit: value } as any)}
                          >
                            <SelectTrigger className="liquid-transition">
                              <SelectValue placeholder="Unit (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_OPTIONS.map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Quantity step (optional)"
                            value={(editingItem as any).quantityStep ?? ''}
                            onChange={(e) => setEditingItem({ ...(editingItem as any), quantityStep: e.target.value ? parseFloat(e.target.value) : undefined } as any)}
                            className="liquid-transition"
                          />
                        </div>
                        {showLaptopFieldsForEditingItem && (
                          <Input
                            type="number"
                            placeholder="Weight (kg, optional)"
                            value={editingItem.weight || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, weight: parseFloat(e.target.value) || undefined })}
                            className="liquid-transition"
                          />
                        )}
                        <Input
                          placeholder="Tags (comma-separated, optional)"
                          value={editingItem.tags?.join(', ') || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })}
                          className="liquid-transition"
                        />
                        {showLaptopFieldsForEditingItem && (
                          <>
                            <Input
                              placeholder="Dimensions (JSON format, optional)"
                              value={editingItem.dimensions ? JSON.stringify(editingItem.dimensions) : ''}
                              onChange={(e) => {
                                try {
                                  const dimensions = e.target.value ? JSON.parse(e.target.value) : undefined;
                                  setEditingItem({ ...editingItem, dimensions });
                                } catch (error) {
                                  // Invalid JSON, ignore
                                }
                              }}
                              className="liquid-transition"
                            />
                            <Input
                              placeholder="Specifications (JSON format, optional)"
                              value={editingItem.specifications ? JSON.stringify(editingItem.specifications) : ''}
                              onChange={(e) => {
                                try {
                                  const specifications = e.target.value ? JSON.parse(e.target.value) : undefined;
                                  setEditingItem({ ...editingItem, specifications });
                                } catch (error) {
                                  // Invalid JSON, ignore
                                }
                              }}
                              className="liquid-transition"
                            />
                          </>
                        )}
                        <Input
                          placeholder="Description"
                          value={editingItem.description}
                          onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                          className="liquid-transition"
                        />
                        <Input
                          type="number"
                          placeholder="Price (KSHS)"
                          value={editingItem.price || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, price: parseInt(e.target.value) || 0 })}
                          className="liquid-transition"
                        />
                        <div className="space-y-1">
                          <Input
                            type="number"
                            placeholder="Buying Price (KES) - Admin only"
                            value={(editingItem as any).costPrice || ''}
                            onChange={(e) => setEditingItem({ ...(editingItem as any), costPrice: parseFloat(e.target.value) || undefined })}
                            className="liquid-transition"
                          />
                          <p className="text-xs text-muted-foreground">Internal use only - for profit calculations</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="available"
                            checked={editingItem.available}
                            onChange={(e) => setEditingItem({ ...editingItem, available: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="available" className="text-sm font-medium">
                            Available for order
                          </label>
                        </div>

                        {/* Image Management Section */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Product Images</label>
                            <span className="text-xs text-muted-foreground">
                              {(editingItem.images?.length || 0) + editingImageFiles.length}/10 images
                            </span>
                          </div>
                          
                          {/* Existing Images */}
                          {editingItem.images && editingItem.images.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-foreground">Current Images:</p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {editingItem.images.map((image, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={image}
                                      alt={`Current ${index + 1}`}
                                      className="w-full h-16 object-cover rounded border"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeExistingImage(index)}
                                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                                      {index + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* New Images to Upload */}
                          {editingImageFiles.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-foreground">New Images to Upload:</p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                                {editingImageFiles.map((file, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={`New ${index + 1}`}
                                      className="w-full h-16 object-cover rounded border"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeEditingImage(index)}
                                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                                      {file.name.length > 10 ? `${file.name.slice(0, 10)}...` : file.name}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleEditImageChange}
                              className="liquid-transition"
                            />
                            <p className="text-xs text-muted-foreground">
                              Add more images (up to 10 total). New images will be appended.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <Button onClick={handleUpdateItem} className="luminous-glow">
                            Save Changes
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setIsEditModalOpen(false);
                              setEditingItem(null);
                              setEditingImageFiles([]);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </React.Fragment>
          ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="relative aspect-square">
                  <img 
                    src={item.images?.[0] || 'https://placehold.co/400x400?text=Product'} 
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {item.images && item.images.length > 1 && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 font-semibold">
                      {item.images.length} photos
                    </div>
                  )}
                  <Badge 
                    variant={item.available ? "default" : "secondary"} 
                    className="absolute top-2 left-2"
                  >
                    {item.available ? "Available" : "Out of Stock"}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-base truncate mb-1">{item.name}</h3>
                  <Badge variant="outline" className="text-xs mb-2">{item.category}</Badge>
                  <p className="text-sm font-bold text-primary mb-3">KES {item.price.toLocaleString()}</p>
                  {item.stock !== undefined && (
                    <p className="text-xs text-muted-foreground mb-3">Stock: {item.stock}</p>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditItem(item)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteItem(item.id)}
                      className="hover:text-destructive"
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Menu Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmItem?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteConfirmItem(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteItem}
            >
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>Fill in the product details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  placeholder="Product name *"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="Category * (type custom name)"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    value={productFormMode}
                    onValueChange={(value: 'ordinary' | 'simple') => setProductFormMode(value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Form mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ordinary">Ordinary (all)</SelectItem>
                      <SelectItem value="simple">Simple (reduced)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">Select form mode or type custom category</p>
              </div>
              <Input
                placeholder="Subcategory"
                value={newItem.subcategory || ''}
                onChange={(e) => setNewItem({ ...newItem, subcategory: e.target.value })}
              />
              {showLaptopFieldsForNewItem && (
                <>
                  <Input
                    placeholder="Brand"
                    value={newItem.brand || ''}
                    onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                  />
                  <Select
                    value={newItem.condition || ''}
                    onValueChange={(value: "new" | "used" | "refurbished" | "") => 
                      setNewItem({ ...newItem, condition: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No condition</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="refurbished">Refurbished</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Size"
                    value={newItem.size || ''}
                    onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                  />
                  <Input
                    placeholder="Color"
                    value={newItem.color || ''}
                    onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Year"
                    value={newItem.year || ''}
                    onChange={(e) => setNewItem({ ...newItem, year: parseInt(e.target.value) || undefined })}
                  />
                  <Input
                    placeholder="Material"
                    value={newItem.material || ''}
                    onChange={(e) => setNewItem({ ...newItem, material: e.target.value })}
                  />
                  <Input
                    placeholder="Location"
                    value={newItem.location || ''}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  />
                </>
              )}
              <Input
                type="number"
                placeholder="Stock quantity"
                value={newItem.stock || ''}
                onChange={(e) => setNewItem({ ...newItem, stock: parseFloat(e.target.value) || undefined })}
              />
              <Select
                value={newItem.unit || 'pcs'}
                onValueChange={(value: string) => setNewItem({ ...newItem, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Quantity step"
                value={newItem.quantityStep ?? ''}
                onChange={(e) => setNewItem({ ...newItem, quantityStep: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
              <Input
                type="number"
                placeholder="Selling Price (KES) * - Customers see this"
                value={newItem.price || ''}
                onChange={(e) => setNewItem({ ...newItem, price: parseInt(e.target.value) || 0 })}
              />
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Buying Price (KES) - Admin only"
                  value={(newItem as any).costPrice || ''}
                  onChange={(e) => setNewItem({ ...(newItem as any), costPrice: parseFloat(e.target.value) || undefined })}
                />
                <p className="text-xs text-muted-foreground">Internal use only - for profit calculations</p>
              </div>
            </div>
            <Input
              placeholder="Tags (comma separated)"
              value={newItem.tags?.join(', ') || ''}
              onChange={(e) => setNewItem({ ...newItem, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag) })}
            />
            <Input
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Images ({newItem.imageFiles.length}/10)</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
              />
              <p className="text-xs text-muted-foreground">
                Upload up to 10 images. First image will be the primary display.
              </p>
              {newItem.imageFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {newItem.imageFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewItem({ name: '', category: 'HP', price: 0, costPrice: undefined, images: [], description: '', imageFiles: [], unit: 'pcs', quantityStep: 1 });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                handleAddItem();
                setIsAddDialogOpen(false);
              }}
              disabled={!newItem.name || !newItem.category}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DragDropMenuManager;
