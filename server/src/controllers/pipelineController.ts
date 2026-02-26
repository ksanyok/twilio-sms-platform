import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export class PipelineController {

  static async getStages(req: AuthRequest, res: Response): Promise<void> {
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' },
      include: {
        cards: {
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                status: true,
                company: true,
                lastContactedAt: true,
                lastRepliedAt: true,
                assignedRep: {
                  select: { id: true, firstName: true, lastName: true },
                },
                tags: {
                  include: { tag: true },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
        },
        _count: { select: { cards: true } },
      },
    });

    res.json({ stages });
  }

  static async createStage(req: AuthRequest, res: Response): Promise<void> {
    const { name, color } = req.body;

    if (!name) throw new AppError('Stage name is required', 400);

    const maxOrder = await prisma.pipelineStage.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const stage = await prisma.pipelineStage.create({
      data: {
        name,
        color: color || '#6366f1',
        order: (maxOrder?.order || 0) + 1,
      },
    });

    res.status(201).json({ stage });
  }

  static async updateStage(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, color, order } = req.body;

    const stage = await prisma.pipelineStage.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({ stage });
  }

  static async deleteStage(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    // Move cards to first stage
    const firstStage = await prisma.pipelineStage.findFirst({
      where: { id: { not: id } },
      orderBy: { order: 'asc' },
    });

    if (firstStage) {
      await prisma.pipelineCard.updateMany({
        where: { stageId: id },
        data: { stageId: firstStage.id },
      });
    }

    await prisma.pipelineStage.delete({ where: { id } });

    res.json({ message: 'Stage deleted' });
  }

  static async moveCard(req: AuthRequest, res: Response): Promise<void> {
    const { cardId } = req.params;
    const { stageId, position } = req.body;

    const card = await prisma.pipelineCard.update({
      where: { id: cardId },
      data: {
        stageId,
        position: position || 0,
      },
      include: {
        stage: true,
        lead: true,
      },
    });

    // Update lead status based on pipeline stage
    const stageStatusMap: Record<string, string> = {
      'New': 'NEW',
      'Contacted': 'CONTACTED',
      'Replied': 'REPLIED',
      'Interested': 'INTERESTED',
      'Docs Requested': 'DOCS_REQUESTED',
      'Submitted': 'SUBMITTED',
      'Funded': 'FUNDED',
    };

    const newStatus = stageStatusMap[card.stage.name];
    if (newStatus && card.lead) {
      await prisma.lead.update({
        where: { id: card.leadId },
        data: { status: newStatus as any },
      });
    }

    res.json({ card });
  }

  static async reorderStages(req: AuthRequest, res: Response): Promise<void> {
    const { stageOrder } = req.body; // [{ id, order }]

    for (const item of stageOrder) {
      await prisma.pipelineStage.update({
        where: { id: item.id },
        data: { order: item.order },
      });
    }

    res.json({ message: 'Stages reordered' });
  }
}
