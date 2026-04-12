import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '../api/procurementApi';
import { useToast } from '@/hooks/use-toast';

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['procurement', 'suppliers'],
    queryFn: procurementApi.getSuppliers,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSupplier = (id: string) => {
  return useQuery({
    queryKey: ['procurement', 'suppliers', id],
    queryFn: () => procurementApi.getSupplier(id),
    enabled: !!id,
  });
};

export const usePurchaseRequests = () => {
  return useQuery({
    queryKey: ['procurement', 'requests'],
    queryFn: procurementApi.getPurchaseRequests,
    refetchInterval: 30000, // refresh every 30s
  });
};

export const usePurchaseOrders = () => {
  return useQuery({
    queryKey: ['procurement', 'orders'],
    queryFn: procurementApi.getPurchaseOrders,
    refetchInterval: 30000,
  });
};

export const useGoodsReceived = () => {
  return useQuery({
    queryKey: ['procurement', 'goods'],
    queryFn: procurementApi.getGoodsReceived,
  });
};

// Mutations
export const useApproveRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      procurementApi.approveRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', 'requests'] });
      toast({ title: 'Request approved', description: 'Purchase request has been approved.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Approval failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useRejectRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      procurementApi.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', 'requests'] });
      toast({ title: 'Request rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Rejection failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useConfirmPO = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => procurementApi.confirmPO(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', 'orders'] });
      toast({ title: 'PO confirmed', description: 'Purchase order has been confirmed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Confirmation failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCancelPO = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      procurementApi.cancelPO(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', 'orders'] });
      toast({ title: 'PO cancelled' });
    },
    onError: (error: Error) => {
      toast({ title: 'Cancellation failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useReceiveGoods = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => procurementApi.receiveGoods(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procurement', 'goods'] });
      queryClient.invalidateQueries({ queryKey: ['procurement', 'orders'] });
      toast({ title: 'Goods received', description: 'Inventory will be updated after inspection.' });
    },
  });
};