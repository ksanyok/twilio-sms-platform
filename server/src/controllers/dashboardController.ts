import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export class DashboardController {

  static async getStats(req: AuthRequest, res: Response): Promise<void> {
    const now = new Date();
    const last24h = subDays(now, 1);
    const last7d = subDays(now, 7);

    // Parallel queries for performance
    const [
      sentLast24h,
      totalLeads,
      repliesLast7d,
      sentLast7d,
      pipelineSnapshot,
      recentCampaigns,
      numberHealth,
      activeAutomations,
    ] = await Promise.all([
      // Messages sent in last 24h
      prisma.message.count({
        where: {
          direction: 'OUTBOUND',
          createdAt: { gte: last24h },
          status: { in: ['SENT', 'DELIVERED'] },
        },
      }),

      // Total leads
      prisma.lead.count(),

      // Replies in last 7 days
      prisma.message.count({
        where: {
          direction: 'INBOUND',
          createdAt: { gte: last7d },
        },
      }),

      // Sent in last 7 days
      prisma.message.count({
        where: {
          direction: 'OUTBOUND',
          createdAt: { gte: last7d },
          status: { in: ['SENT', 'DELIVERED'] },
        },
      }),

      // Pipeline snapshot
      prisma.pipelineStage.findMany({
        include: {
          _count: { select: { cards: true } },
        },
        orderBy: { order: 'asc' },
      }),

      // Recent campaigns
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          totalSent: true,
          totalDelivered: true,
          totalFailed: true,
          totalBlocked: true,
          totalReplied: true,
          createdAt: true,
        },
      }),

      // Number health summary
      prisma.phoneNumber.groupBy({
        by: ['status'],
        _count: true,
      }),

      // Active automations
      prisma.automationRun.count({
        where: { isActive: true, isPaused: false },
      }),
    ]);

    // Daily send volume (last 7 days)
    const dailyVolume = await prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*) FILTER (WHERE status IN ('SENT', 'DELIVERED')) as sent,
        COUNT(*) FILTER (WHERE status = 'DELIVERED') as delivered,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
        COUNT(*) FILTER (WHERE status = 'BLOCKED') as blocked
      FROM messages 
      WHERE direction = 'OUTBOUND' 
        AND "createdAt" >= ${last7d}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    const replyRate = sentLast7d > 0 ? ((repliesLast7d / sentLast7d) * 100).toFixed(1) : '0';

    res.json({
      overview: {
        sentLast24h,
        totalLeads,
        replyRate: parseFloat(replyRate),
        activeAutomations,
      },
      pipelineSnapshot: pipelineSnapshot.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        count: stage._count.cards,
      })),
      recentCampaigns,
      numberHealth: numberHealth.map((g) => ({
        status: g.status,
        count: g._count,
      })),
      dailyVolume,
    });
  }

  static async getDeliveryMetrics(req: AuthRequest, res: Response): Promise<void> {
    const days = parseInt(req.query.days as string) || 7;
    const since = subDays(new Date(), days);

    const stats = await prisma.dailyNumberStats.findMany({
      where: { date: { gte: since } },
      orderBy: { date: 'asc' },
    });

    // Aggregate by date
    const aggregated = new Map<string, any>();
    for (const stat of stats) {
      const date = stat.date.toISOString().split('T')[0];
      if (!aggregated.has(date)) {
        aggregated.set(date, {
          date,
          sent: 0,
          delivered: 0,
          failed: 0,
          blocked: 0,
          replies: 0,
          optOuts: 0,
        });
      }
      const agg = aggregated.get(date);
      agg.sent += stat.sent;
      agg.delivered += stat.delivered;
      agg.failed += stat.failed;
      agg.blocked += stat.blocked;
      agg.replies += stat.replies;
      agg.optOuts += stat.optOuts;
    }

    res.json({
      metrics: Array.from(aggregated.values()),
    });
  }
}
