import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { ComplianceService } from '../services/complianceService';
import { AutomationService } from '../services/automationService';
import getTwilioClient from '../config/twilio';
import { config } from '../config';
import { validateRequest } from 'twilio';

const router = Router();

/**
 * Twilio webhook signature validation middleware
 * Validates that incoming requests are genuinely from Twilio
 */
function validateTwilioSignature(req: Request, res: Response, next: Function): void {
  // Skip validation in development if no auth token configured
  if (config.env === 'development' && !config.twilio.authToken) {
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;
  if (!twilioSignature) {
    logger.warn('Missing Twilio signature header');
    res.status(403).json({ error: 'Missing signature' });
    return;
  }

  const url = `${config.webhookBaseUrl}${req.originalUrl}`;
  const isValid = validateRequest(
    config.twilio.authToken,
    twilioSignature,
    url,
    req.body
  );

  if (!isValid) {
    logger.warn('Invalid Twilio signature', { url, signature: twilioSignature });
    res.status(403).json({ error: 'Invalid signature' });
    return;
  }

  next();
}

// Apply signature validation to all webhook routes
router.use(validateTwilioSignature);

/**
 * Twilio Inbound Message Webhook
 * Receives incoming SMS messages
 */
router.post('/inbound', async (req: Request, res: Response) => {
  try {
    const {
      MessageSid,
      From,
      To,
      Body,
      NumMedia,
    } = req.body;

    logger.info(`Inbound SMS: ${From} → ${To}: ${Body}`);

    // Process compliance keywords first
    const keywordResult = await ComplianceService.processInboundKeywords(From, Body);

    if (keywordResult.isKeyword && keywordResult.response) {
      // Auto-reply for compliance keywords
      res.type('text/xml');
      res.send(`
        <Response>
          <Message>${keywordResult.response}</Message>
        </Response>
      `);
      return;
    }

    // Find the lead by phone number
    const lead = await prisma.lead.findUnique({
      where: { phone: From },
      include: { conversations: true },
    });

    if (lead) {
      // Get or create conversation
      let conversation = lead.conversations[0];

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            leadId: lead.id,
            assignedRepId: lead.assignedRepId,
            isActive: true,
          },
        });
      }

      // Save inbound message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'INBOUND',
          status: 'RECEIVED',
          fromNumber: From,
          toNumber: To,
          body: Body,
          twilioMessageSid: MessageSid,
          sentAt: new Date(),
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastDirection: 'inbound',
          unreadCount: { increment: 1 },
        },
      });

      // Handle reply - pause automations, update lead status
      await AutomationService.onLeadReply(lead.id);

      // Update campaign lead status if applicable
      await prisma.campaignLead.updateMany({
        where: {
          leadId: lead.id,
          status: { in: ['SENT', 'DELIVERED'] },
        },
        data: {
          status: 'REPLIED',
          repliedAt: new Date(),
        },
      });

      // Emit Socket.IO event for real-time inbox update
      const io = req.app.get('io');
      if (io) {
        const updatedConversation = await prisma.conversation.findUnique({
          where: { id: conversation.id },
          include: {
            lead: { select: { id: true, firstName: true, lastName: true, phone: true } },
            messages: { take: 1, orderBy: { createdAt: 'desc' } },
          },
        });
        // Notify assigned rep
        if (conversation.assignedRepId) {
          io.to(`inbox:${conversation.assignedRepId}`).emit('new-message', {
            conversation: updatedConversation,
          });
        }
        // Notify conversation viewers
        io.to(`conversation:${conversation.id}`).emit('message', {
          conversationId: conversation.id,
          direction: 'INBOUND',
          body: Body,
          from: From,
        });
      }
    } else {
      // Unknown number - create a lead record
      const newLead = await prisma.lead.create({
        data: {
          firstName: 'Unknown',
          phone: From,
          source: 'inbound_sms',
          status: 'REPLIED',
          lastRepliedAt: new Date(),
        },
      });

      const conversation = await prisma.conversation.create({
        data: {
          leadId: newLead.id,
          isActive: true,
        },
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: 'INBOUND',
          status: 'RECEIVED',
          fromNumber: From,
          toNumber: To,
          body: Body,
          twilioMessageSid: MessageSid,
          sentAt: new Date(),
        },
      });
    }

    // Return empty TwiML (no auto-reply for regular messages)
    res.type('text/xml');
    res.send('<Response></Response>');
  } catch (error: any) {
    logger.error('Inbound webhook error:', { error: error.message });
    res.type('text/xml');
    res.send('<Response></Response>');
  }
});

/**
 * Twilio Status Callback Webhook
 * Updates message delivery status
 */
router.post('/status', async (req: Request, res: Response) => {
  try {
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
    } = req.body;

    logger.debug(`Status callback: ${MessageSid} → ${MessageStatus}`);

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      queued: 'QUEUED',
      sending: 'SENDING',
      sent: 'SENT',
      delivered: 'DELIVERED',
      failed: 'FAILED',
      undelivered: 'UNDELIVERED',
    };

    const mappedStatus = statusMap[MessageStatus] || MessageStatus.toUpperCase();

    // Check if blocked by carrier
    const isBlocked = ErrorCode === '30007' || ErrorCode === '30034';
    const finalStatus = isBlocked ? 'BLOCKED' : mappedStatus;

    // Update message
    const message = await prisma.message.findFirst({
      where: { twilioMessageSid: MessageSid },
    });

    if (message) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: finalStatus as any,
          ...(finalStatus === 'DELIVERED' && { deliveredAt: new Date() }),
          ...(finalStatus === 'FAILED' || finalStatus === 'UNDELIVERED' || isBlocked
            ? {
                failedAt: new Date(),
                errorCode: ErrorCode,
                errorMessage: ErrorMessage,
              }
            : {}),
        },
      });

      // Update campaign stats if applicable
      if (message.campaignId) {
        const updateField =
          finalStatus === 'DELIVERED'
            ? 'totalDelivered'
            : finalStatus === 'FAILED' || finalStatus === 'UNDELIVERED'
            ? 'totalFailed'
            : finalStatus === 'BLOCKED'
            ? 'totalBlocked'
            : null;

        if (updateField) {
          await prisma.campaign.update({
            where: { id: message.campaignId },
            data: { [updateField]: { increment: 1 } },
          });
        }

        // Update campaign lead status
        if (message.phoneNumberId) {
          const conversation = await prisma.conversation.findUnique({
            where: { id: message.conversationId },
          });

          if (conversation) {
            await prisma.campaignLead.updateMany({
              where: {
                campaignId: message.campaignId,
                leadId: conversation.leadId,
              },
              data: {
                status: finalStatus === 'DELIVERED' ? 'DELIVERED' : 'FAILED',
                ...(finalStatus === 'DELIVERED' && { deliveredAt: new Date() }),
                ...(ErrorCode && { errorCode: ErrorCode }),
              },
            });
          }
        }
      }

      // Update number health stats
      if (message.phoneNumberId) {
        if (finalStatus === 'DELIVERED') {
          await prisma.phoneNumber.update({
            where: { id: message.phoneNumberId },
            data: { totalDelivered: { increment: 1 } },
          });
        } else if (isBlocked) {
          await prisma.phoneNumber.update({
            where: { id: message.phoneNumberId },
            data: {
              totalBlocked: { increment: 1 },
              errorStreak: { increment: 1 },
            },
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (error: any) {
    logger.error('Status webhook error:', { error: error.message });
    res.sendStatus(200); // Always return 200 to Twilio
  }
});

export default router;
