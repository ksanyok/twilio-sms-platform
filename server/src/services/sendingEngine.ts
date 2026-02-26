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
   * Messages are distributed evenly across available numbers with throttling
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
    const delayBetweenMs = Math.ceil(60000 / sendingSpeed); // Space messages evenly

    for (let i = 0; i < options.leads.length; i++) {
      const lead = options.leads[i];

      try {
        // Check compliance
        const complianceCheck = await ComplianceService.canSendTo(lead.phone);
        if (!complianceCheck.allowed) {
          skipped++;
          
          if (options.campaignId) {
            await prisma.campaignLead.updateMany({
              where: {
                campaignId: options.campaignId,
                leadId: lead.leadId,
              },
              data: { status: 'SKIPPED' },
            });
          }
          continue;
        }

        // Interpolate template
        const body = this.interpolateTemplate(options.messageTemplate, {
          firstName: lead.firstName || '',
          lastName: lead.lastName || '',
          company: lead.company || '',
          ...lead.customFields,
        });

        // Get or create conversation
        const conversation = await this.getOrCreateConversation(
          lead.leadId,
          options.sentByUserId
        );

        // Get number for this message
        const fromNumber = await NumberService.getBestAvailableNumber(
          [],
          options.poolId
        );

        if (!fromNumber) {
          errors.push(`No available numbers for lead ${lead.leadId}`);
          continue;
        }

        // Create message record
        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
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

        // Queue with staggered delay for throttling
        await smsQueue.add(
          'send-sms',
          {
            messageId: message.id,
            fromNumber: fromNumber.phoneNumber,
            toNumber: lead.phone,
            body,
            phoneNumberId: fromNumber.id,
            campaignId: options.campaignId,
            leadId: lead.leadId,
          },
          {
            delay: i * delayBetweenMs,
            priority: 5, // Lower priority than individual sends
          }
        );

        queued++;
      } catch (error: any) {
        errors.push(`Lead ${lead.leadId}: ${error.message}`);
      }
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

      // Send via Twilio
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
