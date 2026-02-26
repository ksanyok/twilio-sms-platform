import { Worker, Job } from 'bullmq';
import redis from '../config/redis';
import prisma from '../config/database';
import { SendingEngine } from '../services/sendingEngine';
import logger from '../config/logger';

/**
 * SMS Queue Worker
 * Processes outbound messages with rate limiting
 * Designed for high throughput: 10k-20k+ messages/day
 */
const smsWorker = new Worker(
  'sms-send',
  async (job: Job) => {
    const { messageId, fromNumber, toNumber, body, phoneNumberId } = job.data;

    logger.debug(`Processing SMS job ${job.id}: ${messageId} → ${toNumber}`);

    await SendingEngine.sendViaTwilio(
      messageId,
      fromNumber,
      toNumber,
      body,
      phoneNumberId
    );
  },
  {
    connection: redis,
    concurrency: 15, // Process 15 messages concurrently (safe for 35+ numbers)
    limiter: {
      max: 300,        // 300/min = 5 msg/sec — safe for 35 A2P 10DLC numbers
      duration: 60000,
    },
  }
);

smsWorker.on('completed', (job: Job) => {
  logger.debug(`SMS job ${job.id} completed`);
});

smsWorker.on('failed', (job: Job | undefined, error: Error) => {
  logger.error(`SMS job ${job?.id} failed:`, {
    error: error.message,
    data: job?.data,
    attemptsMade: job?.attemptsMade,
  });
});

smsWorker.on('error', (error: Error) => {
  logger.error('SMS worker error:', { error: error.message });
});

/**
 * Campaign Processing Worker
 * Handles campaign start, pause, resume operations
 */
const campaignWorker = new Worker(
  'campaign-process',
  async (job: Job) => {
    const { action, campaignId, options } = job.data;

    switch (action) {
      case 'start':
        await processCampaignStart(campaignId, options);
        break;
      case 'pause':
        await processCampaignPause(campaignId);
        break;
      default:
        logger.warn(`Unknown campaign action: ${action}`);
    }
  },
  {
    connection: redis,
    concurrency: 2,
  }
);

async function processCampaignStart(campaignId: string, options: any): Promise<void> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        leads: {
          where: { status: 'PENDING' },
          include: { lead: true },
        },
      },
    });

    if (!campaign) return;

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENDING',
        startedAt: new Date(),
      },
    });

    // Queue all messages
    const leads = campaign.leads.map((cl) => ({
      leadId: cl.lead.id,
      phone: cl.lead.phone,
      firstName: cl.lead.firstName,
      lastName: cl.lead.lastName || undefined,
      company: cl.lead.company || undefined,
    }));

    const result = await SendingEngine.queueBulkSend({
      leads,
      messageTemplate: campaign.messageTemplate,
      campaignId: campaign.id,
      poolId: campaign.numberPoolId || undefined,
      sendingSpeed: campaign.sendingSpeed,
    });

    // Update campaign stats
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalLeads: leads.length,
        totalSent: result.queued,
      },
    });

    logger.info(`Campaign ${campaignId} started: ${result.queued} queued, ${result.skipped} skipped`);
  } catch (error: any) {
    logger.error(`Campaign ${campaignId} start error:`, { error: error.message });
    throw error;
  }
}

async function processCampaignPause(campaignId: string): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'PAUSED' },
  });

  logger.info(`Campaign ${campaignId} paused`);
}

logger.info('🚀 SMS Queue Worker started');
logger.info('🚀 Campaign Queue Worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down workers...');
  await smsWorker.close();
  await campaignWorker.close();
});

export { smsWorker, campaignWorker };
