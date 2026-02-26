import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { AutomationService } from '../services/automationService';

export class AutomationController {

  static async listRules(req: AuthRequest, res: Response): Promise<void> {
    const rules = await prisma.automationRule.findMany({
      include: {
        templates: { orderBy: { sequenceOrder: 'asc' } },
        _count: { select: { runs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ rules });
  }

  static async getRule(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const rule = await prisma.automationRule.findUnique({
      where: { id },
      include: {
        templates: { orderBy: { sequenceOrder: 'asc' } },
        runs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            lead: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
    });

    if (!rule) throw new AppError('Automation rule not found', 404);

    res.json({ rule });
  }

  static async createRule(req: AuthRequest, res: Response): Promise<void> {
    const {
      name,
      type,
      triggerConfig,
      actionConfig,
      sendAfterHour,
      sendBeforeHour,
      sendOnWeekends,
      templates,
    } = req.body;

    if (!name || !type) {
      throw new AppError('Name and type are required', 400);
    }

    const rule = await prisma.automationRule.create({
      data: {
        name,
        type,
        triggerConfig: triggerConfig || {},
        actionConfig: actionConfig || {},
        sendAfterHour: sendAfterHour || 9,
        sendBeforeHour: sendBeforeHour || 20,
        sendOnWeekends: sendOnWeekends || false,
      },
    });

    // Create templates for follow-up sequence
    if (templates && templates.length > 0) {
      await prisma.automationTemplate.createMany({
        data: templates.map((t: any, index: number) => ({
          automationRuleId: rule.id,
          sequenceOrder: index + 1,
          delayDays: t.delayDays || 1,
          messageTemplate: t.messageTemplate,
        })),
      });
    }

    const created = await prisma.automationRule.findUnique({
      where: { id: rule.id },
      include: { templates: { orderBy: { sequenceOrder: 'asc' } } },
    });

    res.status(201).json({ rule: created });
  }

  static async updateRule(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, isActive, triggerConfig, actionConfig, sendAfterHour, sendBeforeHour, sendOnWeekends } = req.body;

    const rule = await prisma.automationRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(isActive !== undefined && { isActive }),
        ...(triggerConfig && { triggerConfig }),
        ...(actionConfig && { actionConfig }),
        ...(sendAfterHour !== undefined && { sendAfterHour }),
        ...(sendBeforeHour !== undefined && { sendBeforeHour }),
        ...(sendOnWeekends !== undefined && { sendOnWeekends }),
      },
    });

    res.json({ rule });
  }

  static async startForLead(req: AuthRequest, res: Response): Promise<void> {
    const { ruleId, leadId } = req.body;

    const runId = await AutomationService.startAutomation(ruleId, leadId);
    res.json({ runId, message: 'Automation started' });
  }

  static async startForLeads(req: AuthRequest, res: Response): Promise<void> {
    const { ruleId, leadIds } = req.body;

    const results = [];
    for (const leadId of leadIds) {
      try {
        const runId = await AutomationService.startAutomation(ruleId, leadId);
        results.push({ leadId, runId, status: 'started' });
      } catch (error: any) {
        results.push({ leadId, status: 'error', error: error.message });
      }
    }

    res.json({ results });
  }

  static async pauseRun(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    await prisma.automationRun.update({
      where: { id },
      data: { isPaused: true, pauseReason: 'manual' },
    });

    res.json({ message: 'Automation paused' });
  }

  static async resumeRun(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    await prisma.automationRun.update({
      where: { id },
      data: { isPaused: false, pauseReason: null },
    });

    res.json({ message: 'Automation resumed' });
  }
}
