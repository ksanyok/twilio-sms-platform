import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Phone,
  Activity,
  Thermometer,
  Snowflake,
  Zap,
  Users,
  BarChart3,
  Shield,
  Plus,
  MoreVertical,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { clsx } from 'clsx';

export default function NumbersPage() {
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['numbers'],
    queryFn: async () => {
      const { data } = await api.get('/numbers');
      return data;
    },
  });

  const { data: poolsData } = useQuery({
    queryKey: ['numberPools'],
    queryFn: async () => {
      const { data } = await api.get('/numbers/pools');
      return data;
    },
  });

  const coolMutation = useMutation({
    mutationFn: (id: string) => api.post(`/numbers/${id}/cool`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      toast.success('Number cooled');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/numbers/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      toast.success('Number activated');
    },
  });

  const numbers = data?.numbers || [];
  const pools = poolsData?.pools || [];

  const activeCount = numbers.filter((n: any) => n.status === 'ACTIVE').length;
  const coolingCount = numbers.filter((n: any) => n.status === 'COOLING').length;
  const flaggedCount = numbers.filter((n: any) => n.status === 'FLAGGED').length;
  const avgHealth = numbers.length > 0
    ? Math.round(numbers.reduce((sum: number, n: any) => sum + (n.deliveryRate || 0), 0) / numbers.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Phone Numbers</h1>
          <p className="text-sm text-dark-400 mt-1">{numbers.length} numbers in pool</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['numbers'] })}
          className="btn-ghost flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Active</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-dark-50 mt-2">{activeCount}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Cooling</span>
            <Snowflake className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-dark-50 mt-2">{coolingCount}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Flagged</span>
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-dark-50 mt-2">{flaggedCount}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Avg Health</span>
            <Activity className="w-5 h-5 text-scl-400" />
          </div>
          <p className="text-2xl font-bold text-dark-50 mt-2">{avgHealth}%</p>
        </div>
      </div>

      {/* Number Pools */}
      {pools.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-dark-200 mb-3">Number Pools</h3>
          <div className="grid grid-cols-3 gap-3">
            {pools.map((pool: any) => (
              <div
                key={pool.id}
                className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-dark-200">{pool.name}</p>
                  <span className={clsx(
                    'badge text-[10px]',
                    pool.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-dark-700 text-dark-400'
                  )}>
                    {pool.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-dark-500 mt-1">
                  {pool._count?.members || 0} numbers
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Numbers Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="table-th">Number</th>
                <th className="table-th">Status</th>
                <th className="table-th">Health</th>
                <th className="table-th">Sent Today</th>
                <th className="table-th">Daily Limit</th>
                <th className="table-th">Delivery Rate</th>
                <th className="table-th">Ramp Day</th>
                <th className="table-th">Assigned To</th>
                <th className="table-th w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="table-td">
                        <div className="h-4 bg-dark-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              {numbers.map((number: any) => (
                <tr
                  key={number.id}
                  className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors"
                >
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-dark-500" />
                      <span className="text-sm font-mono text-dark-200">{number.phoneNumber}</span>
                    </div>
                  </td>
                  <td className="table-td">
                    <NumberStatusBadge status={number.status} />
                  </td>
                  <td className="table-td">
                    <HealthBar score={Math.round(number.deliveryRate || 0)} />
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-dark-300">{number.dailySentCount}</span>
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-dark-400">{number.dailyLimit}</span>
                  </td>
                  <td className="table-td">
                    <span className={clsx(
                      'text-sm font-medium',
                      (number.deliveryRate || 0) >= 95 ? 'text-emerald-400' :
                      (number.deliveryRate || 0) >= 85 ? 'text-yellow-400' : 'text-red-400'
                    )}>
                      {(number.deliveryRate || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-dark-400">
                      {number.isRamping ? `Day ${number.rampDay || 0}` : 'Done'}
                    </span>
                  </td>
                  <td className="table-td">
                    <button
                      onClick={() => setShowAssign(number.id)}
                      className="text-xs text-scl-400 hover:text-scl-300"
                    >
                      Assign
                    </button>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      {number.status === 'ACTIVE' ? (
                        <button
                          onClick={() => coolMutation.mutate(number.id)}
                          className="btn-ghost p-1.5 text-blue-400 hover:text-blue-300"
                          title="Cool down"
                        >
                          <Snowflake className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => activateMutation.mutate(number.id)}
                          className="btn-ghost p-1.5 text-emerald-400 hover:text-emerald-300"
                          title="Activate"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAssign && <AssignModal numberId={showAssign} onClose={() => setShowAssign(null)} />}
    </div>
  );
}

function NumberStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-300',
    COOLING: 'bg-blue-500/20 text-blue-300',
    WARMING: 'bg-yellow-500/20 text-yellow-300',
    FLAGGED: 'bg-red-500/20 text-red-300',
    DISABLED: 'bg-dark-700 text-dark-400',
  };
  return <span className={clsx('badge', styles[status] || '')}>{status}</span>;
}

function HealthBar({ score }: { score: number }) {
  const color =
    score >= 90 ? 'bg-emerald-500' :
    score >= 70 ? 'bg-yellow-500' :
    score >= 50 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-dark-400">{score}</span>
    </div>
  );
}

function AssignModal({ numberId, onClose }: { numberId: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users');
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post('/numbers/assign', { repId: userId, phoneNumberIds: [numberId] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      toast.success('Number assigned');
      onClose();
    },
  });

  const users = usersData?.users || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark-50">Assign Number</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {users.map((user: any) => (
            <button
              key={user.id}
              onClick={() => assignMutation.mutate(user.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-dark-800 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-scl-600/20 flex items-center justify-center text-scl-400 text-sm font-semibold">
                {user.firstName?.[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-dark-200">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-dark-500">{user.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
