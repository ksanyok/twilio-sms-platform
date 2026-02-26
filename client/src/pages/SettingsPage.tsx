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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

type Tab = 'tags' | 'users' | 'suppression' | 'system';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('tags');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'tags', label: 'Tags', icon: <Tag className="w-4 h-4" /> },
    { key: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { key: 'suppression', label: 'Suppression', icon: <ShieldX className="w-4 h-4" /> },
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
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/auth/users');
      return data;
    },
  });

  const users = data?.users || [];

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
            className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg"
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
            <span className={clsx(
              'badge text-[10px]',
              user.role === 'ADMIN' ? 'bg-red-500/20 text-red-300' :
              user.role === 'MANAGER' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-blue-500/20 text-blue-300'
            )}>
              {user.role}
            </span>
          </div>
        ))}
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'REP' });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => api.post('/auth/register', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark-50">Add User</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-5 h-5" /></button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="REP">Representative</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create User'}
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
    mutationFn: () =>
      api.post('/settings/suppression', {
        phones: phones.split('\n').filter(Boolean).map((p) => p.trim()),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['suppression'] });
      setPhones('');
      toast.success(`Added ${res.data.added} to suppression list`);
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
            {data?.total || 0} suppressed numbers
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

/* ─── System ─── */
function SystemTab() {
  const { data } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (settings: any) => api.put('/settings', settings),
    onSuccess: () => toast.success('Settings saved'),
  });

  const settings = data?.settings || {};

  return (
    <div className="card p-6 space-y-6">
      <h3 className="text-base font-semibold text-dark-100">System Configuration</h3>
      <p className="text-sm text-dark-400">
        Core settings are managed via environment variables. This section shows current runtime values.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Max Messages / Number / Day', key: 'maxPerNumberPerDay', value: '300' },
          { label: 'Global Daily Limit', key: 'globalDailyLimit', value: '20000' },
          { label: 'Quiet Hours Start', key: 'quietHoursStart', value: '21:00' },
          { label: 'Quiet Hours End', key: 'quietHoursEnd', value: '09:00' },
          { label: 'Default Send Speed (msg/min)', key: 'defaultSpeed', value: '4' },
          { label: 'Opt-Out Reply', key: 'optOutReply', value: 'You have been unsubscribed.' },
        ].map((item) => (
          <div key={item.key}>
            <label className="label">{item.label}</label>
            <input className="input" defaultValue={settings[item.key] || item.value} readOnly />
          </div>
        ))}
      </div>

      <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50">
        <p className="text-xs text-dark-500">
          To change these values, update the .env file and restart the server. 
          Future versions will support live configuration updates.
        </p>
      </div>
    </div>
  );
}
