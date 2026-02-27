import { Router } from 'express';
import prisma from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

const asyncHandler = (fn: Function) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.use(authenticate);

// Tags
router.get('/tags', asyncHandler(async (req: any, res: any) => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { leads: true } } },
  });
  res.json({ tags });
}));

router.post('/tags', requireRole('ADMIN', 'MANAGER'), asyncHandler(async (req: any, res: any) => {
  const { name, color } = req.body;
  const tag = await prisma.tag.create({ data: { name, color } });
  res.status(201).json({ tag });
}));

router.delete('/tags/:id', requireRole('ADMIN'), asyncHandler(async (req: any, res: any) => {
  await prisma.tag.delete({ where: { id: req.params.id } });
  res.json({ message: 'Tag deleted' });
}));

// System Settings
router.get('/settings', requireRole('ADMIN'), asyncHandler(async (req: any, res: any) => {
  const settings = await prisma.systemSetting.findMany();
  const settingsMap = settings.reduce((acc: any, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
  res.json({ settings: settingsMap });
}));

router.put('/settings/:key', requireRole('ADMIN'), asyncHandler(async (req: any, res: any) => {
  const { key } = req.params;
  const { value } = req.body;
  const setting = await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  res.json({ setting });
}));

// Suppression List
router.get('/suppression', requireRole('ADMIN', 'MANAGER'), asyncHandler(async (req: any, res: any) => {
  const { page = '1', limit = '50' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [entries, total] = await Promise.all([
    prisma.suppressionEntry.findMany({
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.suppressionEntry.count(),
  ]);

  res.json({ entries, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

router.post('/suppression', requireRole('ADMIN', 'MANAGER'), asyncHandler(async (req: any, res: any) => {
  const { phone, reason } = req.body;
  const entry = await prisma.suppressionEntry.upsert({
    where: { phone },
    create: { phone, reason: reason || 'manual', source: 'admin' },
    update: { reason: reason || 'manual' },
  });
  res.json({ entry });
}));

router.delete('/suppression/:id', requireRole('ADMIN'), asyncHandler(async (req: any, res: any) => {
  await prisma.suppressionEntry.delete({ where: { id: req.params.id } });
  res.json({ message: 'Removed from suppression list' });
}));

export default router;
