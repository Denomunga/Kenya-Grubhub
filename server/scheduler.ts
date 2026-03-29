import cron from 'node-cron';
import { RecurringExpenseService } from './modules/accounting/service.js';
import { log } from './logger.js';

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler() {
  // Run recurring expense generation every day at 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    try {
      log('🔄 Running scheduled recurring expense generation...');
      const result = await RecurringExpenseService.generateMonthlyExpenses();
      log(`✅ Generated ${result.generatedCount} expenses from recurring templates`);
    } catch (error: any) {
      console.error('❌ Failed to generate recurring expenses:', error?.message || String(error));
    }
  });

  // Also run on server startup (after 30 seconds) to catch any missed expenses
  setTimeout(async () => {
    try {
      log('🔄 Running initial recurring expense check...');
      const result = await RecurringExpenseService.generateMonthlyExpenses();
      if (result.generatedCount > 0) {
        log(`✅ Generated ${result.generatedCount} expenses from recurring templates on startup`);
      } else {
        log('✅ No recurring expenses due at this time');
      }
    } catch (error: any) {
      console.error('❌ Failed to generate recurring expenses on startup:', error?.message || String(error));
    }
  }, 30000);

  log('✅ Scheduler initialized - Recurring expenses will be processed daily at 1:00 AM');
}
