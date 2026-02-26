import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { DashboardStats } from '../types';
import {
  Send,
  Users,
  MessageSquare,
  Bot,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      return data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-dark-800 rounded w-48" />
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-dark-800 rounded-xl" />
            ))}
          </div>
          <div className="h-80 bg-dark-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const stats = data;

  return (
    <div className="p-8 space-y-8 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Dashboard</h1>
          <p className="text-sm text-dark-400 mt-1">
            Overview of your SMS operations
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-dark-500">
          <Activity className="w-3.5 h-3.5 text-green-400" />
          <span>Live • Updated every 30s</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Sent (24h)"
          value={stats?.overview.sentLast24h || 0}
          icon={Send}
          color="indigo"
        />
        <StatCard
          label="Total Leads"
          value={stats?.overview.totalLeads || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Reply Rate (7d)"
          value={`${stats?.overview.replyRate || 0}%`}
          icon={MessageSquare}
          color="green"
        />
        <StatCard
          label="Active Automations"
          value={stats?.overview.activeAutomations || 0}
          icon={Bot}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Volume Chart */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark-200">Send Volume (7 Days)</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-scl-500" />
                Delivered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Failed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                Blocked
              </span>
            </div>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats?.dailyVolume || []}>
                <defs>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#475569"
                  fontSize={12}
                  tickFormatter={(val) => format(new Date(val), 'MMM d')}
                />
                <YAxis stroke="#475569" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stroke="#6366f1"
                  fill="url(#colorDelivered)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  stroke="#f59e0b"
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Snapshot */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-dark-200">Pipeline Snapshot</h3>
          </div>
          <div className="p-4 space-y-3">
            {stats?.pipelineSnapshot?.map((stage) => (
              <div key={stage.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm text-dark-300">{stage.name}</span>
                </div>
                <span className="text-sm font-semibold text-dark-100">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Campaigns & Number Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark-200">Recent Campaigns</h3>
            <a href="/campaigns" className="text-xs text-scl-400 hover:text-scl-300">
              View All →
            </a>
          </div>
          <div className="divide-y divide-dark-700/30">
            {stats?.recentCampaigns?.length === 0 && (
              <div className="p-6 text-center text-sm text-dark-500">
                No campaigns yet
              </div>
            )}
            {stats?.recentCampaigns?.map((campaign) => (
              <div key={campaign.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dark-200">{campaign.name}</p>
                  <p className="text-xs text-dark-500 mt-0.5">
                    {campaign.totalSent} sent • {campaign.totalDelivered} delivered
                  </p>
                </div>
                <CampaignStatusBadge status={campaign.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Number Health */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-sm font-semibold text-dark-200">Number Health</h3>
            <a href="/numbers" className="text-xs text-scl-400 hover:text-scl-300">
              Manage →
            </a>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats?.numberHealth?.map(({ status, count }) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        status === 'ACTIVE'
                          ? 'bg-green-400'
                          : status === 'WARMING'
                          ? 'bg-yellow-400'
                          : status === 'COOLING'
                          ? 'bg-blue-400'
                          : 'bg-red-400'
                      }`}
                    />
                    <span className="text-sm text-dark-300">{status}</span>
                  </div>
                  <span className="text-sm font-medium text-dark-200">{count}</span>
                </div>
              ))}
              {(!stats?.numberHealth || stats.numberHealth.length === 0) && (
                <p className="text-sm text-dark-500 text-center py-4">
                  No numbers configured yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  trend?: number;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-scl-600/20 text-scl-400',
    blue: 'bg-blue-600/20 text-blue-400',
    green: 'bg-green-600/20 text-green-400',
    purple: 'bg-purple-600/20 text-purple-400',
  };

  return (
    <div className="stat-card group hover:border-dark-600/80 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {trend >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="stat-value">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="stat-label mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'badge bg-dark-600/50 text-dark-300',
    SCHEDULED: 'badge-info',
    SENDING: 'badge-warning',
    PAUSED: 'badge bg-orange-500/20 text-orange-400',
    COMPLETED: 'badge-success',
    CANCELLED: 'badge-danger',
  };

  return <span className={styles[status] || 'badge'}>{status}</span>;
}
