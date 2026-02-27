import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import redis from '../config/redis';

const router = Router();

router.use(authenticate);

// ── Allowed system settings keys (whitelist) ──
const ALLOWED_SETTINGS_KEYS = new Set([
  'testMode',
  'quietHoursStart',
  'quietHoursEnd',
  'quietHoursTimezone',
  'maxDailySmsPerNumber',
  'defaultSendingSpeed',
  'autoTagEnabled',
  'webhookUrl',
  'webhookSecret',
  'aiAutoReplyEnabled',
  'aiModel',
  'companyName',
  'companyPhone',
  'optOutMessage',
  'helpMessage',
]);

// Tags
router.get('/tags', asyncHandler(async (req: AuthRequest, res: Response) => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { leads: true } } },
  });
  res.json({ tags });
}));

router.post('/tags', requireRole('ADMIN', 'MANAGER'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, color } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Tag name is required' });
    return;
  }
  const tag = await prisma.tag.create({ data: { name: name.trim(), color: color || '#6366f1' } });
  res.status(201).json({ tag });
}));

router.delete('/tags/:id', requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.leadTag.deleteMany({ where: { tagId: req.params.id } });
  await prisma.tag.delete({ where: { id: req.params.id } });
  res.json({ message: 'Tag deleted' });
}));

// System Settings
router.get('/settings', requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const settings = await prisma.systemSetting.findMany();
  const settingsMap: Record<string, unknown> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }
  res.json({ settings: settingsMap });
}));

router.put('/settings/:key', requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!ALLOWED_SETTINGS_KEYS.has(key)) {
    res.status(400).json({ error: `Unknown setting key: ${key}` });
    return;
  }

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });

  // Invalidate related caches
  await redis.del(`setting:${key}`).catch(() => {});

  res.json({ setting });
}));

// Suppression List
router.get('/suppression', requireRole('ADMIN', 'MANAGER'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.suppressionEntry.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.suppressionEntry.count(),
  ]);

  res.json({ entries, pagination: { page, limit, total } });
}));

router.post('/suppression', requireRole('ADMIN', 'MANAGER'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { phone, reason } = req.body;
  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ error: 'Phone number is required' });
    return;
  }
  const entry = await prisma.suppressionEntry.upsert({
    where: { phone },
    create: { phone, reason: reason || 'manual', source: 'admin' },
    update: { reason: reason || 'manual' },
  });
  res.json({ entry });
}));

router.delete('/suppression/:id', requireRole('ADMIN'), asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.suppressionEntry.delete({ where: { id: req.params.id } });
  res.json({ message: 'Removed from suppression list' });
}));

export default router;
