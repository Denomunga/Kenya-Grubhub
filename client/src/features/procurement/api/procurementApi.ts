import { apiFetch } from '@/lib/api';
import { Supplier } from '../types';

const BASE = '/api/procurement';

export const procurementApi = {
  // Suppliers
  getSuppliers: () => apiFetch(`${BASE}/suppliers`).then(res => res.json()).then((r: any) => r.data ?? []),
  getSupplier: (id: string) => apiFetch(`${BASE}/suppliers/${id}`).then(res => res.json()),
  createSupplier: (data: Partial<Supplier>) =>
    apiFetch(`${BASE}/suppliers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json()),
  updateSupplier: (id: string, data: Partial<Supplier>) =>
    apiFetch(`${BASE}/suppliers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json()),
  deleteSupplier: (id: string) => apiFetch(`${BASE}/suppliers/${id}`, { method: 'DELETE' }),

  // Purchase Requests
  getPurchaseRequests: () => apiFetch(`${BASE}/purchase-requests`).then(res => res.json()).then((r: any) => r.data ?? []),
  getLowStockItems: (threshold?: number) => apiFetch(`${BASE}/low-stock-items?threshold=${threshold || 10}`).then(res => res.json()).then((r: any) => r.data ?? []),
  createLowStockRequest: (data: any) =>
    apiFetch(`${BASE}/purchase-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json()),
  approveRequest: (id: string, notes?: string) =>
    apiFetch(`${BASE}/purchase-requests/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved', notes }) }).then(res => res.json()),
  rejectRequest: (id: string, reason: string) =>
    apiFetch(`${BASE}/purchase-requests/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected', rejectionReason: reason }) }).then(res => res.json()),

  // Purchase Orders
  getPurchaseOrders: () => apiFetch(`${BASE}/purchase-orders`).then(res => res.json()).then((r: any) => r.data ?? []),
  getPurchaseOrder: (id: string) => apiFetch(`${BASE}/purchase-orders/${id}`).then(res => res.json()),
  createPurchaseOrder: (data: any) =>
    apiFetch(`${BASE}/purchase-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json()),
  confirmPO: (id: string) =>
    apiFetch(`${BASE}/purchase-orders/${id}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'confirmed' }) }).then(res => res.json()),
  cancelPO: (id: string, reason: string) =>
    apiFetch(`${BASE}/purchase-orders/${id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled', cancellationReason: reason }) }).then(res => res.json()),

  // Goods Received
  getGoodsReceived: () => apiFetch(`${BASE}/goods-received`).then(res => res.json()).then((r: any) => r.data ?? []),
  getGoodsReceivedById: (id: string) => apiFetch(`${BASE}/goods-received/${id}`).then(res => res.json()),
  receiveGoods: (data: any) =>
    apiFetch(`${BASE}/goods-received`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json()),
  getGoodsReceivedByPO: (poId: string) =>
    apiFetch(`${BASE}/goods-received?purchaseOrderId=${poId}`).then(res => res.json()).then((r: any) => r.data ?? []),
  inspectGoods: (id: string, data: any, receiptFile?: File) => {
    if (receiptFile) {
      const formData = new FormData();
      formData.append('receipt', receiptFile);
      formData.append('inspectionNotes', data.inspectionNotes || '');
      formData.append('status', data.status || 'inspected');
      return apiFetch(`${BASE}/goods-received/${id}/inspect`, { method: 'POST', body: formData }).then(res => res.json());
    }
    return apiFetch(`${BASE}/goods-received/${id}/inspect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(res => res.json());
  },
  uploadReceipt: (id: string, receiptFile: File) => {
    const formData = new FormData();
    formData.append('receipt', receiptFile);
    return apiFetch(`${BASE}/goods-received/${id}/receipt`, { method: 'POST', body: formData }).then(res => res.json());
  },
};