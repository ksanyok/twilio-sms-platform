import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { parse } from 'csv-parse/sync';

export class LeadController {

  static async list(req: AuthRequest, res: Response): Promise<void> {
    const {
      page = '1',
      limit = '50',
      search,
      status,
      tags,
      assignedRepId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = { in: (status as string).split(',') };
    }

    if (tags) {
      where.tags = {
        some: { tagId: { in: (tags as string).split(',') } },
      };
    }

    if (assignedRepId) {
      where.assignedRepId = assignedRepId;
    }

    // Rep can only see their leads
    if (req.user?.role === 'REP') {
      where.assignedRepId = req.user.id;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          tags: { include: { tag: true } },
          assignedRep: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { conversations: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  }

  static async get(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        assignedRep: {
          select: { id: true, firstName: true, lastName: true },
        },
        conversations: {
          include: {
            messages: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        pipelineCards: {
          include: { stage: true },
        },
        automationRuns: {
          where: { isActive: true },
          include: { automationRule: true },
        },
        campaignLeads: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            campaign: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });

    if (!lead) throw new AppError('Lead not found', 404);

    res.json({ lead });
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    const { firstName, lastName, phone, email, company, state, source, tags, assignedRepId } = req.body;

    if (!firstName || !phone) {
      throw new AppError('First name and phone are required', 400);
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, '');
    const e164Phone = normalizedPhone.startsWith('1')
      ? `+${normalizedPhone}`
      : `+1${normalizedPhone}`;

    // Check for duplicate
    const existing = await prisma.lead.findUnique({
      where: { phone: e164Phone },
    });

    if (existing) {
      throw new AppError('Lead with this phone number already exists', 409);
    }

    // Check suppression
    const suppressed = await prisma.suppressionEntry.findUnique({
      where: { phone: e164Phone },
    });

    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        phone: e164Phone,
        email,
        company,
        state,
        source,
        assignedRepId,
        isSuppressed: !!suppressed,
        suppressReason: suppressed?.reason,
      },
    });

    // Add tags
    if (tags && tags.length > 0) {
      await prisma.leadTag.createMany({
        data: tags.map((tagId: string) => ({
          leadId: lead.id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    // Create pipeline card
    const defaultStage = await prisma.pipelineStage.findFirst({
      where: { isDefault: true },
    });

    if (defaultStage) {
      await prisma.pipelineCard.create({
        data: {
          leadId: lead.id,
          stageId: defaultStage.id,
        },
      });
    }

    res.status(201).json({ lead });
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { firstName, lastName, email, company, state, source, status, assignedRepId, notes } = req.body;

    const data: any = {};
    if (firstName) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;
    if (company !== undefined) data.company = company;
    if (state !== undefined) data.state = state;
    if (source !== undefined) data.source = source;
    if (status) data.status = status;
    if (assignedRepId !== undefined) data.assignedRepId = assignedRepId;
    if (notes !== undefined) data.notes = notes;

    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: {
        tags: { include: { tag: true } },
      },
    });

    res.json({ lead });
  }

  static async importCSV(req: AuthRequest, res: Response): Promise<void> {
    if (!req.file) {
      throw new AppError('CSV file is required', 400);
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Query default stage ONCE before the loop
    const defaultStage = await prisma.pipelineStage.findFirst({
      where: { isDefault: true },
    });

    // Process in chunks of 500 for better DB performance
    const CHUNK_SIZE = 500;
    for (let chunk = 0; chunk < records.length; chunk += CHUNK_SIZE) {
      const batch = records.slice(chunk, chunk + CHUNK_SIZE);
      const leadsToUpsert: Array<{
        phone: string;
        firstName: string;
        lastName: string;
        email: string | null;
        company: string | null;
        state: string | null;
        source: string;
      }> = [];

      // Parse and validate the batch
      for (const record of batch) {
        const phone = (record.phone || record.Phone || record.PHONE || '').replace(/\D/g, '');
        if (!phone) {
          errors++;
          errorDetails.push('Row missing phone number');
          continue;
        }

        const e164Phone = phone.startsWith('1') ? `+${phone}` : `+1${phone}`;
        const firstName = record.firstName || record.first_name || record.FirstName || record.FIRST_NAME || 'Unknown';
        const lastName = record.lastName || record.last_name || record.LastName || record.LAST_NAME || '';

        leadsToUpsert.push({
          phone: e164Phone,
          firstName,
          lastName,
          email: record.email || record.Email || record.EMAIL || null,
          company: record.company || record.Company || record.COMPANY || null,
          state: record.state || record.State || record.STATE || null,
          source: record.source || record.Source || 'csv_import',
        });
      }

      // Batch upsert leads using a transaction
      if (leadsToUpsert.length > 0) {
        const results = await prisma.$transaction(
          leadsToUpsert.map(lead =>
            prisma.lead.upsert({
              where: { phone: lead.phone },
              create: lead,
              update: {
                lastName: { set: lead.lastName || undefined },
                email: lead.email || undefined,
                company: lead.company || undefined,
              },
            })
          )
        );

        // Create pipeline cards for new leads in batch
        const newLeads = results.filter(r => r.createdAt.getTime() > Date.now() - 10000);
        imported += newLeads.length;
        duplicates += results.length - newLeads.length;

        if (defaultStage && newLeads.length > 0) {
          await prisma.pipelineCard.createMany({
            data: newLeads.map(lead => ({
              leadId: lead.id,
              stageId: defaultStage.id,
            })),
            skipDuplicates: true,
          });
        }
      }
    }

    res.json({
      imported,
      duplicates,
      errors,
      total: records.length,
      errorDetails: errorDetails.slice(0, 10),
    });
  }

  static async addTag(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { tagId } = req.body;

    await prisma.leadTag.create({
      data: { leadId: id, tagId },
    });

    res.json({ message: 'Tag added' });
  }

  static async removeTag(req: AuthRequest, res: Response): Promise<void> {
    const { id, tagId } = req.params;

    await prisma.leadTag.deleteMany({
      where: { leadId: id, tagId },
    });

    res.json({ message: 'Tag removed' });
  }

  static async bulkAction(req: AuthRequest, res: Response): Promise<void> {
    const { action, leadIds, data } = req.body;

    switch (action) {
      case 'assign_rep':
        await prisma.lead.updateMany({
          where: { id: { in: leadIds } },
          data: { assignedRepId: data.repId },
        });
        break;

      case 'change_status':
        await prisma.lead.updateMany({
          where: { id: { in: leadIds } },
          data: { status: data.status },
        });
        break;

      case 'add_tag':
        await prisma.leadTag.createMany({
          data: leadIds.map((leadId: string) => ({
            leadId,
            tagId: data.tagId,
          })),
          skipDuplicates: true,
        });
        break;

      case 'suppress':
        await prisma.lead.updateMany({
          where: { id: { in: leadIds } },
          data: {
            isSuppressed: true,
            suppressedAt: new Date(),
            suppressReason: data.reason || 'manual',
          },
        });
        break;

      default:
        throw new AppError('Unknown action', 400);
    }

    res.json({ message: 'Bulk action completed', affected: leadIds.length });
  }
}
