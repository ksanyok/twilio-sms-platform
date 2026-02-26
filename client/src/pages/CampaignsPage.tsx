import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Campaign, CampaignStatus } from '../types';
import {
  Plus,
  Search,
  Play,
  Pause,
  XCircle,
  BarChart3,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CampaignsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/campaigns?${params}`);
      return data;
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign started!');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to start'),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign paused');
    },
  });

  const statuses: CampaignStatus[] = ['DRAFT', 'SCHEDULED', 'SENDING', 'PAUSED', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="p-8 space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Campaigns</h1>
          <p className="text-sm text-dark-400 mt-1">Manage your SMS campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder="Search campaigns..."
            className="input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`badge cursor-pointer ${!statusFilter ? 'bg-scl-600/30 text-scl-300' : 'bg-dark-700 text-dark-400 hover:text-dark-300'}`}
          >
            All
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`badge cursor-pointer ${statusFilter === s ? 'bg-scl-600/30 text-scl-300' : 'bg-dark-700 text-dark-400 hover:text-dark-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign List */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Campaign</th>
              <th className="table-header">Status</th>
              <th className="table-header text-center">Sent</th>
              <th className="table-header text-center">Delivered</th>
              <th className="table-header text-center">Failed</th>
              <th className="table-header text-center">Blocked</th>
              <th className="table-header text-center">Replied</th>
              <th className="table-header text-center">Rate</th>
              <th className="table-header">Created</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-dark-500">
                  Loading campaigns...
                </td>
              </tr>
            )}
            {data?.campaigns?.length === 0 && (
              <tr>
                <td colSpan={10} className="p-12 text-center text-dark-500">
                  <Send className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No campaigns yet</p>
                  <p className="text-xs mt-1">Create your first campaign to get started</p>
                </td>
              </tr>
            )}
            {data?.campaigns?.map((campaign: Campaign) => {
              const deliveryRate = campaign.totalSent > 0
                ? ((campaign.totalDelivered / campaign.totalSent) * 100).toFixed(1)
                : '-';
              
              return (
                <tr key={campaign.id} className="table-row">
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-dark-200">{campaign.name}</p>
                      <p className="text-xs text-dark-500 mt-0.5">{campaign.totalLeads} leads</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <CampaignStatusBadge status={campaign.status} />
                  </td>
                  <td className="table-cell text-center font-mono">{campaign.totalSent.toLocaleString()}</td>
                  <td className="table-cell text-center font-mono text-green-400">{campaign.totalDelivered.toLocaleString()}</td>
                  <td className="table-cell text-center font-mono text-red-400">{campaign.totalFailed.toLocaleString()}</td>
                  <td className="table-cell text-center font-mono text-yellow-400">{campaign.totalBlocked.toLocaleString()}</td>
                  <td className="table-cell text-center font-mono text-purple-400">{campaign.totalReplied.toLocaleString()}</td>
                  <td className="table-cell text-center">
                    <span className={`text-xs font-medium ${
                      parseFloat(deliveryRate) >= 80 ? 'text-green-400' :
                      parseFloat(deliveryRate) >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {deliveryRate}%
                    </span>
                  </td>
                  <td className="table-cell text-dark-500 text-xs">
                    {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {['DRAFT', 'SCHEDULED', 'PAUSED'].includes(campaign.status) && (
                        <button
                          onClick={() => startMutation.mutate(campaign.id)}
                          className="p-1.5 hover:bg-green-600/20 rounded text-dark-400 hover:text-green-400 transition-colors"
                          title="Start"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {campaign.status === 'SENDING' && (
                        <button
                          onClick={() => pauseMutation.mutate(campaign.id)}
                          className="p-1.5 hover:bg-yellow-600/20 rounded text-dark-400 hover:text-yellow-400 transition-colors"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-1.5 hover:bg-dark-700 rounded text-dark-400 hover:text-dark-200 transition-colors" title="Analytics">
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    messageTemplate: '',
    sendingSpeed: 60,
    scheduledAt: '',
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/campaigns', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign created!');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg mx-4 animate-fade-in">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark-100">New Campaign</h3>
          <button onClick={onClose} className="text-dark-500 hover:text-dark-300">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="card-body space-y-4">
          <div>
            <label className="label">Campaign Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., February Follow-Up"
              required
            />
          </div>
          <div>
            <label className="label">Message Template</label>
            <textarea
              className="input min-h-[120px] resize-y"
              value={formData.messageTemplate}
              onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
              placeholder="Hi {{firstName}}, this is SCL..."
              required
            />
            <p className="text-xs text-dark-500 mt-1">
              Available variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{company}}'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Sending Speed</label>
              <select
                className="input"
                value={formData.sendingSpeed}
                onChange={(e) => setFormData({ ...formData, sendingSpeed: parseInt(e.target.value) })}
              >
                <option value="30">30 / min (Slow)</option>
                <option value="60">60 / min (Normal)</option>
                <option value="120">120 / min (Fast)</option>
              </select>
            </div>
            <div>
              <label className="label">Schedule (Optional)</label>
              <input
                type="datetime-local"
                className="input"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: any; class: string }> = {
    DRAFT: { icon: Clock, class: 'bg-dark-600/50 text-dark-300' },
    SCHEDULED: { icon: Clock, class: 'bg-blue-500/20 text-blue-400' },
    SENDING: { icon: Send, class: 'bg-yellow-500/20 text-yellow-400' },
    PAUSED: { icon: Pause, class: 'bg-orange-500/20 text-orange-400' },
    COMPLETED: { icon: CheckCircle, class: 'bg-green-500/20 text-green-400' },
    CANCELLED: { icon: XCircle, class: 'bg-red-500/20 text-red-400' },
  };

  const cfg = config[status] || config.DRAFT;
  const Icon = cfg.icon;

  return (
    <span className={`badge ${cfg.class}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </span>
  );
}
