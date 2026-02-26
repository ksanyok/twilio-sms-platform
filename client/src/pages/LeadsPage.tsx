import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Search,
  Upload,
  Plus,
  Tag,
  UserPlus,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  CheckSquare,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { clsx } from 'clsx';

const STATUSES = ['NEW', 'CONTACTED', 'REPLIED', 'INTERESTED', 'DOCS_REQUESTED', 'SUBMITTED', 'FUNDED', 'NOT_INTERESTED', 'DNC'];

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/leads?${params}`);
      return data;
    },
  });

  const leads = data?.leads || [];
  const total = data?.pagination?.total || 0;
  const totalPages = data?.pagination?.pages || 1;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l: any) => l.id)));
    }
  };

  const bulkMutation = useMutation({
    mutationFn: (payload: any) => api.post('/leads/bulk', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelected(new Set());
      toast.success('Bulk action completed');
    },
    onError: () => toast.error('Bulk action failed'),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">Leads</h1>
          <p className="text-sm text-dark-400 mt-1">{total} total leads</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowImport(true)} className="btn-ghost flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            className="input pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-scl-600/10 border border-scl-600/30 rounded-lg px-4 py-2.5">
          <span className="text-sm font-medium text-scl-300">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              className="input w-auto text-sm py-1.5"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  bulkMutation.mutate({
                    action: 'change_status',
                    leadIds: Array.from(selected),
                    data: { status: e.target.value },
                  });
                }
              }}
            >
              <option value="">Change Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={() =>
                bulkMutation.mutate({
                  action: 'suppress',
                  leadIds: Array.from(selected),
                })
              }
              className="btn-ghost text-sm text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Suppress
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="btn-ghost text-sm"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700/50">
                <th className="table-th w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === leads.length && leads.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-scl-500 focus:ring-scl-500"
                  />
                </th>
                <th className="table-th">Name</th>
                <th className="table-th">Phone</th>
                <th className="table-th">Status</th>
                <th className="table-th">Source</th>
                <th className="table-th">Tags</th>
                <th className="table-th">Added</th>
                <th className="table-th w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="table-td">
                        <div className="h-4 bg-dark-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              {leads.map((lead: any) => (
                <tr
                  key={lead.id}
                  className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors"
                >
                  <td className="table-td">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-scl-500 focus:ring-scl-500"
                    />
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-semibold text-dark-300">
                        {lead.firstName?.[0]}{lead.lastName?.[0] || ''}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-200">
                          {lead.firstName} {lead.lastName || ''}
                        </p>
                        {lead.email && (
                          <p className="text-xs text-dark-500">{lead.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-dark-300 font-mono">{lead.phone}</span>
                  </td>
                  <td className="table-td">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-dark-400">{lead.source || '—'}</span>
                  </td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      {lead.tags?.slice(0, 3).map((lt: any) => (
                        <span
                          key={lt.tag.id}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: lt.tag.color + '33',
                            color: lt.tag.color,
                          }}
                        >
                          {lt.tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="table-td">
                    <span className="text-sm text-dark-400">
                      {format(new Date(lead.createdAt), 'MMM d')}
                    </span>
                  </td>
                  <td className="table-td">
                    <button className="btn-ghost p-1">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700/50">
          <p className="text-sm text-dark-500">
            Showing {leads.length} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost p-2 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-dark-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-ghost p-2 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

      {/* Create Modal */}
      {showCreate && <CreateLeadModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: 'bg-blue-500/20 text-blue-300',
    CONTACTED: 'bg-yellow-500/20 text-yellow-300',
    REPLIED: 'bg-scl-500/20 text-scl-300',
    INTERESTED: 'bg-emerald-500/20 text-emerald-300',
    DOCS_REQUESTED: 'bg-purple-500/20 text-purple-300',
    SUBMITTED: 'bg-cyan-500/20 text-cyan-300',
    FUNDED: 'bg-green-500/20 text-green-300',
    NOT_INTERESTED: 'bg-dark-700 text-dark-400',
    DNC: 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={clsx('badge', styles[status] || 'badge-info')}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/leads/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Imported ${res.data.imported} leads (${res.data.duplicates} duplicates)`);
      onClose();
    },
    onError: () => toast.error('Import failed'),
  });

  const handleImport = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    importMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-dark-50">Import Leads</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f?.name.endsWith('.csv')) setFile(f);
          }}
          className={clsx(
            'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-scl-500 bg-scl-500/10'
              : 'border-dark-600 hover:border-dark-500'
          )}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) setFile(f);
            };
            input.click();
          }}
        >
          <FileSpreadsheet className="w-10 h-10 mx-auto text-dark-500 mb-3" />
          {file ? (
            <p className="text-sm text-scl-300 font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-sm text-dark-300 font-medium">Drop CSV file here or click to browse</p>
              <p className="text-xs text-dark-500 mt-1">
                Required columns: phone. Optional: firstName, lastName, email, city, state, source
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={handleImport}
            disabled={!file || importMutation.isPending}
            className="btn-primary"
          >
            {importMutation.isPending ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateLeadModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    source: '',
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead created');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.phone) return;
    createMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark-50">Add Lead</h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name *</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Phone *</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+1XXXXXXXXXX" />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Source</label>
            <input className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g., Website, Referral" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
