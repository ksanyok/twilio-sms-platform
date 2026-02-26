import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { NumberService } from '../services/numberService';

export class NumberController {

  static async list(req: AuthRequest, res: Response): Promise<void> {
    const health = await NumberService.getNumberHealthOverview();
    res.json(health);
  }

  static async assignToRep(req: AuthRequest, res: Response): Promise<void> {
    const { repId, phoneNumberIds } = req.body;

    if (!repId || !phoneNumberIds?.length) {
      throw new AppError('Rep ID and phone number IDs are required', 400);
    }

    await NumberService.assignNumbersToRep(repId, phoneNumberIds);
    res.json({ message: 'Numbers assigned' });
  }

  static async coolDown(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { reason, hours = 24 } = req.body;

    await NumberService.coolNumber(id, reason || 'Manual cooldown', hours);
    res.json({ message: 'Number cooled down' });
  }

  static async activate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    await prisma.phoneNumber.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        coolingUntil: null,
        cooldownReason: null,
        errorStreak: 0,
      },
    });

    res.json({ message: 'Number activated' });
  }

  static async getAssignments(req: AuthRequest, res: Response): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignments = await prisma.numberAssignment.findMany({
      where: {
        isActive: true,
        assignedDate: { gte: today },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        phoneNumber: {
          select: {
            id: true,
            phoneNumber: true,
            status: true,
            dailySentCount: true,
            dailyLimit: true,
          },
        },
      },
    });

    res.json({ assignments });
  }

  static async getPools(req: AuthRequest, res: Response): Promise<void> {
    const pools = await prisma.numberPool.findMany({
      include: {
        members: {
          include: {
            phoneNumber: {
              select: {
                id: true,
                phoneNumber: true,
                status: true,
                dailySentCount: true,
              },
            },
          },
        },
        _count: { select: { members: true } },
      },
    });

    res.json({ pools });
  }

  static async createPool(req: AuthRequest, res: Response): Promise<void> {
    const { name, description, dailyLimit, phoneNumberIds } = req.body;

    const pool = await prisma.numberPool.create({
      data: {
        name,
        description,
        dailyLimit: dailyLimit || 300,
      },
    });

    if (phoneNumberIds?.length) {
      await prisma.numberPoolMembership.createMany({
        data: phoneNumberIds.map((phoneNumberId: string) => ({
          phoneNumberId,
          poolId: pool.id,
        })),
      });
    }

    res.status(201).json({ pool });
  }
}
