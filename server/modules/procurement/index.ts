import router from './routes';
import {
  SupplierService,
  PurchaseRequestService,
  PurchaseOrderService,
  GoodsReceivedService
} from './service';

export {
  SupplierService,
  PurchaseRequestService,
  PurchaseOrderService,
  GoodsReceivedService
};

export const procurementModule = {
  routes: router,
  services: {
    SupplierService,
    PurchaseRequestService,
    PurchaseOrderService,
    GoodsReceivedService
  }
};

export default procurementModule;
