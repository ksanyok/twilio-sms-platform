import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Zap,
  Plus,
  Trash2,
  Edit3,
  Clock,
  MessageSquare,
  Target,
  ChevronDown,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function AutomationPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: async () => {
      const { data } = await api.get('/automation/rules');
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/automation/rules/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Rule updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/automation/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Rule deleted');
    },
  });

  const rules = data?.rules || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Automation</h1>
          <p className="text-sm text-dark-400 mt-1">
            Configure follow-up sequences and keyword triggers
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Active Rules</span>
            <Zap className="w-5 h-5 text-scl-400" />
          </div>
          <p className="text-2xl font-bold text-dark-50 mt-2">
            {rules.filter((r: any) => r.isActive).length}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Total Templates</span>
            <MessageSquare className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-dark-50 mt-2">
            {rules.reduce((sum: number, r: any) => sum + (r.templates?.length || 0), 0)}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">Active Runs</span>
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-dark-50 mt-2">
            {rules.reduce((sum: number, r: any) => sum + (r._count?.runs || 0), 0)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading &&
          [...Array(3)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-dark-700 rounded w-1/3 mb-3" />
              <div className="h-4 bg-dark-700 rounded w-1/2" />
            </div>
          ))}

        {rules.map((rule: any) => (
          <div key={rule.id} className="card p-5 hover:border-dark-600 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <button
                  onClick={() =>
                    toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })
                  }
                  className={clsx(
                    'mt-1 w-10 h-5 rounded-full transition-colors relative',
                    rule.isActive ? 'bg-scl-600' : 'bg-dark-700'
                  )}
                >
                  <div
                    className={clsx(
                      'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform',
                      rule.isActive ? 'translate-x-5' : 'translate-x-0.5'
                    )}
                  />
                </button>

                <div>
                  <h3 className="text-base font-semibold text-dark-100">{rule.name}</h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={clsx(
                      'badge text-[10px]',
                      rule.type === 'LEAD_CREATED'
                        ? 'bg-blue-500/20 text-blue-300'
                        : rule.type === 'STATUS_CHANGED'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : rule.type === 'KEYWORD_RECEIVED'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-dark-700 text-dark-400'
                    )}>
                      {(rule.type || 'UNKNOWN').replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-dark-500">
                      {rule.templates?.length || 0} steps
                    </span>
                    <span className="text-xs text-dark-500">
                      {rule._count?.runs || 0} active runs
                    </span>
                  </div>

                  {rule.templates?.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {rule.templates
                        .sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder)
                        .map((t: any, i: number) => (
                          <div key={t.id} className="flex items-center gap-2">
                            <div className="bg-dark-800 rounded-lg px-3 py-1.5 text-xs text-dark-300 border border-dark-700/50">
                              <span className="text-dark-500 mr-1">Step {t.sequenceOrder}:</span>
                              {(t.messageTemplate || '').slice(0, 40)}...
                              <span className="text-dark-500 ml-2">
                                ({t.delayDays}d)
                              </span>
                            </div>
                            {i < rule.templates.length - 1 && (
                              <ChevronDown className="w-3 h-3 text-dark-600 rotate-[-90deg]" />
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setEditingRule(rule)} className="btn-ghost p-2">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this automation rule?')) {
                      deleteMutation.mutate(rule.id);
                    }
                  }}
                  className="btn-ghost p-2 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {rules.length === 0 && !isLoading && (
          <div className="card p-12 text-center">
            <Zap className="w-12 h-12 mx-auto text-dark-600 mb-4" />
            <p className="text-dark-300 font-medium">No automation rules yet</p>
            <p className="text-sm text-dark-500 mt-1">
              Create your first rule to automate follow-up sequences
            </p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Create Rule
            </button>
          </div>
        )}
      </div>

      {(showCreate || editingRule) && (
        <AutomationModal
          rule={editingRule}
          onClose={() => {
            setShowCreate(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
}

function AutomationModal({ rule, onClose }: { rule?: any; onClose: () => void }) {
  const isEdit = !!rule;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: rule?.name || '',
    type: rule?.type || 'LEAD_CREATED',
    triggerConfig: rule?.triggerConfig || {},
    actionConfig: rule?.actionConfig || {},
    isActive: rule?.isActive ?? true,
  });

  const [templates, setTemplates] = useState<any[]>(
    rule?.templates
      ?.sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder)
      .map((t: any) => ({
        messageTemplate: t.messageTemplate,
        delayDays: t.delayDays,
      })) || [{ messageTemplate: '', delayDays: 1 }]
  );

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? api.put(`/automation/rules/${rule.id}`, data)
        : api.post('/automation/rules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      toast.success(isEdit ? 'Rule updated' : 'Rule created');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || templates.some((t) => !t.messageTemplate)) {
      toast.error('Fill in all required fields');
      return;
    }
    saveMutation.mutate({
      ...form,
      templates: templates.map((t, i) => ({
        messageTemplate: t.messageTemplate,
        delayDays: t.delayDays,
        sequenceOrder: i + 1,
      })),
    });
  };

  const addStep = () =>
    setTemplates([...templates, { messageTemplate: '', delayDays: 1 }]);
  const removeStep = (i: number) =>
    setTemplates(templates.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="card w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-dark-50">
            {isEdit ? 'Edit Rule' : 'New Automation Rule'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Rule Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., New Lead Follow-Up"
              required
            />
          </div>

          <div>
            <label className="label">Trigger Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="LEAD_CREATED">Lead Created</option>
              <option value="STATUS_CHANGED">Status Changed</option>
              <option value="KEYWORD_RECEIVED">Keyword Received</option>
              <option value="NO_REPLY">No Reply (timeout)</option>
              <option value="MANUAL">Manual Start</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Message Sequence</label>
              <button
                type="button"
                onClick={addStep}
                className="text-xs text-scl-400 hover:text-scl-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Step
              </button>
            </div>
            <div className="space-y-3">
              {templates.map((tpl, i) => (
                <div
                  key={i}
                  className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-dark-400">
                      Step {i + 1}
                    </span>
                    {templates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(i)}
                        className="text-dark-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <textarea
                    className="input min-h-[80px] resize-none text-sm mb-2"
                    placeholder="Message body. Use {{firstName}}, {{lastName}}, etc."
                    value={tpl.messageTemplate}
                    onChange={(e) => {
                      const next = [...templates];
                      next[i] = { ...next[i], messageTemplate: e.target.value };
                      setTemplates(next);
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-dark-500" />
                    <span className="text-xs text-dark-500">Delay:</span>
                    <input
                      type="number"
                      className="input w-20 py-1 text-sm"
                      value={tpl.delayDays}
                      onChange={(e) => {
                        const next = [...templates];
                        next[i] = {
                          ...next[i],
                          delayDays: parseInt(e.target.value) || 0,
                        };
                        setTemplates(next);
                      }}
                      min={0}
                    />
                    <span className="text-xs text-dark-500">days</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending
                ? 'Saving...'
                : isEdit
                ? 'Update Rule'
                : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
