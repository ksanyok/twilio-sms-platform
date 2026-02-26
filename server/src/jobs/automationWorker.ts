import { Worker, Job } from 'bullmq';
import redis from '../config/redis';
import { AutomationService } from '../services/automationService';
import { NumberService } from '../services/numberService';
import logger from '../config/logger';

/**
 * Automation Worker
 * Runs periodically to:
 * 1. Process due follow-up sequences
 * 2. Reset daily number counters at midnight
 * 3. Execute scheduled automation rules
 */

// Automation processing interval (every 60 seconds)
const AUTOMATION_CHECK_INTERVAL = 60_000;

// Daily reset interval check (every 5 minutes)
const DAILY_RESET_CHECK_INTERVAL = 300_000;

let lastResetDate = '';

async function checkAndProcessAutomations(): Promise<void> {
  try {
    await AutomationService.processScheduledAutomations();
  } catch (error: any) {
    logger.error('Automation processing error:', { error: error.message });
  }
}

async function checkDailyReset(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  if (today !== lastResetDate) {
    try {
      await NumberService.resetDailyCounters();
      lastResetDate = today;
      logger.info('Daily counters reset completed');
    } catch (error: any) {
      logger.error('Daily reset error:', { error: error.message });
    }
  }
}

// Start periodic processing
const automationInterval = setInterval(
  checkAndProcessAutomations,
  AUTOMATION_CHECK_INTERVAL
);

const resetInterval = setInterval(
  checkDailyReset,
  DAILY_RESET_CHECK_INTERVAL
);

logger.info('🤖 Automation Worker started');
logger.info(`  Checking automations every ${AUTOMATION_CHECK_INTERVAL / 1000}s`);
logger.info(`  Checking daily reset every ${DAILY_RESET_CHECK_INTERVAL / 1000}s`);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down automation worker...');
  clearInterval(automationInterval);
  clearInterval(resetInterval);
  process.exit(0);
});
