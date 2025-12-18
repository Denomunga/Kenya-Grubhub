import React, { useState, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Edit, Trash, Plus, X } from 'lucide-react';
import { useData } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { MenuItem } from '@/lib/data';

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
      className={`card-3d cursor-move transition-all duration-300 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      style={{ transform: isDragging ? 'rotate(2deg)' : '' }}
    >
      <Card className="mb-4 border-animated-gradient depth-layer-3 hover-lift">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="relative">
              <img 
                src={item.images?.[0] || 'https://placehold.co/48x48?text=Food'} 
                alt={item.name} 
                className="h-12 w-12 rounded-lg object-cover" 
              />
              {item.images && item.images.length > 1 && (
                <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  +{item.images.length - 1}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-holographic">{item.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{item.category}</Badge>
                <span className="text-sm font-medium text-primary">{item.price} KSHS</span>
                <Badge variant={item.available ? "default" : "outline"}>
                  {item.available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onEdit(item)}
                className="magnetic hover:text-primary"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDelete(item.id)}
                className="magnetic hover:text-destructive"
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
    category: "Main" | "Starter" | "Drinks" | "Dessert"; 
    price: number; 
    images: string[];
    description: string;
    imageFiles: File[];
  }>({ name: '', category: 'Main', price: 0, images: [], description: '', imageFiles: [] });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingImageFiles, setEditingImageFiles] = useState<File[]>([]);

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
          const response = await fetch('/api/uploads', {
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
      ...newItem,
      available: true,
      images: uploadedImages.length > 0 ? uploadedImages : ["https://placehold.co/400x300?text=Food"]
    };

    addMenuItem(item);
    setNewItem({ name: '', category: 'Main', price: 0, images: [], description: '', imageFiles: [] });
    toast({ title: 'Success', description: `${item.name} added to menu with ${uploadedImages.length} image(s)` });
  };

  const handleDeleteItem = (id: string) => {
    deleteMenuItem(id);
    toast({ title: 'Success', description: 'Item removed from menu' });
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
          const response = await fetch('/api/uploads', {
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

    // Update the item with new images
    const updatedItem = {
      ...editingItem,
      images: finalImages
    };

    await updateMenuItem(updatedItem);
    setIsEditModalOpen(false);
    setEditingItem(null);
    setEditingImageFiles([]);
    toast({ title: 'Success', description: `${updatedItem.name} updated successfully` });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-holographic mb-2">Drag & Drop Menu Manager</h2>
        <p className="text-muted-foreground">Reorganize your menu by dragging items</p>
      </div>

      {/* Add New Item Form */}
      <Card className="gradient-mesh border-animated-gradient">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4 text-holographic">Add New Item</h3>
          <div className="space-y-4">
            <Input
              placeholder="Item name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              className="liquid-transition"
            />
            <Select
              value={newItem.category}
              onValueChange={(value: "Main" | "Starter" | "Drinks" | "Dessert") => 
                setNewItem({ ...newItem, category: value })
              }
            >
              <SelectTrigger className="liquid-transition">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Main">Main Course</SelectItem>
                <SelectItem value="Starter">Starter</SelectItem>
                <SelectItem value="Drinks">Drinks</SelectItem>
                <SelectItem value="Dessert">Dessert</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="liquid-transition"
            />
            <Input
              type="number"
              placeholder="Price (KSHS)"
              value={newItem.price || ''}
              onChange={(e) => setNewItem({ ...newItem, price: parseInt(e.target.value) || 0 })}
              className="liquid-transition"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Images ({newItem.imageFiles.length}/10)</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="liquid-transition"
              />
              <p className="text-xs text-muted-foreground">
                Upload up to 10 images. First image will be the primary display image.
              </p>
              
              {/* Image Preview */}
              {newItem.imageFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Selected Images:</p>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
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
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                          {file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Button 
            onClick={handleAddItem} 
            className="mt-4 luminous-glow magnetic"
            disabled={!newItem.name || !newItem.category}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Draggable Menu Items */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold mb-4 text-holographic">Menu Items (Drag to Reorder)</h3>
        {menuItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No menu items yet. Add your first item above!</p>
          </div>
        ) : (
          menuItems.map((item, index) => (
            <DraggableMenuItem
              key={item.id}
              item={item}
              index={index}
              moveItem={moveItem}
              onDelete={handleDeleteItem}
              onEdit={handleEditItem}
            />
          ))
        )}
      </div>

      {/* Edit Item Modal */}
      {isEditModalOpen && editingItem && (
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
              <Select
                value={editingItem.category}
                onValueChange={(value: "Main" | "Starter" | "Drinks" | "Dessert") => 
                  setEditingItem({ ...editingItem, category: value })
                }
              >
                <SelectTrigger className="liquid-transition">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Main">Main Course</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Drinks">Drinks</SelectItem>
                  <SelectItem value="Dessert">Dessert</SelectItem>
                </SelectContent>
              </Select>
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
                    <div className="grid grid-cols-4 gap-2">
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
                    <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
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
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                            {file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload New Images */}
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEditImageChange}
                    className="liquid-transition"
                    disabled={(editingItem.images?.length || 0) + editingImageFiles.length >= 10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add more images (max 10 total). Click X to remove existing images.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateItem} 
                  className="flex-1 luminous-glow magnetic"
                >
                  Update Item
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingItem(null);
                    setEditingImageFiles([]);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DragDropMenuManager;
