import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { NumberService } from '../services/numberService';
import getTwilioClient from '../config/twilio';
import logger from '../config/logger';

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

  /**
   * Create a phone number manually
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const { phoneNumber, friendlyName, dailyLimit, isRamping } = req.body;

    if (!phoneNumber) {
      throw new AppError('Phone number is required', 400);
    }

    // Validate E.164
    const cleaned = phoneNumber.replace(/[^+\d]/g, '');
    if (!/^\+1\d{10}$/.test(cleaned)) {
      throw new AppError('Invalid phone number. Must be E.164 format (+1XXXXXXXXXX)', 400);
    }

    // Check duplicate
    const existing = await prisma.phoneNumber.findUnique({ where: { phoneNumber: cleaned } });
    if (existing) {
      throw new AppError('Phone number already exists', 409);
    }

    const number = await prisma.phoneNumber.create({
      data: {
        phoneNumber: cleaned,
        twilioSid: `manual_${Date.now()}`,
        friendlyName: friendlyName || cleaned,
        dailyLimit: dailyLimit || 200,
        isRamping: isRamping ?? true,
        rampDay: 1,
        rampStartDate: new Date(),
        status: 'ACTIVE',
      },
    });

    await NumberService.invalidateNumbersCache();
    logger.info('Phone number created', { phoneNumber: cleaned, id: number.id, by: req.user });
    res.status(201).json({ number });
  }

  /**
   * Update a phone number
   */
  static async update(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { friendlyName, dailyLimit, isRamping, status } = req.body;

    const existing = await prisma.phoneNumber.findUnique({ where: { id } });
    if (!existing) throw new AppError('Phone number not found', 404);

    const data: Record<string, any> = {};
    if (friendlyName !== undefined) data.friendlyName = friendlyName;
    if (dailyLimit !== undefined) data.dailyLimit = Number(dailyLimit);
    if (isRamping !== undefined) data.isRamping = isRamping;
    if (status !== undefined) data.status = status;

    const number = await prisma.phoneNumber.update({ where: { id }, data });

    await NumberService.invalidateNumbersCache();
    logger.info('Phone number updated', { id, changes: Object.keys(data), by: req.user });
    res.json({ number });
  }

  /**
   * Delete a phone number
   */
  static async remove(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const existing = await prisma.phoneNumber.findUnique({ where: { id } });
    if (!existing) throw new AppError('Phone number not found', 404);

    // Delete related records first
    await prisma.numberPoolMembership.deleteMany({ where: { phoneNumberId: id } });
    await prisma.numberAssignment.deleteMany({ where: { phoneNumberId: id } });
    await prisma.phoneNumber.delete({ where: { id } });

    await NumberService.invalidateNumbersCache();
    logger.info('Phone number deleted', { id, phoneNumber: existing.phoneNumber, by: req.user });
    res.json({ message: 'Number deleted' });
  }

  /**
   * Sync phone numbers from Twilio account
   */
  static async syncFromTwilio(req: AuthRequest, res: Response): Promise<void> {
    const client = getTwilioClient();
    if (!client) {
      throw new AppError('Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.', 400);
    }

    const twilioNumbers = await client.incomingPhoneNumbers.list({ limit: 500 });
    let created = 0;
    let skipped = 0;

    for (const tn of twilioNumbers) {
      const exists = await prisma.phoneNumber.findUnique({
        where: { twilioSid: tn.sid },
      });

      if (exists) {
        skipped++;
        continue;
      }

      // Also check by phone number
      const existsByPhone = await prisma.phoneNumber.findUnique({
        where: { phoneNumber: tn.phoneNumber },
      });
      if (existsByPhone) {
        // Update twilioSid if missing
        if (existsByPhone.twilioSid.startsWith('manual_')) {
          await prisma.phoneNumber.update({
            where: { id: existsByPhone.id },
            data: { twilioSid: tn.sid, friendlyName: tn.friendlyName || existsByPhone.friendlyName },
          });
        }
        skipped++;
        continue;
      }

      await prisma.phoneNumber.create({
        data: {
          phoneNumber: tn.phoneNumber,
          twilioSid: tn.sid,
          friendlyName: tn.friendlyName || tn.phoneNumber,
          dailyLimit: 200,
          isRamping: true,
          rampDay: 1,
          rampStartDate: new Date(),
          status: 'ACTIVE',
        },
      });
      created++;
    }

    await NumberService.invalidateNumbersCache();
    logger.info('Twilio sync completed', { created, skipped, total: twilioNumbers.length, by: req.user });
    res.json({ message: `Synced ${created} new numbers. ${skipped} already existed.`, created, skipped });
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
