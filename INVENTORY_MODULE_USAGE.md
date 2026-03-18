/**
 * =============================================================
 * INVENTORY MODULE QUICK START GUIDE
 * =============================================================
 *
 * This guide shows how to use the Inventory module in your app
 */

// ============================================================
// 1. BASIC USAGE - Getting All Inventory Items
// ============================================================

// Frontend (client/src/pages):
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export function InventoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => apiFetch('/api/v1/inventory')
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Inventory</h1>
      {data?.data?.map((item: any) => (
        <div key={item._id}>
          <h3>{item.productName}</h3>
          <p>Stock: {item.currentStock}</p>
          <p>Status: {item.status}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 2. CREATE INVENTORY ITEM
// ============================================================

export async function createInventoryItem() {
  const response = await apiFetch('/api/v1/inventory', {
    method: 'POST',
    body: JSON.stringify({
      productId: '507f1f77bcf86cd799439011',
      productName: 'Rice (10kg)',
      sku: 'RICE-10KG-001',
      category: 'Grains',
      currentStock: 50,
      minimumStock: 10,
      maximumStock: 100,
      unit: 'kg',
      location: 'Warehouse A - Shelf 3',
      supplierId: '507f1f77bcf86cd799439012',
      costPrice: 450,
      sellingPrice: 750,
      expiryDate: '2026-12-31',
      batchNumber: 'BATCH-001-2026'
    })
  });

  return response.data;
}

// ============================================================
// 3. UPDATE STOCK LEVELS
// ============================================================

export async function updateStock(itemId: string) {
  // Add stock (received shipment)
  const addResponse = await apiFetch(`/api/v1/inventory/${itemId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({
      quantity: 25,
      operation: 'add',
      reason: 'Received shipment SHP-12345'
    })
  });

  // Subtract stock (sold/used)
  const subtractResponse = await apiFetch(`/api/v1/inventory/${itemId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({
      quantity: 5,
      operation: 'subtract',
      reason: 'Sold to customer'
    })
  });

  // Set exact stock (inventory count)
  const setResponse = await apiFetch(`/api/v1/inventory/${itemId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({
      quantity: 75,
      operation: 'set',
      reason: 'Physical stock count'
    })
  });

  return setResponse;
}

// ============================================================
// 4. GET LOW STOCK ALERTS
// ============================================================

export async function getLowStockAlerts() {
  const response = await apiFetch('/api/v1/inventory/alerts/low-stock');
  
  // Items where currentStock <= minimumStock
  console.log('Low stock items:', response.data);
  
  // Send notifications
  response.data.forEach((item: any) => {
    console.warn(`⚠️ ${item.productName} is low! Current: ${item.currentStock}, Min: ${item.minimumStock}`);
  });
  
  return response.data;
}

// ============================================================
// 5. GET INVENTORY SUMMARY (Dashboard)
// ============================================================

export async function getInventorySummary() {
  const response = await apiFetch('/api/v1/inventory/summary');
  
  const { totalItems, totalValue, lowStockItems, outOfStockItems } = response.data;

  console.log(`
    📦 Total Items: ${totalItems}
    💰 Total Value: KES ${totalValue.toLocaleString()}
    ⚠️  Low Stock Items: ${lowStockItems}
    ❌ Out of Stock: ${outOfStockItems}
  `);

  return response.data;
}

// ============================================================
// 6. FILTER INVENTORY ITEMS
// ============================================================

export async function filterInventory() {
  // By category
  let response = await apiFetch('/api/v1/inventory?category=Grains');
  console.log('Grains:', response.data);

  // By status
  response = await apiFetch('/api/v1/inventory?status=active');
  console.log('Active items:', response.data);

  // Low stock items
  response = await apiFetch('/api/v1/inventory?lowStock=true');
  console.log('Low stock:', response.data);

  // Search
  response = await apiFetch('/api/v1/inventory?search=Rice');
  console.log('Search results:', response.data);

  // Pagination
  response = await apiFetch('/api/v1/inventory?page=1&limit=20');
  console.log('Page 1:', response.data);

  return response;
}

// ============================================================
// 7. UPDATE INVENTORY ITEM DETAILS
// ============================================================

export async function updateInventoryItem(itemId: string) {
  const response = await apiFetch(`/api/v1/inventory/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({
      productName: 'Premium Rice (10kg)',
      maximumStock: 150, // Increased from 100
      location: 'Warehouse B - Shelf 5', // Changed location
      supplierId: '507f1f77bcf86cd799439013', // New supplier
      status: 'active',
      batchNumber: 'BATCH-002-2026'
    })
  });

  return response.data;
}

// ============================================================
// 8. SYNC WITH PRODUCT CATALOG
// ============================================================

export async function syncInventoryWithProducts() {
  // Automatically creates inventory items for all products
  // Updates existing ones if they already have inventory records
  
  const response = await apiFetch('/api/v1/inventory/sync/products', {
    method: 'POST'
  });

  console.log(`Synced ${response.data.length} items`);
  return response.data;
}

// ============================================================
// 9. BULK UPDATE INVENTORY
// ============================================================

export async function bulkUpdateInventory() {
  const response = await apiFetch('/api/v1/inventory/bulk', {
    method: 'PATCH',
    body: JSON.stringify({
      updates: [
        {
          id: '507f1f77bcf86cd799439011',
          data: { minimumStock: 20, maximumStock: 150 }
        },
        {
          id: '507f1f77bcf86cd799439012',
          data: { status: 'discontinued' }
        },
        {
          id: '507f1f77bcf86cd799439013',
          data: { location: 'Warehouse C' }
        }
      ]
    })
  });

  console.log(`✅ Updated: ${response.data.updated.length}`);
  console.log(`❌ Failed: ${response.data.failed.length}`);

  return response.data;
}

// ============================================================
// 10. DELETE INVENTORY ITEM
// ============================================================

export async function deleteInventoryItem(itemId: string) {
  const response = await apiFetch(`/api/v1/inventory/${itemId}`, {
    method: 'DELETE'
  });

  console.log('Item deleted');
  return response;
}

// ============================================================
// 11. COMPLETE WORKFLOW EXAMPLE
// ============================================================

export async function completeInventoryWorkflow() {
  console.log('🚀 Starting Inventory Workflow...');

  // Step 1: Sync with products
  console.log('📦 Syncing with product catalog...');
  await syncInventoryWithProducts();

  // Step 2: Get summary
  console.log('📊 Getting inventory summary...');
  const summary = await getInventorySummary();

  // Step 3: Check low stock
  console.log('⚠️  Checking low stock items...');
  const lowStock = await getLowStockAlerts();

  if (lowStock.length > 0) {
    // Step 4: Create purchase orders for low stock items
    console.log('🛒 Creating purchase orders for low stock items...');
    
    for (const item of lowStock) {
      const orderQuantity = item.maximumStock - item.currentStock;
      console.log(`Ordering ${orderQuantity} units of ${item.productName}`);
      
      // You would integrate with procurement module here
      // await ProcurementService.createPurchaseOrder({
      //   itemId: item._id,
      //   quantity: orderQuantity,
      //   supplierId: item.supplierId
      // });
    }
  }

  // Step 5: Update stock after receiving delivery
  console.log('📥 Receiving delivery...');
  // await updateStock('item-id');

  console.log('✅ Workflow complete!');
}

// ============================================================
// 12. REACT QUERY INTEGRATION
// ============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useInventory() {
  const queryClient = useQueryClient();

  // Get inventory items
  const getItems = useQuery({
    queryKey: ['inventory'],
    queryFn: () => apiFetch('/api/v1/inventory')
  });

  // Create item mutation
  const createItem = useMutation({
    mutationFn: (data) => apiFetch('/api/v1/inventory', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiFetch(`/api/v1/inventory/${id}/stock`, { 
      method: 'PATCH', 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  return {
    items: getItems,
    createItem,
    updateStock: updateStockMutation
  };
}

// Usage in component:
export function InventoryComponent() {
  const { items, updateStock } = useInventory();

  const handleStockAdd = (itemId: string) => {
    updateStock.mutate({
      id: itemId,
      data: {
        quantity: 25,
        operation: 'add',
        reason: 'Manual addition'
      }
    });
  };

  return (
    <div>
      {items.data?.data?.map((item: any) => (
        <div key={item._id}>
          <h3>{item.productName}</h3>
          <p>Stock: {item.currentStock}</p>
          <button onClick={() => handleStockAdd(item._id)}>
            Add Stock
          </button>
        </div>
      ))}
    </div>
  );
}

export default {
  createInventoryItem,
  updateStock,
  getLowStockAlerts,
  getInventorySummary,
  filterInventory,
  updateInventoryItem,
  syncInventoryWithProducts,
  bulkUpdateInventory,
  deleteInventoryItem,
  completeInventoryWorkflow,
  useInventory
};