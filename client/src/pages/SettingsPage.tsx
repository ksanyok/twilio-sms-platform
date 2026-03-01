import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  Radio,
  Zap,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

type Tab = 'tags' | 'users' | 'suppression' | 'system' | 'integrations' | 'activity';

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    if (t && ['tags', 'users', 'suppression', 'system', 'integrations', 'activity'].includes(t)) return t as Tab;
    return 'tags';
  });

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && ['tags', 'users', 'suppression', 'system', 'integrations', 'activity'].includes(t)) {
      setTab(t as Tab);
    }
  }, [searchParams]);

  const handleTabChange = (key: Tab) => {
    setTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'tags', label: 'Tags', icon: <Tag className="w-4 h-4" /> },
    { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { key: 'suppression', label: 'Suppression', icon: <ShieldX className="w-4 h-4" /> },
    { key: 'integrations', label: 'Integrations', icon: <Key className="w-4 h-4" /> },
    { key: 'system', label: 'System', icon: <Settings className="w-4 h-4" /> },
    { key: 'activity', label: 'Activity Log', icon: <Clock className="w-4 h-4" /> },
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
            onClick={() => handleTabChange(t.key)}
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
      {tab === 'activity' && <ActivityLogTab />}
    </div>
  );
}

/* ─── Tags ─── */
function TagsTab() {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; color: string } | null>(null);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color: string }) =>
      api.put(`/settings/tags/${id}`, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setEditingTag(null);
      toast.success('Tag updated');
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
            {editingTag?.id === tag.id && editingTag ? (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditingTag({ id: editingTag.id, name: editingTag.name, color: c })}
                      className={clsx(
                        'w-5 h-5 rounded-full transition-transform',
                        editingTag.color === c && 'ring-2 ring-offset-1 ring-offset-dark-900 ring-white scale-110'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  className="input py-1 text-sm flex-1"
                  value={editingTag.name}
                  onChange={(e) => setEditingTag({ id: editingTag.id, name: e.target.value, color: editingTag.color })}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editingTag.name.trim()) {
                      updateMutation.mutate({ id: editingTag.id, name: editingTag.name, color: editingTag.color });
                    }
                    if (e.key === 'Escape') setEditingTag(null);
                  }}
                />
                <button
                  onClick={() => updateMutation.mutate({ id: editingTag.id, name: editingTag.name, color: editingTag.color })}
                  disabled={!editingTag.name.trim() || updateMutation.isPending}
                  className="btn-primary py-1 px-3 text-xs"
                >
                  Save
                </button>
                <button onClick={() => setEditingTag(null)} className="btn-ghost py-1 px-2 text-xs">
                  Cancel
                </button>
              </div>
            ) : (
              <>
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingTag({ id: tag.id, name: tag.name, color: tag.color })}
                    className="btn-ghost p-1 text-dark-500 hover:text-dark-200"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(tag.id)}
                    className="btn-ghost p-1 text-dark-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['suppression', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (search) params.set('search', search);
      const { data } = await api.get(`/settings/suppression?${params}`);
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/suppression/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppression'] });
      toast.success('Removed from suppression list');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const handleExport = async () => {
    try {
      const { data } = await api.get('/settings/suppression/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `suppression-list-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exported suppression list');
    } catch {
      toast.error('Export failed');
    }
  };

  const entries = data?.entries || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-dark-100">Suppression List</h3>
        <button onClick={handleExport} className="btn-ghost text-sm">
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </button>
      </div>
      <p className="text-sm text-dark-400">
        Numbers on this list will never receive messages. STOP keywords are automatically added.
      </p>

      {/* Bulk Add */}
      <div className="space-y-3">
        <label className="label">Add Numbers (one per line)</label>
        <textarea
          className="input min-h-[100px] font-mono text-sm"
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

      {/* Stats + Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg flex-1">
          <ShieldX className="w-5 h-5 text-red-400" />
          <p className="text-sm font-medium text-dark-200">
            {pagination.total} suppressed numbers
          </p>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 text-dark-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by phone..."
            className="input pl-9 py-2 text-sm"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-1">
        {entries.map((entry: any) => (
          <div
            key={entry.id}
            className="flex items-center justify-between py-2 px-3 bg-dark-800/30 rounded text-sm group hover:bg-dark-700/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="font-mono text-dark-300">{entry.phone}</span>
              <span className="text-xs text-dark-500">{entry.reason}</span>
              <span className="text-xs text-dark-600">
                {new Date(entry.createdAt).toLocaleDateString()}
              </span>
            </div>
            <button
              onClick={() => deleteMutation.mutate(entry.id)}
              className="btn-ghost p-1 text-dark-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-sm text-dark-500 text-center py-4">
            {search ? 'No matching entries' : 'Suppression list is empty'}
          </p>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-dark-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-ghost p-1.5 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="btn-ghost p-1.5 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Integrations (Twilio + OpenAI) ─── */
function IntegrationsTab() {
  const queryClient = useQueryClient();
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showTestToken, setShowTestToken] = useState(false);
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

  const smsMode = settings.smsMode || 'live';

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

        {/* Test Credentials — shown when twilio_test mode is active */}
        <div className={clsx(
          'rounded-lg p-4 border transition-colors duration-200',
          smsMode === 'twilio_test'
            ? 'border-cyan-500/40 bg-cyan-500/5'
            : 'border-dark-700/50 bg-dark-800/30'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className={clsx('w-4 h-4', smsMode === 'twilio_test' ? 'text-cyan-400' : 'text-dark-400')} />
            <span className="text-sm font-medium text-dark-200">Test Credentials</span>
            {smsMode === 'twilio_test' && (
              <span className="badge bg-cyan-500/20 text-cyan-400 text-[10px] uppercase tracking-wider">In Use</span>
            )}
          </div>
          <p className="text-xs text-dark-400 mb-3">
            Used when SMS Mode is set to "Twilio Test" in System settings. API calls work but no real SMS delivered.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <IntegrationField label="Test Account SID" settingKey="twilioTestAccountSid" />
            <IntegrationField label="Test Auth Token" settingKey="twilioTestAuthToken" isSecret showSecret={showTestToken} onToggle={() => setShowTestToken(!showTestToken)} />
          </div>
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
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Webhook className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-dark-100">Outbound Webhooks</h3>
            <p className="text-xs text-dark-400">Send events to external services (CRM, Zapier, Make)</p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-4 space-y-2">
          <p className="text-xs font-semibold text-dark-200">How Outbound Webhooks Work</p>
          <ul className="text-xs text-dark-400 space-y-1.5 list-disc list-inside">
            <li>When an event fires, we send a <span className="text-dark-200 font-mono">POST</span> request to your URL with a JSON payload</li>
            <li>Each payload includes <span className="text-dark-200 font-mono">event</span>, <span className="text-dark-200 font-mono">timestamp</span>, and <span className="text-dark-200 font-mono">source: "scl-sms-platform"</span></li>
            <li>Requests timeout after <strong className="text-dark-200">10 seconds</strong>. Non-200 responses are logged but not retried</li>
            <li>Use services like <strong className="text-dark-200">Zapier Webhooks</strong>, <strong className="text-dark-200">Make (Integromat)</strong>, <strong className="text-dark-200">n8n</strong>, or your own API endpoint</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Reply Webhook */}
          <WebhookField
            label="New Reply Webhook URL"
            settingKey="webhookOnReply"
            description="Triggered when a lead replies to an SMS. Use this to push replies to your CRM, notify your team in Slack, or trigger follow-up automations."
            examplePayload={`{
  "event": "reply",
  "leadId": "clx123...",
  "phone": "+13051234567",
  "body": "Yes, I'm interested!",
  "conversationId": "conv_456...",
  "timestamp": "2026-02-28T15:30:00Z",
  "source": "scl-sms-platform"
}`}
            exampleUrl="https://hooks.zapier.com/hooks/catch/123456/abcdef/"
            getVal={getVal}
            handleChange={handleChange}
            handleSave={handleSave}
            dirty={dirty}
            isSaving={saveMutation.isPending}
          />

          {/* Opt-Out Webhook */}
          <WebhookField
            label="Opt-Out Webhook URL"
            settingKey="webhookOnOptOut"
            description="Triggered when a contact sends STOP/UNSUBSCRIBE. Use this to update your CRM's DNC list, suppress in other systems, or notify compliance."
            examplePayload={`{
  "event": "opt_out",
  "phone": "+13051234567",
  "leadId": "clx123...",
  "timestamp": "2026-02-28T15:30:00Z",
  "source": "scl-sms-platform"
}`}
            exampleUrl="https://hook.us1.make.com/abcdefghijk"
            getVal={getVal}
            handleChange={handleChange}
            handleSave={handleSave}
            dirty={dirty}
            isSaving={saveMutation.isPending}
          />

          {/* Stage Change Webhook */}
          <WebhookField
            label="Stage Change Webhook URL"
            settingKey="webhookOnStageChange"
            description="Triggered when a lead moves between pipeline stages (e.g. New → Interested → Funded). Use this to sync pipeline changes to your CRM or trigger stage-specific workflows."
            examplePayload={`{
  "event": "stage_change",
  "leadId": "clx123...",
  "fromStage": "New",
  "toStage": "Interested",
  "timestamp": "2026-02-28T15:30:00Z",
  "source": "scl-sms-platform"
}`}
            exampleUrl="https://n8n.yourdomain.com/webhook/stage-change"
            getVal={getVal}
            handleChange={handleChange}
            handleSave={handleSave}
            dirty={dirty}
            isSaving={saveMutation.isPending}
          />
        </div>

        {/* Quick Tips */}
        <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-4 flex items-start gap-3">
          <Brain className="w-4 h-4 text-scl-400 mt-0.5 shrink-0" />
          <div className="text-xs text-dark-400 space-y-1">
            <p><strong className="text-dark-200">Zapier:</strong> Create a "Webhooks by Zapier" trigger → "Catch Hook" and paste the URL here</p>
            <p><strong className="text-dark-200">Make.com:</strong> Add a "Webhooks" module → "Custom webhook" and paste the generated URL</p>
            <p><strong className="text-dark-200">n8n:</strong> Add a "Webhook" node, set method to POST, and use the production URL</p>
            <p><strong className="text-dark-200">Custom API:</strong> Create a POST endpoint that accepts JSON body with Content-Type: application/json</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Webhook Field Component ─── */
function WebhookField({
  label,
  settingKey,
  description,
  examplePayload,
  exampleUrl,
  getVal,
  handleChange,
  handleSave,
  dirty,
  isSaving,
}: {
  label: string;
  settingKey: string;
  description: string;
  examplePayload: string;
  exampleUrl: string;
  getVal: (key: string, def?: string) => string;
  handleChange: (key: string, val: string) => void;
  handleSave: (key: string) => void;
  dirty: Set<string>;
  isSaving: boolean;
}) {
  const [showPayload, setShowPayload] = useState(false);
  const currentVal = getVal(settingKey);
  const isConfigured = currentVal && currentVal.startsWith('http');

  return (
    <div className="rounded-lg border border-dark-700/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-dark-200">{label}</label>
          {isConfigured && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-400">
              ● Connected
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowPayload(!showPayload)}
          className="text-[11px] text-dark-500 hover:text-dark-300 transition-colors"
        >
          {showPayload ? 'Hide payload ↑' : 'Show payload ↓'}
        </button>
      </div>
      <p className="text-xs text-dark-400 leading-relaxed">{description}</p>
      <div className="flex items-center gap-2">
        <input
          className="input font-mono text-sm flex-1"
          type="url"
          value={currentVal}
          onChange={(e) => handleChange(settingKey, e.target.value)}
          placeholder={exampleUrl}
        />
        {dirty.has(settingKey) && (
          <button onClick={() => handleSave(settingKey)} disabled={isSaving} className="btn-primary py-2 px-3 text-xs">
            <Save className="w-3 h-3" />
          </button>
        )}
      </div>
      {showPayload && (
        <div className="rounded-md bg-dark-900/80 border border-dark-700/40 p-3 overflow-x-auto">
          <p className="text-[10px] text-dark-500 uppercase tracking-wider mb-1.5 font-semibold">Example JSON Payload (POST)</p>
          <pre className="text-[11px] text-dark-300 font-mono leading-relaxed whitespace-pre">{examplePayload}</pre>
        </div>
      )}
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

  const smsMode = (settings.smsMode as string) || 'live';
  const isRampUp = settings.rampUpEnabled === true || settings.rampUpEnabled === 'true';

  const handleSmsModeChange = (mode: string) => {
    saveMutation.mutate({ key: 'smsMode', value: mode });
  };

  const handleRampUpToggle = () => {
    const newValue = !isRampUp;
    saveMutation.mutate({ key: 'rampUpEnabled', value: newValue as any });
  };

  const smsModes = [
    {
      value: 'live',
      label: 'Live',
      desc: 'Real SMS sent via production Twilio credentials',
      icon: <Radio className="w-4 h-4" />,
      color: 'green',
    },
    {
      value: 'twilio_test',
      label: 'Twilio Test',
      desc: 'API calls via test credentials — Twilio accepts but doesn\'t deliver',
      icon: <Shield className="w-4 h-4" />,
      color: 'cyan',
    },
    {
      value: 'simulation',
      label: 'Simulation',
      desc: 'No API calls at all — messages are simulated locally',
      icon: <FlaskConical className="w-4 h-4" />,
      color: 'amber',
    },
  ] as const;

  const currentMode = smsModes.find(m => m.value === smsMode) || smsModes[0];
  const colorMap: Record<string, { border: string; bg: string; text: string; dot: string }> = {
    green: { border: 'border-green-500/50', bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-500' },
    cyan: { border: 'border-cyan-500/50', bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-500' },
    amber: { border: 'border-amber-500/50', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
  };

  return (
    <div className="space-y-6">
      {/* SMS Mode Selector */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            colorMap[currentMode.color].bg, colorMap[currentMode.color].text
          )}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
              SMS Sending Mode
              <span className={clsx(
                'badge text-[10px] uppercase tracking-wider',
                colorMap[currentMode.color].bg, colorMap[currentMode.color].text
              )}>
                {currentMode.label}
              </span>
            </h4>
            <p className="text-xs text-dark-400 mt-0.5">{currentMode.desc}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {smsModes.map((mode) => {
            const active = smsMode === mode.value;
            const c = colorMap[mode.color];
            return (
              <button
                key={mode.value}
                onClick={() => handleSmsModeChange(mode.value)}
                disabled={saveMutation.isPending}
                className={clsx(
                  'relative rounded-lg p-4 border-2 text-left transition-all duration-200 focus:outline-none',
                  active
                    ? [c.border, c.bg]
                    : 'border-dark-700/50 hover:border-dark-600 bg-dark-800/30'
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={clsx(active ? c.text : 'text-dark-400')}>
                    {mode.icon}
                  </span>
                  <span className={clsx('text-sm font-medium', active ? 'text-dark-100' : 'text-dark-300')}>
                    {mode.label}
                  </span>
                </div>
                <p className="text-xs text-dark-400 leading-relaxed">{mode.desc}</p>
                {active && (
                  <div className={clsx('absolute top-3 right-3 w-2.5 h-2.5 rounded-full', c.dot)} />
                )}
              </button>
            );
          })}
        </div>
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

      {/* Ramp-Up Configuration */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              isRampUp ? 'bg-green-500/20 text-green-400' : 'bg-dark-700 text-dark-400'
            )}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
                Number Ramp-Up
                {isRampUp && (
                  <span className="badge bg-green-500/20 text-green-400 text-[10px] uppercase tracking-wider">Active</span>
                )}
              </h4>
              <p className="text-xs text-dark-400 mt-0.5">
                {isRampUp
                  ? 'New numbers gradually increase daily sending limits to build reputation'
                  : 'Enable to warm up new numbers and avoid carrier flags'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRampUpToggle}
            disabled={saveMutation.isPending}
            className={clsx(
              'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none',
              isRampUp ? 'bg-green-500' : 'bg-dark-600'
            )}
          >
            <span className={clsx(
              'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
              isRampUp ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>

        {isRampUp && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dark-700/50">
            <div>
              <label className="label">Start Limit (msgs/day)</label>
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  type="number"
                  min={1}
                  max={1000}
                  value={getValue('rampUpStartLimit', '10')}
                  onChange={(e) => {
                    setLocalSettings(prev => ({ ...prev, rampUpStartLimit: e.target.value }));
                    setDirty(prev => new Set(prev).add('rampUpStartLimit'));
                  }}
                />
                {dirty.has('rampUpStartLimit') && (
                  <button
                    onClick={() => saveMutation.mutate({ key: 'rampUpStartLimit', value: getValue('rampUpStartLimit', '10') })}
                    disabled={saveMutation.isPending}
                    className="btn-primary py-2 px-3 text-xs"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-dark-500 mt-1">How many messages a new number can send on day 1</p>
            </div>
            <div>
              <label className="label">Daily Increase</label>
              <div className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  type="number"
                  min={1}
                  max={500}
                  value={getValue('rampUpDailyIncrease', '5')}
                  onChange={(e) => {
                    setLocalSettings(prev => ({ ...prev, rampUpDailyIncrease: e.target.value }));
                    setDirty(prev => new Set(prev).add('rampUpDailyIncrease'));
                  }}
                />
                {dirty.has('rampUpDailyIncrease') && (
                  <button
                    onClick={() => saveMutation.mutate({ key: 'rampUpDailyIncrease', value: getValue('rampUpDailyIncrease', '5') })}
                    disabled={saveMutation.isPending}
                    className="btn-primary py-2 px-3 text-xs"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-dark-500 mt-1">Additional messages allowed each day</p>
            </div>
          </div>
        )}
      </div>

      {/* Anti-Blocking Engine */}
      <AntiBlockingSection
        settings={settings}
        getValue={getValue}
        localSettings={localSettings}
        setLocalSettings={setLocalSettings}
        dirty={dirty}
        setDirty={setDirty}
        saveMutation={saveMutation}
      />
    </div>
  );
}

/* ─── Anti-Blocking Section ─── */
function AntiBlockingSection({
  settings, getValue, localSettings, setLocalSettings, dirty, setDirty, saveMutation,
}: {
  settings: Record<string, any>;
  getValue: (key: string, def: string) => string;
  localSettings: Record<string, string>;
  setLocalSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dirty: Set<string>;
  setDirty: React.Dispatch<React.SetStateAction<Set<string>>>;
  saveMutation: any;
}) {
  const isSpintax = settings.spintaxEnabled === true || settings.spintaxEnabled === 'true';
  const isTimeDist = settings.timeDistributionEnabled === true || settings.timeDistributionEnabled === 'true';

  const toggleSetting = (key: string, current: boolean) => {
    saveMutation.mutate({ key, value: (!current).toString() });
  };

  const ToggleRow = ({ label, desc, isOn, settingKey }: { label: string; desc: string; isOn: boolean; settingKey: string }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-dark-200">{label}</p>
        <p className="text-xs text-dark-500 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => toggleSetting(settingKey, isOn)}
        disabled={saveMutation.isPending}
        className={clsx(
          'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none',
          isOn ? 'bg-scl-500' : 'bg-dark-600'
        )}
      >
        <span className={clsx(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          isOn ? 'translate-x-6' : 'translate-x-1'
        )} />
      </button>
    </div>
  );

  const NumericField = ({ label, desc, settingKey, defaultValue, min, max, unit }: {
    label: string; desc: string; settingKey: string; defaultValue: string; min: number; max: number; unit?: string;
  }) => (
    <div>
      <label className="label">{label} {unit && <span className="text-dark-500">({unit})</span>}</label>
      <div className="flex items-center gap-2">
        <input
          className="input flex-1"
          type="number"
          min={min}
          max={max}
          value={getValue(settingKey, defaultValue)}
          onChange={(e) => {
            setLocalSettings(prev => ({ ...prev, [settingKey]: e.target.value }));
            setDirty(prev => new Set(prev).add(settingKey));
          }}
        />
        {dirty.has(settingKey) && (
          <button
            onClick={() => saveMutation.mutate({ key: settingKey, value: getValue(settingKey, defaultValue) })}
            disabled={saveMutation.isPending}
            className="btn-primary py-2 px-3 text-xs"
          >
            <Save className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className="text-xs text-dark-500 mt-1">{desc}</p>
    </div>
  );

  return (
    <div className="card p-5 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/15 text-purple-400">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
            Anti-Blocking Engine
            <span className="badge bg-purple-500/15 text-purple-400 text-[10px] uppercase tracking-wider">25k/day</span>
          </h4>
          <p className="text-xs text-dark-400 mt-0.5">Advanced settings to avoid carrier filtering and improve deliverability</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="divide-y divide-dark-700/50">
        <ToggleRow
          label="Spintax Content Variation"
          desc='Randomize messages using {Hello|Hi|Hey} syntax to avoid fingerprinting'
          isOn={isSpintax}
          settingKey="spintaxEnabled"
        />
        <ToggleRow
          label="Time Distribution"
          desc="Spread bulk sends evenly across business hours instead of sending all at once"
          isOn={isTimeDist}
          settingKey="timeDistributionEnabled"
        />
      </div>

      {/* Numeric fields */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dark-700/50">
        <NumericField
          label="Delay Jitter"
          desc="Random variation applied to delay between messages (e.g. 40 = ±40%)"
          settingKey="jitterPercent"
          defaultValue="40"
          min={0}
          max={100}
          unit="%"
        />
        <NumericField
          label="Circuit Breaker Threshold"
          desc="Auto-pause campaign if this % of last 50 messages failed"
          settingKey="circuitBreakerThreshold"
          defaultValue="30"
          min={5}
          max={100}
          unit="%"
        />
        <NumericField
          label="Delivery Rate Throttle"
          desc="Slow down numbers with delivery rate below this value"
          settingKey="deliveryRateThrottleAt"
          defaultValue="80"
          min={50}
          max={100}
          unit="%"
        />
        <NumericField
          label="Business Hours"
          desc="Start and end hour for time-distributed sends (24h format)"
          settingKey="businessHoursStart"
          defaultValue="9"
          min={0}
          max={23}
          unit="start hour"
        />
        <NumericField
          label="Business Hours End"
          desc="End hour for time-distributed sends (24h format)"
          settingKey="businessHoursEnd"
          defaultValue="18"
          min={0}
          max={23}
          unit="end hour"
        />
      </div>

      {/* Spintax help */}
      {isSpintax && (
        <div className="rounded-lg p-4 border border-purple-500/20 bg-purple-500/5 space-y-2">
          <p className="text-xs font-semibold text-purple-300">Spintax Template Examples</p>
          <div className="text-xs text-dark-400 space-y-1 font-mono">
            <p>{'{Hello|Hi|Hey}'} {'{{firstName}}'}, {'{'} this is|I\'m{'}'} calling about your credit application.</p>
            <p>{'{'} Please call us|Give us a call|Reach out{'}'} at {'{{companyPhone}}'}.</p>
          </div>
          <p className="text-xs text-dark-500">Each recipient receives a uniquely varied message, reducing carrier pattern detection.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Activity Log ─── */
function ActivityLogTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['activityLog'],
    queryFn: async () => {
      const { data } = await api.get('/settings/activity?limit=100');
      return data;
    },
  });

  const logs: any[] = data?.logs || [];

  const actionColor = (action: string) => {
    if (action.includes('delete') || action.includes('remove')) return 'text-red-400 bg-red-500/10';
    if (action.includes('create') || action.includes('add')) return 'text-green-400 bg-green-500/10';
    if (action.includes('update') || action.includes('edit') || action.includes('assign')) return 'text-blue-400 bg-blue-500/10';
    if (action.includes('login') || action.includes('auth')) return 'text-purple-400 bg-purple-500/10';
    return 'text-dark-400 bg-dark-700/50';
  };

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-dark-100">Activity Log</h3>
        <span className="text-xs text-dark-500">{logs.length} recent events</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-dark-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-dark-500 text-center py-8">No activity recorded yet</p>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log: any) => (
            <div
              key={log.id}
              className="flex items-center gap-3 py-2.5 px-3 bg-dark-800/30 rounded-lg hover:bg-dark-700/30 transition-colors"
            >
              <div className={clsx('px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider', actionColor(log.action))}>
                {log.action}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark-200 truncate">
                  {log.description || log.details || log.action}
                </p>
              </div>
              {log.user && (
                <span className="text-xs text-dark-500 shrink-0">
                  {log.user.firstName} {log.user.lastName}
                </span>
              )}
              <span className="text-xs text-dark-600 shrink-0">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
