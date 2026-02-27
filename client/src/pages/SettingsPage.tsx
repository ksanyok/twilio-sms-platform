import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Settings,
  Tag,
  Users,
  ShieldX,
  Save,
  Plus,
  Trash2,
  X,
  Upload,
  Download,
  Palette,
  FlaskConical,
  Edit3,
  Key,
  Phone,
  Brain,
  Webhook,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

type Tab = 'tags' | 'users' | 'suppression' | 'system' | 'integrations';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('tags');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'tags', label: 'Tags', icon: <Tag className="w-4 h-4" /> },
    { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { key: 'suppression', label: 'Suppression', icon: <ShieldX className="w-4 h-4" /> },
    { key: 'integrations', label: 'Integrations', icon: <Key className="w-4 h-4" /> },
    { key: 'system', label: 'System', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-50">Settings</h1>
        <p className="text-sm text-dark-400 mt-1">Manage system configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800/50 p-1 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-dark-700 text-dark-100'
                : 'text-dark-400 hover:text-dark-200'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'tags' && <TagsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'suppression' && <SuppressionTab />}
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'system' && <SystemTab />}
    </div>
  );
}

/* ─── Tags ─── */
function TagsTab() {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await api.get('/settings/tags');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/settings/tags', { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setName('');
      toast.success('Tag created');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success('Tag deleted');
    },
  });

  const tags = data?.tags || [];
  const presetColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="card p-6 space-y-6">
      <h3 className="text-base font-semibold text-dark-100">Manage Tags</h3>

      {/* Create Tag */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="label">Tag Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Hot Lead"
          />
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex items-center gap-2">
            {presetColors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={clsx(
                  'w-7 h-7 rounded-full transition-transform',
                  color === c && 'ring-2 ring-offset-2 ring-offset-dark-900 ring-white scale-110'
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => createMutation.mutate()}
          disabled={!name.trim() || createMutation.isPending}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </button>
      </div>

      {/* Tags List */}
      <div className="space-y-2">
        {tags.map((tag: any) => (
          <div
            key={tag.id}
            className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-sm text-dark-200">{tag.name}</span>
              <span className="text-xs text-dark-500">
                {tag._count?.leads || 0} leads
              </span>
            </div>
            <button
              onClick={() => deleteMutation.mutate(tag.id)}
              className="btn-ghost p-1 text-dark-500 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Users ─── */
function UsersTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users');
      return data;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put(`/auth/users/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const users = data?.users || [];

  const handleContextMenu = (e: React.MouseEvent, user: any) => {
    e.preventDefault();
    setEditingUser(user);
  };

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-dark-100">Team Members</h3>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4 mr-1" />
          Add User
        </button>
      </div>

      <div className="space-y-2">
        {users.map((user: any) => (
          <div
            key={user.id}
            onContextMenu={(e) => handleContextMenu(e, user)}
            className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg group cursor-pointer hover:bg-dark-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-scl-600/20 flex items-center justify-center text-scl-400 text-sm font-semibold">
                {user.firstName?.[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-dark-200">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-dark-500">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!user.isActive && (
                <span className="badge bg-red-500/20 text-red-300 text-[10px]">Disabled</span>
              )}
              <span className={clsx(
                'badge text-[10px]',
                user.role === 'ADMIN' ? 'bg-red-500/20 text-red-300' :
                user.role === 'MANAGER' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-blue-500/20 text-blue-300'
              )}>
                {user.role}
              </span>
              <button
                onClick={() => setEditingUser(user)}
                className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="w-3.5 h-3.5 text-dark-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <UserFormModal onClose={() => setShowCreate(false)} />}
      {editingUser && <UserFormModal user={editingUser} onClose={() => setEditingUser(null)} />}
    </div>
  );
}

function UserFormModal({ user, onClose }: { user?: any; onClose: () => void }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'REP',
    isActive: user?.isActive ?? true,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        const payload: any = { firstName: form.firstName, lastName: form.lastName, role: form.role, isActive: form.isActive };
        if (form.password) payload.password = form.password;
        return api.put(`/auth/users/${user.id}`, payload);
      } else {
        return api.post('/auth/register', form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(isEdit ? 'User updated' : 'User created');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark-50">{isEdit ? 'Edit User' : 'Add User'}</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-5 h-5" /></button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={isEdit} />
          </div>
          <div>
            <label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...(!isEdit && { required: true, minLength: 6 })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="REP">Representative</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {isEdit && (
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.isActive ? 'active' : 'disabled'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Suppression ─── */
function SuppressionTab() {
  const [phones, setPhones] = useState('');
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['suppression'],
    queryFn: async () => {
      const { data } = await api.get('/settings/suppression');
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const phoneList = phones.split('\n').filter(Boolean).map((p) => p.trim());
      const results = [];
      for (const phone of phoneList) {
        try {
          await api.post('/settings/suppression', { phone, reason: 'manual' });
          results.push(phone);
        } catch { /* skip duplicates */ }
      }
      return { added: results.length };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['suppression'] });
      setPhones('');
      toast.success(`Added ${res.added} to suppression list`);
    },
  });

  const entries = data?.entries || [];

  return (
    <div className="card p-6 space-y-6">
      <h3 className="text-base font-semibold text-dark-100">Suppression List</h3>
      <p className="text-sm text-dark-400">
        Numbers on this list will never receive messages. STOP keywords are automatically added.
      </p>

      {/* Bulk Add */}
      <div className="space-y-3">
        <label className="label">Add Numbers (one per line)</label>
        <textarea
          className="input min-h-[120px] font-mono text-sm"
          placeholder={"+12125551234\n+13105559876"}
          value={phones}
          onChange={(e) => setPhones(e.target.value)}
        />
        <button
          onClick={() => addMutation.mutate()}
          disabled={!phones.trim() || addMutation.isPending}
          className="btn-primary text-sm"
        >
          <Upload className="w-4 h-4 mr-1" />
          Add to List
        </button>
      </div>

      {/* Count */}
      <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
        <ShieldX className="w-5 h-5 text-red-400" />
        <div>
          <p className="text-sm font-medium text-dark-200">
            {data?.pagination?.total || 0} suppressed numbers
          </p>
          <p className="text-xs text-dark-500">
            Last 20 shown below
          </p>
        </div>
      </div>

      {/* Recent List */}
      <div className="space-y-1">
        {entries.slice(0, 20).map((entry: any) => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-2 px-3 bg-dark-800/30 rounded text-sm"
          >
            <span className="font-mono text-dark-300">{entry.phone}</span>
            <span className="text-xs text-dark-500">{entry.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Integrations (Twilio + OpenAI) ─── */
function IntegrationsTab() {
  const queryClient = useQueryClient();
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  const { data } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const { data } = await api.get('/settings/settings');
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put(`/settings/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      toast.success('Setting saved');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  const settings = data?.settings || {};
  const [local, setLocal] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const getVal = (key: string, def: string = '') =>
    local[key] !== undefined ? local[key] : (settings[key] || def);

  const handleChange = (key: string, value: string) => {
    setLocal(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  };

  const handleSave = (key: string) => {
    saveMutation.mutate({ key, value: getVal(key) });
    setDirty(prev => { const next = new Set(prev); next.delete(key); return next; });
  };

  const IntegrationField = ({ label, settingKey, defaultValue = '', isSecret = false, showSecret = false, onToggle }: {
    label: string; settingKey: string; defaultValue?: string; isSecret?: boolean; showSecret?: boolean; onToggle?: () => void;
  }) => (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            className="input pr-10 font-mono text-sm"
            type={isSecret && !showSecret ? 'password' : 'text'}
            value={getVal(settingKey, defaultValue)}
            onChange={(e) => handleChange(settingKey, e.target.value)}
            placeholder={`Enter ${label}...`}
          />
          {isSecret && onToggle && (
            <button type="button" onClick={onToggle} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-dark-200">
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {dirty.has(settingKey) && (
          <button onClick={() => handleSave(settingKey)} disabled={saveMutation.isPending} className="btn-primary py-2 px-3 text-xs">
            <Save className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Twilio */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Phone className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-dark-100">Twilio</h3>
            <p className="text-xs text-dark-400">SMS sending, number management, webhooks</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <IntegrationField label="Account SID" settingKey="twilioAccountSid" />
          <IntegrationField label="Auth Token" settingKey="twilioAuthToken" isSecret showSecret={showTwilioToken} onToggle={() => setShowTwilioToken(!showTwilioToken)} />
          <IntegrationField label="Messaging Service SID" settingKey="twilioMessagingServiceSid" />
          <IntegrationField label="Webhook Base URL" settingKey="webhookBaseUrl" defaultValue="https://yourdomain.com" />
        </div>
      </div>

      {/* OpenAI */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-dark-100">OpenAI</h3>
            <p className="text-xs text-dark-400">AI-powered replies, lead classification, scoring</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <IntegrationField label="API Key" settingKey="openaiApiKey" isSecret showSecret={showOpenAIKey} onToggle={() => setShowOpenAIKey(!showOpenAIKey)} />
          <div>
            <label className="label">Model</label>
            <div className="flex items-center gap-2">
              <select
                className="input flex-1"
                value={getVal('openaiModel', 'gpt-4.1-mini')}
                onChange={(e) => handleChange('openaiModel', e.target.value)}
              >
                <option value="gpt-4.1-mini">GPT-4.1 Mini (fast, cheap)</option>
                <option value="gpt-4.1">GPT-4.1 (balanced)</option>
                <option value="gpt-4.1-nano">GPT-4.1 Nano (fastest, cheapest)</option>
                <option value="o3-mini">o3-mini (reasoning, compact)</option>
                <option value="o4-mini">o4-mini (reasoning, latest)</option>
              </select>
              {dirty.has('openaiModel') && (
                <button onClick={() => handleSave('openaiModel')} disabled={saveMutation.isPending} className="btn-primary py-2 px-3 text-xs">
                  <Save className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Webhooks Outbound */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Webhook className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-dark-100">Outbound Webhooks</h3>
            <p className="text-xs text-dark-400">Send events to external services (CRM, Zapier, Make)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <IntegrationField label="New Reply Webhook URL" settingKey="webhookOnReply" />
          <IntegrationField label="Opt-Out Webhook URL" settingKey="webhookOnOptOut" />
          <IntegrationField label="Stage Change Webhook URL" settingKey="webhookOnStageChange" />
        </div>
      </div>
    </div>
  );
}

/* ─── System ─── */
function SystemTab() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const { data } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const { data } = await api.get('/settings/settings');
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await api.put(`/settings/settings/${key}`, { value });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      setDirty(prev => { const next = new Set(prev); next.delete(variables.key); return next; });
      toast.success('Setting saved');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  const settings = data?.settings || {};

  const fields = [
    { label: 'Max Messages / Number / Day', key: 'maxPerNumberPerDay', defaultValue: '300' },
    { label: 'Global Daily Limit', key: 'globalDailyLimit', defaultValue: '20000' },
    { label: 'Quiet Hours Start (24h)', key: 'quietHoursStart', defaultValue: '21' },
    { label: 'Quiet Hours End (24h)', key: 'quietHoursEnd', defaultValue: '9' },
    { label: 'Quiet Hours Timezone', key: 'quietHoursTimezone', defaultValue: 'America/New_York' },
    { label: 'Default Send Speed (msg/min)', key: 'defaultSpeed', defaultValue: '4' },
    { label: 'Opt-Out Reply', key: 'optOutReply', defaultValue: 'You have been unsubscribed.' },
    { label: 'Help Reply', key: 'helpReply', defaultValue: 'Reply STOP to opt-out.' },
  ];

  const getValue = (key: string, defaultValue: string) =>
    localSettings[key] !== undefined ? localSettings[key] : (settings[key] || defaultValue);

  const isTestMode = settings.testMode === true || settings.testMode === 'true';

  const handleTestModeToggle = () => {
    const newValue = !isTestMode;
    saveMutation.mutate({ key: 'testMode', value: newValue as any });
  };

  return (
    <div className="space-y-6">
      {/* Test Mode Banner */}
      <div className={clsx(
        'card p-5 flex items-center justify-between border-2 transition-colors duration-200',
        isTestMode
          ? 'border-amber-500/50 bg-amber-500/5'
          : 'border-dark-700/50'
      )}>
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isTestMode ? 'bg-amber-500/20 text-amber-400' : 'bg-dark-700 text-dark-400'
          )}>
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
              Test Mode
              {isTestMode && (
                <span className="badge bg-amber-500/20 text-amber-400 text-[10px] uppercase tracking-wider">Active</span>
              )}
            </h4>
            <p className="text-xs text-dark-400 mt-0.5">
              {isTestMode
                ? 'SMS sending is simulated — no real messages are sent via Twilio'
                : 'Enable to test automations and campaigns without actually sending SMS'}
            </p>
          </div>
        </div>
        <button
          onClick={handleTestModeToggle}
          disabled={saveMutation.isPending}
          className={clsx(
            'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none',
            isTestMode ? 'bg-amber-500' : 'bg-dark-600'
          )}
        >
          <span className={clsx(
            'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            isTestMode ? 'translate-x-6' : 'translate-x-1'
          )} />
        </button>
      </div>

      <div className="card p-6 space-y-6">
        <h3 className="text-base font-semibold text-dark-100">System Configuration</h3>
      <p className="text-sm text-dark-400">
        Edit settings below and click Save to apply changes in real-time.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {fields.map((item) => (
          <div key={item.key}>
            <label className="label">{item.label}</label>
            <div className="flex items-center gap-2">
              <input
                className="input flex-1"
                value={getValue(item.key, item.defaultValue)}
                onChange={(e) => {
                  setLocalSettings(prev => ({ ...prev, [item.key]: e.target.value }));
                  setDirty(prev => new Set(prev).add(item.key));
                }}
              />
              {dirty.has(item.key) && (
                <button
                  onClick={() => saveMutation.mutate({ key: item.key, value: getValue(item.key, item.defaultValue) })}
                  disabled={saveMutation.isPending}
                  className="btn-primary py-2 px-3 text-xs"
                >
                  <Save className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}
