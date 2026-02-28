import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { subDays, subHours, startOfDay, endOfDay } from 'date-fns';
import { getSmsMode } from '../config/twilio';
import redis from '../config/redis';

export class DashboardController {

  static async getStats(req: AuthRequest, res: Response): Promise<void> {
    const now = new Date();
    const last24h = subDays(now, 1);
    const last7d = subDays(now, 7);

    // Parallel queries for performance
    const [
      sentLast24h,
      deliveredLast24h,
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

      // Messages delivered in last 24h
      prisma.message.count({
        where: {
          direction: 'OUTBOUND',
          createdAt: { gte: last24h },
          status: 'DELIVERED',
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
        deliveredLast24h,
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
    const totals = { sent: 0, delivered: 0, failed: 0, blocked: 0, replies: 0, optOuts: 0 };
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
      totals.sent += stat.sent;
      totals.delivered += stat.delivered;
      totals.failed += stat.failed;
      totals.blocked += stat.blocked;
      totals.replies += stat.replies;
      totals.optOuts += stat.optOuts;
    }

    res.json({
      metrics: Array.from(aggregated.values()),
      totals,
    });
  }

  /**
   * GET /dashboard/diagnostics — System health, SMS mode, error breakdown, uptime info
   */
  static async getDiagnostics(req: AuthRequest, res: Response): Promise<void> {
    const now = new Date();
    const last24h = subDays(now, 1);
    const last1h = subHours(now, 1);
    const last7d = subDays(now, 7);

    const smsMode = await getSmsMode();

    const [
      // 24h error breakdown
      errorBreakdown,
      // 1h sending velocity
      sentLastHour,
      // Queue depth (pending messages)
      pendingMessages,
      // Active numbers
      numberStats,
      // Total conversations
      totalConversations,
      // Last message sent
      lastMessage,
      // 24h stats
      stats24h,
      // 7d stats
      stats7d,
      // Recent errors (last 10)
      recentErrors,
      // Opt-outs 24h
      optOuts24h,
    ] = await Promise.all([
      prisma.message.groupBy({
        by: ['errorCode'],
        where: {
          status: { in: ['FAILED', 'BLOCKED'] },
          createdAt: { gte: last24h },
          errorCode: { not: null },
        },
        _count: true,
        orderBy: { _count: { errorCode: 'desc' } },
        take: 10,
      }),

      prisma.message.count({
        where: {
          direction: 'OUTBOUND',
          createdAt: { gte: last1h },
          status: { in: ['SENT', 'DELIVERED', 'SENDING'] },
        },
      }),

      prisma.message.count({
        where: { status: { in: ['QUEUED', 'SENDING'] } },
      }),

      prisma.phoneNumber.groupBy({
        by: ['status'],
        _count: true,
      }),

      prisma.conversation.count(),

      prisma.message.findFirst({
        where: { direction: 'OUTBOUND' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, status: true },
      }),

      prisma.message.groupBy({
        by: ['status'],
        where: {
          direction: 'OUTBOUND',
          createdAt: { gte: last24h },
        },
        _count: true,
      }),

      prisma.message.groupBy({
        by: ['status'],
        where: {
          direction: 'OUTBOUND',
          createdAt: { gte: last7d },
        },
        _count: true,
      }),

      prisma.message.findMany({
        where: {
          status: { in: ['FAILED', 'BLOCKED'] },
          createdAt: { gte: last24h },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          failedAt: true,
          conversation: {
            select: { lead: { select: { phone: true } } },
          },
        },
      }),

      prisma.lead.count({
        where: {
          status: 'DNC',
          updatedAt: { gte: last24h },
        },
      }),
    ]);

    // Aggregate 24h and 7d stats into objects
    const aggregate = (groups: Array<{ status: string; _count: number }>) => {
      const m: Record<string, number> = {};
      for (const g of groups) m[g.status] = g._count;
      return {
        sent: (m.SENT || 0) + (m.DELIVERED || 0),
        delivered: m.DELIVERED || 0,
        failed: m.FAILED || 0,
        blocked: m.BLOCKED || 0,
        queued: m.QUEUED || 0,
        sending: m.SENDING || 0,
      };
    };

    const agg24h = aggregate(stats24h.map(s => ({ status: s.status, _count: s._count })));
    const agg7d = aggregate(stats7d.map(s => ({ status: s.status, _count: s._count })));

    // Number summary
    const numberSummary: Record<string, number> = {};
    for (const g of numberStats) {
      numberSummary[g.status] = g._count;
    }

    // Redis check
    let redisOk = false;
    try { await redis.ping(); redisOk = true; } catch { /* */ }

    res.json({
      smsMode,
      serverTime: now.toISOString(),
      uptime: process.uptime(),
      health: {
        database: true,
        redis: redisOk,
        twilio: smsMode === 'live',
      },
      sending: {
        velocityPerHour: sentLastHour,
        pendingInQueue: pendingMessages,
        lastMessageAt: lastMessage?.createdAt || null,
        lastMessageStatus: lastMessage?.status || null,
      },
      stats24h: {
        ...agg24h,
        optOuts: optOuts24h,
        deliveryRate: agg24h.sent > 0 ? +((agg24h.delivered / agg24h.sent) * 100).toFixed(1) : 0,
        errorRate: agg24h.sent > 0 ? +(((agg24h.failed + agg24h.blocked) / agg24h.sent) * 100).toFixed(1) : 0,
      },
      stats7d: {
        ...agg7d,
        deliveryRate: agg7d.sent > 0 ? +((agg7d.delivered / agg7d.sent) * 100).toFixed(1) : 0,
        errorRate: agg7d.sent > 0 ? +(((agg7d.failed + agg7d.blocked) / agg7d.sent) * 100).toFixed(1) : 0,
      },
      numbers: {
        total: Object.values(numberSummary).reduce((a, b) => a + b, 0),
        active: numberSummary.ACTIVE || 0,
        warming: numberSummary.WARMING || 0,
        cooling: numberSummary.COOLING || 0,
        disabled: numberSummary.DISABLED || 0,
      },
      conversations: totalConversations,
      errorBreakdown: errorBreakdown.map(e => ({
        code: e.errorCode,
        count: e._count,
      })),
      recentErrors: recentErrors.map(e => ({
        id: e.id,
        status: e.status,
        errorCode: e.errorCode,
        errorMessage: e.errorMessage,
        phone: e.conversation?.lead?.phone || null,
        createdAt: e.createdAt,
        failedAt: e.failedAt,
      })),
    });
  }
}
