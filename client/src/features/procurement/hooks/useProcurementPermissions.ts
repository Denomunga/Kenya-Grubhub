import { useHybridAuth } from '@/lib/hybrid-auth';

export const useProcurementPermissions = () => {
  const { user, isAdmin } = useHybridAuth();
  const roles: string[] = user?.role ? [user.role] : [];

  const hasRole = (allowed: string | string[]) => {
    const arr = Array.isArray(allowed) ? allowed : [allowed];
    return isAdmin || arr.some(r => roles.includes(r));
  };

  return {
    canViewProcurement: hasRole(['admin', 'procurement_manager', 'warehouse_manager', 'quality_manager', 'manager']),
    canApproveRequest: hasRole(['admin', 'procurement_manager', 'manager']),
    canRejectRequest: hasRole(['admin', 'procurement_manager', 'manager']),
    canCreatePO: hasRole(['admin', 'procurement_manager']),
    canConfirmPO: hasRole(['admin', 'procurement_manager']),
    canReceiveGoods: hasRole(['admin', 'procurement_manager', 'warehouse_manager']),
    canInspectGoods: hasRole(['admin', 'procurement_manager', 'quality_manager']),
    canManageSuppliers: hasRole(['admin', 'procurement_manager']),
    isAdmin,
  };
};