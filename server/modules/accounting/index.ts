import router from './routes';
import {
  ChartOfAccountsService,
  JournalEntryService,
  TransactionService,
  FinancialReportingService
} from './service';

export {
  ChartOfAccountsService,
  JournalEntryService,
  TransactionService,
  FinancialReportingService
};

export const accountingModule = {
  routes: router,
  services: {
    ChartOfAccountsService,
    JournalEntryService,
    TransactionService,
    FinancialReportingService
  }
};

export default accountingModule;