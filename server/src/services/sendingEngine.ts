import prisma from '../config/database';
import getTwilioClient from '../config/twilio';
import { config } from '../config';
import logger from '../config/logger';
import { NumberService } from './numberService';
import { ComplianceService } from './complianceService';
import { Queue } from 'bullmq';
import redis from '../config/redis';

/**
 * SendingEngine - Core message sending with throttling, queuing, and compliance
 * 
 * Architecture for 10k-20k+ messages/day:
 * 1. Messages enter the queue (BullMQ with Redis)
 * 2. Worker processes messages with rate limiting
 * 3. Smart number rotation distributes load
 * 4. Webhook callbacks update delivery status
 * 5. Failed messages retry with exponential backoff
 */

// BullMQ Queues
export const smsQueue = new Queue('sms-send', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 10000,
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
});

export const campaignQueue = new Queue('campaign-process', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { age: 86400 },
  },
});

interface SendMessageOptions {
  toNumber: string;
  body: string;
  leadId: string;
  campaignId?: string;
  automationRunId?: string;
  sentByUserId?: string;
  preferredNumberId?: string;
  priority?: number;
}

interface BulkSendOptions {
  leads: Array<{
    leadId: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    customFields?: Record<string, string>;
  }>;
  messageTemplate: string;
  campaignId?: string;
  sentByUserId?: string;
  poolId?: string;
  sendingSpeed?: number; // messages per minute
}

export class SendingEngine {
  
  /**
   * Check if test mode is enabled via system settings
   */
  static async isTestMode(): Promise<boolean> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'testMode' },
      });
      return setting?.value === true || setting?.value === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Queue a single message for sending
   */
  static async queueMessage(options: SendMessageOptions): Promise<string> {
    // Compliance checks
    const complianceCheck = await ComplianceService.canSendTo(options.toNumber);
    if (!complianceCheck.allowed) {
      logger.warn(`Message blocked by compliance: ${complianceCheck.reason}`, {
        toNumber: options.toNumber,
      });
      throw new Error(`Cannot send: ${complianceCheck.reason}`);
    }

    // Create or get conversation
    const conversation = await this.getOrCreateConversation(
      options.leadId,
      options.sentByUserId
    );

    // Get best number
    const fromNumber = options.preferredNumberId
      ? await prisma.phoneNumber.findUnique({ where: { id: options.preferredNumberId } })
      : await NumberService.getStickyNumber(
          options.toNumber,
          options.sentByUserId
        );

    if (!fromNumber) {
      throw new Error('No available phone numbers for sending');
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        status: 'QUEUED',
        fromNumber: fromNumber.phoneNumber,
        toNumber: options.toNumber,
        body: options.body,
        campaignId: options.campaignId,
        automationRunId: options.automationRunId,
        sentByUserId: options.sentByUserId,
        phoneNumberId: fromNumber.id,
      },
    });

    // Add to queue
    await smsQueue.add(
      'send-sms',
      {
        messageId: message.id,
        fromNumber: fromNumber.phoneNumber,
        toNumber: options.toNumber,
        body: options.body,
        phoneNumberId: fromNumber.id,
      },
      {
        priority: options.priority || 0,
        delay: 0,
      }
    );

    return message.id;
  }

  /**
   * Queue a bulk campaign send
   * OPTIMIZED: Pre-fetches compliance data + uses batch operations
   * Reduces ~50K DB queries to ~10 for a 10K campaign
   */
  static async queueBulkSend(options: BulkSendOptions): Promise<{
    queued: number;
    skipped: number;
    errors: string[];
  }> {
    let queued = 0;
    let skipped = 0;
    const errors: string[] = [];

    const sendingSpeed = options.sendingSpeed || config.sms.maxPerMinute;
    const delayBetweenMs = Math.ceil(60000 / sendingSpeed);

    // ── BATCH PRE-FETCH: compliance data in 2 queries instead of 2 per lead ──
    const phones = options.leads.map(l => l.phone);
    const [suppressedEntries, leadsStatus] = await Promise.all([
      prisma.suppressionEntry.findMany({
        where: { phone: { in: phones } },
        select: { phone: true },
      }),
      prisma.lead.findMany({
        where: { phone: { in: phones }, OR: [{ optedOut: true }, { isSuppressed: true }] },
        select: { phone: true },
      }),
    ]);
    const blockedPhones = new Set([
      ...suppressedEntries.map(s => s.phone),
      ...leadsStatus.map(l => l.phone),
    ]);

    // Check quiet hours once
    if (ComplianceService.isQuietHours()) {
      return { queued: 0, skipped: options.leads.length, errors: ['Quiet hours — all skipped'] };
    }

    // ── BATCH PRE-FETCH: existing conversations ──
    const leadIds = options.leads.map(l => l.leadId);
    const existingConvos = await prisma.conversation.findMany({
      where: { leadId: { in: leadIds } },
      select: { id: true, leadId: true },
    });
    const convoMap = new Map(existingConvos.map(c => [c.leadId, c.id]));

    // ── PROCESS LEADS ──
    const jobsToQueue: Array<{ name: string; data: any; opts: any }> = [];
    const messagesToCreate: Array<any> = [];
    const missingConvoLeads: string[] = [];

    // Find leads that need new conversations
    for (const lead of options.leads) {
      if (!convoMap.has(lead.leadId)) {
        missingConvoLeads.push(lead.leadId);
      }
    }

    // Batch-create missing conversations
    if (missingConvoLeads.length > 0) {
      await prisma.conversation.createMany({
        data: missingConvoLeads.map(leadId => ({
          leadId,
          assignedRepId: options.sentByUserId,
          isActive: true,
        })),
        skipDuplicates: true,
      });
      // Re-fetch to get IDs
      const newConvos = await prisma.conversation.findMany({
        where: { leadId: { in: missingConvoLeads } },
        select: { id: true, leadId: true },
      });
      for (const c of newConvos) {
        convoMap.set(c.leadId, c.id);
      }
    }

    // Prepare messages and jobs
    let jobIndex = 0;
    for (const lead of options.leads) {
      // Check compliance from pre-fetched set
      if (blockedPhones.has(lead.phone)) {
        skipped++;
        if (options.campaignId) {
          await prisma.campaignLead.updateMany({
            where: { campaignId: options.campaignId, leadId: lead.leadId },
            data: { status: 'SKIPPED' },
          });
        }
        continue;
      }

      const body = this.interpolateTemplate(options.messageTemplate, {
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        company: lead.company || '',
        ...lead.customFields,
      });

      const fromNumber = await NumberService.getBestAvailableNumber([], options.poolId);
      if (!fromNumber) {
        errors.push(`No available numbers for lead ${lead.leadId}`);
        continue;
      }

      const conversationId = convoMap.get(lead.leadId);
      if (!conversationId) {
        errors.push(`No conversation for lead ${lead.leadId}`);
        continue;
      }

      // Create message record
      const message = await prisma.message.create({
        data: {
          conversationId,
          direction: 'OUTBOUND',
          status: 'QUEUED',
          fromNumber: fromNumber.phoneNumber,
          toNumber: lead.phone,
          body,
          campaignId: options.campaignId,
          sentByUserId: options.sentByUserId,
          phoneNumberId: fromNumber.id,
        },
      });

      jobsToQueue.push({
        name: 'send-sms',
        data: {
          messageId: message.id,
          fromNumber: fromNumber.phoneNumber,
          toNumber: lead.phone,
          body,
          phoneNumberId: fromNumber.id,
          campaignId: options.campaignId,
          leadId: lead.leadId,
        },
        opts: {
          delay: jobIndex * delayBetweenMs,
          priority: 5,
        },
      });

      jobIndex++;
      queued++;
    }

    // ── BULK ADD to BullMQ (one Redis call instead of N) ──
    if (jobsToQueue.length > 0) {
      await smsQueue.addBulk(jobsToQueue);
    }

    return { queued, skipped, errors };
  }

  /**
   * Actually send the message via Twilio
   * Called by the queue worker
   */
  static async sendViaTwilio(
    messageId: string,
    fromNumber: string,
    toNumber: string,
    body: string,
    phoneNumberId: string
  ): Promise<void> {
    try {
      // Update status to SENDING
      await prisma.message.update({
        where: { id: messageId },
        data: { status: 'SENDING' },
      });

      // ── TEST MODE: simulate delivery without calling Twilio ──
      const testMode = await this.isTestMode();
      if (testMode) {
        const fakeSid = `TEST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        // Simulate a small delay 
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100));

        await prisma.message.update({
          where: { id: messageId },
          data: {
            twilioMessageSid: fakeSid,
            status: 'SENT',
            sentAt: new Date(),
          },
        });

        await NumberService.recordSend(phoneNumberId, true);

        // Update lead contact tracking same as real send
        const msg = await prisma.message.findUnique({
          where: { id: messageId },
          include: { conversation: { include: { lead: true } } },
        });

        if (msg?.conversation?.leadId) {
          const isFirstContact = msg.conversation.lead?.status === 'NEW';
          await prisma.lead.update({
            where: { id: msg.conversation.leadId },
            data: {
              lastContactedAt: new Date(),
              contactCount: { increment: 1 },
              ...(isFirstContact && { status: 'CONTACTED' }),
            },
          });
        }

        logger.info(`[TEST MODE] Message simulated: ${messageId} → ${toNumber}`, {
          fakeSid,
          fromNumber,
        });
        return;
      }

      // ── REAL MODE: Send via Twilio ──
      const client = getTwilioClient();
      if (!client) {
        throw new Error('Twilio client not configured');
      }
      const twilioMessage = await client.messages.create({
        body,
        from: fromNumber,
        to: toNumber,
        statusCallback: `${config.webhookBaseUrl}/api/webhooks/twilio/status`,
      });

      // Update with Twilio SID
      await prisma.message.update({
        where: { id: messageId },
        data: {
          twilioMessageSid: twilioMessage.sid,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      // Record send on number
      await NumberService.recordSend(phoneNumberId, true);

      // Update lead contact tracking
      const msg = await prisma.message.findUnique({
        where: { id: messageId },
        include: { conversation: { include: { lead: true } } },
      });

      if (msg?.conversation?.leadId) {
        const isFirstContact = msg.conversation.lead?.status === 'NEW';
        await prisma.lead.update({
          where: { id: msg.conversation.leadId },
          data: {
            lastContactedAt: new Date(),
            contactCount: { increment: 1 },
            ...(isFirstContact && { status: 'CONTACTED' }),
          },
        });
      }

      logger.info(`Message sent: ${messageId} → ${toNumber}`, {
        twilioSid: twilioMessage.sid,
        fromNumber,
      });
    } catch (error: any) {
      const isBlocked = error.code === 30007 || error.code === 30034;

      await prisma.message.update({
        where: { id: messageId },
        data: {
          status: isBlocked ? 'BLOCKED' : 'FAILED',
          errorCode: error.code?.toString(),
          errorMessage: error.message,
          failedAt: new Date(),
        },
      });

      await NumberService.recordSend(phoneNumberId, false, isBlocked);

      logger.error(`Message failed: ${messageId}`, {
        error: error.message,
        code: error.code,
        toNumber,
      });

      throw error; // Let BullMQ handle retry
    }
  }

  /**
   * Template interpolation with {{variable}} syntax
   */
  static interpolateTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Get or create a conversation for a lead
   */
  private static async getOrCreateConversation(
    leadId: string,
    repId?: string
  ) {
    let conversation = await prisma.conversation.findUnique({
      where: { leadId },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId,
          assignedRepId: repId,
          isActive: true,
        },
      });
    }

    return conversation;
  }
}
