import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  MeasuringStrategy,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../services/api';
import {
  Plus,
  GripVertical,
  Phone,
  User,
  Tag,
  MoreVertical,
  ChevronRight,
  Edit3,
  Trash2,
  X,
  Palette,
  MessageSquare,
  Star,
  Ban,
  ExternalLink,
  Copy,
  GripHorizontal,
  LayoutGrid,
  Columns,
  LayoutList,
  Filter,
  UserPlus,
  StickyNote,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

/* ─── View Mode ─── */
type ViewMode = 'board' | 'grid-2' | 'grid-3' | 'grid-4';

function getStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem('pipeline-view-mode');
    if (stored && ['board', 'grid-2', 'grid-3', 'grid-4'].includes(stored)) return stored as ViewMode;
  } catch {}
  return 'board';
}

/* ─── Types ─── */
interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  cards: PipelineCard[];
}

interface PipelineCard {
  id: string;
  leadId: string;
  stageId: string;
  position: number;
  lead: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    status: string;
    company?: string | null;
    assignedRepId?: string | null;
    tags: { tag: { id: string; name: string; color: string } }[];
  };
  notes: string | null;
}

interface ContextMenuState {
  x: number;
  y: number;
  type: 'card' | 'stage';
  card?: PipelineCard;
  stage?: PipelineStage;
}

/* ─── Helpers ─── */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ─── Main Component ─── */
export default function PipelinePage() {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [activeType, setActiveType] = useState<'card' | 'stage' | null>(null);
  const [openMenuStageId, setOpenMenuStageId] = useState<string | null>(null);
  const [showAddStage, setShowAddStage] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterRep, setFilterRep] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [showNoteModal, setShowNoteModal] = useState<PipelineCard | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<PipelineCard | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Persist view mode
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('pipeline-view-mode', mode);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuStageId(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close context menu on scroll/resize
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const { data } = await api.get('/pipeline/stages');
      return data;
    },
  });

  // Tags + Users for filters
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => { const { data } = await api.get('/settings/tags'); return data; },
  });
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => { const { data } = await api.get('/auth/users'); return data; },
  });
  const allTags: { id: string; name: string; color: string }[] = tagsData?.tags || [];
  const allUsers: { id: string; firstName: string; lastName: string }[] = usersData?.users || [];

  const rawStages: PipelineStage[] = data?.stages || [];

  // Apply filters
  const stages = useMemo(() => {
    if (!filterTag && !filterRep && !filterSearch) return rawStages;
    return rawStages.map(stage => ({
      ...stage,
      cards: stage.cards.filter(card => {
        if (filterTag && !card.lead.tags?.some(t => t.tag.id === filterTag)) return false;
        if (filterRep && card.lead.assignedRepId !== filterRep) return false;
        if (filterSearch) {
          const q = filterSearch.toLowerCase();
          const name = `${card.lead.firstName} ${card.lead.lastName || ''}`.toLowerCase();
          if (!name.includes(q) && !card.lead.phone.includes(q) && !(card.lead.company || '').toLowerCase().includes(q)) return false;
        }
        return true;
      }),
    }));
  }, [rawStages, filterTag, filterRep, filterSearch]);

  const stageIds = useMemo(() => stages.map((s) => `stage-${s.id}`), [stages]);

  const moveCardMutation = useMutation({
    mutationFn: ({ cardId, stageId, position }: { cardId: string; stageId: string; position: number }) =>
      api.put(`/pipeline/cards/${cardId}/move`, { stageId, position }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to move card'),
  });

  const reorderStagesMutation = useMutation({
    mutationFn: (stageOrder: { id: string; order: number }[]) =>
      api.put('/pipeline/stages/reorder', { stageOrder }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline'] }),
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to reorder stages'),
  });

  const deleteStMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pipeline/stages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Stage deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete stage'),
  });

  const markDncMutation = useMutation({
    mutationFn: (leadId: string) => api.put(`/leads/${leadId}`, { status: 'DNC' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Marked as DNC');
    },
  });

  const assignRepMutation = useMutation({
    mutationFn: ({ leadId, repId }: { leadId: string; repId: string | null }) =>
      api.put(`/leads/${leadId}`, { assignedRepId: repId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Rep assigned');
      setShowAssignModal(null);
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: ({ leadId, notes }: { leadId: string; notes: string }) =>
      api.put(`/leads/${leadId}`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success('Note saved');
      setShowNoteModal(null);
    },
  });

  /* ─── Find helpers ─── */
  function findCard(cardId: string): PipelineCard | undefined {
    for (const stage of rawStages) {
      const card = stage.cards.find((c) => c.id === cardId);
      if (card) return card;
    }
    return undefined;
  }

  function findStageByCardId(cardId: string): PipelineStage | undefined {
    return rawStages.find((s) => s.cards.some((c) => c.id === cardId));
  }

  /* ─── Drag handlers ─── */
  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    if (id.startsWith('stage-')) {
      setActiveType('stage');
      setActiveId(id);
    } else {
      setActiveType('card');
      setActiveId(id);
    }
    setContextMenu(null);
    setOpenMenuStageId(null);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over?.id ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);
    setOverId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Stage reorder
    if (activeIdStr.startsWith('stage-') && overIdStr.startsWith('stage-')) {
      const activeStageId = activeIdStr.replace('stage-', '');
      const overStageId = overIdStr.replace('stage-', '');
      if (activeStageId === overStageId) return;

      const oldIndex = stages.findIndex((s) => s.id === activeStageId);
      const newIndex = stages.findIndex((s) => s.id === overStageId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(stages, oldIndex, newIndex);
      const stageOrder = reordered.map((s, i) => ({ id: s.id, order: i }));
      reorderStagesMutation.mutate(stageOrder);
      return;
    }

    // Card move
    if (!activeIdStr.startsWith('stage-')) {
      const cardId = activeIdStr;
      let targetStageId: string;

      if (overIdStr.startsWith('stage-')) {
        targetStageId = overIdStr.replace('stage-', '');
      } else {
        // Check if dropped on a stage droppable zone (raw stage ID without prefix)
        const droppedOnStage = stages.find(s => s.id === overIdStr);
        if (droppedOnStage) {
          targetStageId = droppedOnStage.id;
        } else {
          // Dropped on another card — find its stage
          const overCard = findCard(overIdStr);
          const overStage = overCard ? findStageByCardId(overIdStr) : undefined;
          targetStageId = overStage?.id || '';
        }
      }

      if (!targetStageId) return;
      const targetStage = stages.find((s) => s.id === targetStageId);
      if (!targetStage) return;

      // Calculate position
      let position = targetStage.cards.length;
      if (!overIdStr.startsWith('stage-')) {
        const overIndex = targetStage.cards.findIndex((c) => c.id === overIdStr);
        if (overIndex !== -1) position = overIndex;
      }

      moveCardMutation.mutate({ cardId, stageId: targetStageId, position });
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    setActiveType(null);
    setOverId(null);
  }

  /* ─── Context menu handlers ─── */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, type: 'card' | 'stage', item: PipelineCard | PipelineStage) => {
      e.preventDefault();
      e.stopPropagation();
      if (type === 'card') {
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'card', card: item as PipelineCard });
      } else {
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'stage', stage: item as PipelineStage });
      }
    },
    []
  );

  /* ─── Active items for overlay ─── */
  const activeCard = activeType === 'card' && activeId ? findCard(activeId as string) : null;
  const activeStage = activeType === 'stage' && activeId
    ? stages.find((s) => `stage-${s.id}` === activeId)
    : null;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-dark-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-50">Pipeline</h1>
            <p className="text-sm text-dark-400 mt-1">
              Drag leads between stages · Right-click for actions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-dark-500">
              {stages.reduce((sum, s) => sum + s.cards.length, 0)} leads
            </span>
            {/* View Mode Toggle */}
            <div className="flex items-center bg-dark-800 rounded-lg p-0.5 border border-dark-700/50">
              <button
                onClick={() => handleViewModeChange('board')}
                className={clsx(
                  'p-1.5 rounded-md transition-all duration-150',
                  viewMode === 'board' ? 'bg-scl-600 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'
                )}
                title="Board (horizontal)"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('grid-2')}
                className={clsx(
                  'p-1.5 rounded-md transition-all duration-150',
                  viewMode === 'grid-2' ? 'bg-scl-600 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'
                )}
                title="Grid 2 columns"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('grid-3')}
                className={clsx(
                  'p-1.5 rounded-md transition-all duration-150',
                  viewMode === 'grid-3' ? 'bg-scl-600 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'
                )}
                title="Grid 3 columns"
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowAddStage(true)}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Stage
            </button>
          </div>
        </div>
        {/* Filter Bar */}
        <div className="flex items-center gap-3 mt-3">
          <Filter className="w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder="Search leads..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="input py-1.5 px-3 text-sm w-48"
          />
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="input py-1.5 px-3 text-sm w-40"
          >
            <option value="">All Tags</option>
            {allTags.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={filterRep}
            onChange={(e) => setFilterRep(e.target.value)}
            className="input py-1.5 px-3 text-sm w-40"
          >
            <option value="">All Reps</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
          {(filterTag || filterRep || filterSearch) && (
            <button
              onClick={() => { setFilterTag(''); setFilterRep(''); setFilterSearch(''); }}
              className="btn-ghost text-xs text-dark-400 hover:text-dark-200"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <div className={clsx(
        'flex-1 p-6',
        viewMode === 'board' ? 'overflow-x-auto' : 'overflow-y-auto'
      )}>
        {isLoading ? (
          <div className={clsx(
            viewMode === 'board'
              ? 'flex gap-4 h-full'
              : `grid gap-4 ${viewMode === 'grid-2' ? 'grid-cols-2' : 'grid-cols-3'}`
          )}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={clsx(
                'bg-dark-800/50 rounded-xl animate-pulse',
                viewMode === 'board' ? 'w-[300px] shrink-0 h-[400px]' : 'h-[300px]'
              )} />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          >
            <SortableContext
              items={stageIds}
              strategy={viewMode === 'board' ? horizontalListSortingStrategy : rectSortingStrategy}
            >
              <div className={clsx(
                viewMode === 'board'
                  ? 'flex gap-4 h-full min-h-[500px]'
                  : `grid gap-4 auto-rows-min ${
                      viewMode === 'grid-2' ? 'grid-cols-1 md:grid-cols-2' :
                      'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                    }`
              )}>
                {stages.map((stage) => (
                  <SortableStageColumn
                    key={stage.id}
                    stage={stage}
                    isMenuOpen={openMenuStageId === stage.id}
                    onToggleMenu={() => setOpenMenuStageId(openMenuStageId === stage.id ? null : stage.id)}
                    menuRef={openMenuStageId === stage.id ? menuRef : undefined}
                    onEdit={() => { setOpenMenuStageId(null); setEditingStage(stage); }}
                    onDelete={() => {
                      setOpenMenuStageId(null);
                      if (stage.cards.length > 0) {
                        if (!window.confirm(`Delete "${stage.name}"? ${stage.cards.length} cards will be moved to the first stage.`)) return;
                      }
                      deleteStMutation.mutate(stage.id);
                    }}
                    onContextMenu={handleContextMenu}
                    isAnyDragging={!!activeId}
                    viewMode={viewMode}
                  />
                ))}
                {/* Add stage inline card */}
                <button
                  onClick={() => setShowAddStage(true)}
                  className={clsx(
                    'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-dark-700 hover:border-scl-600/50 hover:bg-dark-800/20 transition-all duration-200 gap-2 text-dark-500 hover:text-scl-400',
                    viewMode === 'board' ? 'w-[300px] shrink-0 min-h-[200px]' : 'min-h-[150px]'
                  )}
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-sm font-medium">Add Stage</span>
                </button>
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            }}>
              {activeCard && <CardOverlay card={activeCard} />}
              {activeStage && <StageOverlay stage={activeStage} />}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] w-52 bg-dark-800 border border-dark-600 rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'card' && contextMenu.card && (
            <>
              <button
                onClick={() => {
                  navigate(`/inbox?lead=${contextMenu.card!.leadId}`);
                  setContextMenu(null);
                }}
                className="ctx-menu-item"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Open Conversation
              </button>
              <button
                onClick={() => {
                  navigate(`/inbox?lead=${contextMenu.card!.leadId}&reply=true`);
                  setContextMenu(null);
                }}
                className="ctx-menu-item"
              >
                <Send className="w-3.5 h-3.5" /> Send SMS
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.card!.lead.phone);
                  toast.success('Phone copied');
                  setContextMenu(null);
                }}
                className="ctx-menu-item"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Phone
              </button>
              <div className="border-t border-dark-700 my-1" />
              <button
                onClick={() => {
                  setShowAssignModal(contextMenu.card!);
                  setContextMenu(null);
                }}
                className="ctx-menu-item"
              >
                <UserPlus className="w-3.5 h-3.5" /> Assign Rep
              </button>
              <button
                onClick={() => {
                  setShowNoteModal(contextMenu.card!);
                  setContextMenu(null);
                }}
                className="ctx-menu-item"
              >
                <StickyNote className="w-3.5 h-3.5" /> Add Note
              </button>
              <button
                onClick={() => {
                  navigate(`/leads?id=${contextMenu.card!.leadId}`);
                  setContextMenu(null);
                }}
                className="ctx-menu-item"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Lead
              </button>
              <div className="border-t border-dark-700 my-1" />
              <button
                onClick={() => {
                  markDncMutation.mutate(contextMenu.card!.leadId);
                  setContextMenu(null);
                }}
                className="ctx-menu-item text-red-400 hover:!bg-red-500/10"
              >
                <Ban className="w-3.5 h-3.5" /> Mark DNC
              </button>
            </>
          )}
          {contextMenu.type === 'stage' && contextMenu.stage && (
            <>
              <button
                onClick={() => {
                  setEditingStage(contextMenu.stage!);
                  setContextMenu(null);
                }}
                className="ctx-menu-item"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Stage
              </button>
              <button
                onClick={() => {
                  setEditingStage(contextMenu.stage!);
                  setContextMenu(null);
                }}
                className="ctx-menu-item"
              >
                <Palette className="w-3.5 h-3.5" /> Change Color
              </button>
              <div className="border-t border-dark-700 my-1" />
              <button
                onClick={() => {
                  const st = contextMenu.stage!;
                  if (st.cards.length > 0 && !window.confirm(`Delete "${st.name}"? ${st.cards.length} cards will be moved.`)) {
                    setContextMenu(null);
                    return;
                  }
                  deleteStMutation.mutate(st.id);
                  setContextMenu(null);
                }}
                className="ctx-menu-item text-red-400 hover:!bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Stage
              </button>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddStage && <StageModal onClose={() => setShowAddStage(false)} />}
      {editingStage && <StageModal stage={editingStage} onClose={() => setEditingStage(null)} />}
      {showAssignModal && (
        <AssignRepModal
          card={showAssignModal}
          users={allUsers}
          onAssign={(repId) => assignRepMutation.mutate({ leadId: showAssignModal.leadId, repId })}
          onClose={() => setShowAssignModal(null)}
        />
      )}
      {showNoteModal && (
        <NoteModal
          card={showNoteModal}
          onSave={(notes) => saveNoteMutation.mutate({ leadId: showNoteModal.leadId, notes })}
          onClose={() => setShowNoteModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Sortable Stage Column ─── */
function SortableStageColumn({
  stage,
  isMenuOpen,
  onToggleMenu,
  menuRef,
  onEdit,
  onDelete,
  onContextMenu,
  isAnyDragging,
  viewMode,
}: {
  stage: PipelineStage;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  onEdit: () => void;
  onDelete: () => void;
  onContextMenu: (e: React.MouseEvent, type: 'card' | 'stage', item: any) => void;
  isAnyDragging: boolean;
  viewMode: ViewMode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `stage-${stage.id}`,
    data: { type: 'stage', stage },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: stage.id,
    data: { stageId: stage.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  };

  const cardIds = useMemo(() => stage.cards.map((c) => c.id), [stage.cards]);

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: hexToRgba(stage.color, 0.04),
        borderColor: hexToRgba(stage.color, 0.12),
      }}
      className={clsx(
        'flex flex-col rounded-xl transition-opacity duration-200 border',
        viewMode === 'board' ? 'w-[300px] shrink-0' : 'w-full',
        viewMode !== 'board' && 'min-h-[250px] max-h-[600px]',
        isDragging && 'opacity-30 scale-[0.98]'
      )}
      onContextMenu={(e) => onContextMenu(e, 'stage', stage)}
    >
      {/* Stage Header */}
      <div className="relative">
        {/* Color accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ backgroundColor: stage.color }}
        />
        <div
          className="flex items-center justify-between px-3 py-2.5 rounded-t-xl group/header"
          style={{ backgroundColor: hexToRgba(stage.color, 0.1) }}
        >
        <div className="flex items-center gap-2">
          {/* Drag handle for stage */}
          <button
            className="cursor-grab active:cursor-grabbing text-dark-500 hover:text-dark-300 transition-colors touch-none"
            {...listeners}
            {...attributes}
          >
            <GripHorizontal className="w-4 h-4" />
          </button>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color, boxShadow: `0 0 0 2px var(--color-dark-900), 0 0 0 3px ${stage.color}` }}
          />
          <h3 className="text-sm font-semibold text-dark-200">{stage.name}</h3>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: hexToRgba(stage.color, 0.15),
              color: stage.color,
            }}
          >
            {stage.cards.length}
          </span>
        </div>
        <div className="relative">
          <button onClick={onToggleMenu} className="btn-ghost p-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <div
              ref={menuRef as React.RefObject<HTMLDivElement>}
              className="absolute right-0 top-full mt-1 w-44 bg-dark-800 border border-dark-700 rounded-lg shadow-xl z-50 py-1"
            >
              <button
                onClick={onEdit}
                className="w-full text-left px-3 py-2 text-sm text-dark-200 hover:bg-dark-700/50 flex items-center gap-2"
              >
                <Edit3 className="w-3.5 h-3.5" /> Rename Stage
              </button>
              <button
                onClick={onEdit}
                className="w-full text-left px-3 py-2 text-sm text-dark-200 hover:bg-dark-700/50 flex items-center gap-2"
              >
                <Palette className="w-3.5 h-3.5" /> Change Color
              </button>
              <div className="border-t border-dark-700 my-1" />
              <button
                onClick={onDelete}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-dark-700/50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Stage
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Cards Container */}
      <div
        ref={setDroppableRef}
        className={clsx(
          'flex-1 rounded-b-xl p-2 space-y-2 overflow-y-auto transition-all duration-200',
          isOver
            ? 'ring-2 ring-offset-2 ring-offset-dark-900'
            : '',
          isAnyDragging && !isOver && 'bg-dark-800/10'
        )}
        style={{
          backgroundColor: isOver ? hexToRgba(stage.color, 0.12) : hexToRgba(stage.color, 0.03),
          ...(isOver && {
            boxShadow: `0 0 0 2px ${hexToRgba(stage.color, 0.5)}, 0 0 20px ${hexToRgba(stage.color, 0.15)}`,
            borderColor: stage.color,
          }),
        }}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {stage.cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              stageColor={stage.color}
              onContextMenu={onContextMenu}
            />
          ))}
        </SortableContext>
        {stage.cards.length === 0 && (
          <div
            className="text-center py-8 text-xs rounded-lg border border-dashed transition-colors duration-200"
            style={{
              borderColor: isOver ? hexToRgba(stage.color, 0.4) : 'rgba(255,255,255,0.06)',
              color: isOver ? stage.color : 'rgba(255,255,255,0.25)',
            }}
          >
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sortable Card ─── */
function SortableCard({
  card,
  stageColor,
  onContextMenu,
}: {
  card: PipelineCard;
  stageColor: string;
  onContextMenu: (e: React.MouseEvent, type: 'card' | 'stage', item: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-dark-850 rounded-lg p-3 border border-dark-700/50 hover:border-dark-600',
        'transition-all duration-150 cursor-grab active:cursor-grabbing group/card',
        'hover:shadow-lg hover:shadow-black/20 hover:-translate-y-[1px]',
        isDragging && 'opacity-30 scale-[0.97] shadow-none'
      )}
      onContextMenu={(e) => onContextMenu(e, 'card', card)}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
            style={{
              backgroundColor: hexToRgba(stageColor, 0.15),
              color: stageColor,
            }}
          >
            {card.lead.firstName[0]}{card.lead.lastName?.[0] || ''}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-dark-200 leading-tight truncate">
              {card.lead.firstName} {card.lead.lastName || ''}
            </p>
            <p className="text-[11px] text-dark-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 shrink-0" />
              <span className="truncate">{card.lead.phone}</span>
            </p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-dark-600 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0" />
      </div>

      {card.lead.company && (
        <p className="text-[11px] text-dark-500 mt-1.5 truncate">{card.lead.company}</p>
      )}

      {/* Tags */}
      {card.lead.tags && card.lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.lead.tags.map((lt) => (
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
      )}

      {card.notes && (
        <p className="text-xs text-dark-500 mt-2 line-clamp-2">{card.notes}</p>
      )}
    </div>
  );
}

/* ─── Card Overlay (while dragging) ─── */
function CardOverlay({ card }: { card: PipelineCard }) {
  return (
    <div className="bg-dark-850 rounded-lg p-3 border-2 border-scl-500/60 shadow-2xl shadow-scl-500/20 w-[280px] rotate-[2deg]">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-scl-500/20 flex items-center justify-center text-[10px] font-semibold text-scl-400">
          {card.lead.firstName[0]}{card.lead.lastName?.[0] || ''}
        </div>
        <div>
          <p className="text-sm font-medium text-dark-200">{card.lead.firstName} {card.lead.lastName || ''}</p>
          <p className="text-[11px] text-dark-500">{card.lead.phone}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Stage Overlay (while dragging stage) ─── */
function StageOverlay({ stage }: { stage: PipelineStage }) {
  return (
    <div className="w-[300px] bg-dark-900/95 rounded-xl border-2 shadow-2xl p-3 rotate-[1deg]"
      style={{
        borderColor: stage.color,
        backgroundColor: hexToRgba(stage.color, 0.08),
      }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
        <h3 className="text-sm font-semibold text-dark-200">{stage.name}</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: hexToRgba(stage.color, 0.15), color: stage.color }}>
          {stage.cards.length}
        </span>
      </div>
      <div className="space-y-1">
        {stage.cards.slice(0, 3).map((card) => (
          <div key={card.id} className="bg-dark-800 rounded p-2 text-xs text-dark-400 truncate">
            {card.lead.firstName} {card.lead.lastName || ''} · {card.lead.phone}
          </div>
        ))}
        {stage.cards.length > 3 && (
          <div className="text-[10px] text-dark-500 text-center py-1">
            +{stage.cards.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stage Create/Edit Modal ─── */
function StageModal({ stage, onClose }: { stage?: PipelineStage; onClose: () => void }) {
  const isEdit = !!stage;
  const queryClient = useQueryClient();
  const [name, setName] = useState(stage?.name || '');
  const [color, setColor] = useState(stage?.color || '#6366f1');

  const presetColors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1',
    '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316',
    '#84cc16', '#a855f7',
  ];

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit
        ? api.put(`/pipeline/stages/${stage!.id}`, { name, color })
        : api.post('/pipeline/stages', { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success(isEdit ? 'Stage updated' : 'Stage created');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark-50">
            {isEdit ? 'Edit Stage' : 'Add Pipeline Stage'}
          </h3>
          <button onClick={onClose} className="btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) saveMutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <label className="label">Stage Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Qualified"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx(
                    'w-8 h-8 rounded-full transition-all duration-150',
                    color === c && 'ring-2 ring-offset-2 ring-offset-dark-900 ring-white scale-110'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg" style={{ backgroundColor: hexToRgba(color, 0.1) }}>
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm" style={{ color }}>{name || 'Preview'}</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending || !name.trim()} className="btn-primary">
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update Stage' : 'Create Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Assign Rep Modal ─── */
function AssignRepModal({
  card,
  users,
  onAssign,
  onClose,
}: {
  card: PipelineCard;
  users: { id: string; firstName: string; lastName: string }[];
  onAssign: (repId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark-50">Assign Rep</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-dark-400 mb-3">
          {card.lead.firstName} {card.lead.lastName || ''} · {card.lead.phone}
        </p>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          <button
            onClick={() => onAssign(null as any)}
            className="w-full text-left p-2.5 rounded-lg text-sm hover:bg-dark-700/50 text-dark-400 transition-colors"
          >
            Unassign
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => onAssign(u.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg text-sm hover:bg-dark-700/50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-scl-600/20 flex items-center justify-center text-xs font-semibold text-scl-400">
                {u.firstName[0]}
              </div>
              <span className="text-dark-200">{u.firstName} {u.lastName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Note Modal ─── */
function NoteModal({
  card,
  onSave,
  onClose,
}: {
  card: PipelineCard;
  onSave: (notes: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(card.notes || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-dark-50">Note</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-dark-400 mb-3">
          {card.lead.firstName} {card.lead.lastName || ''} · {card.lead.phone}
        </p>
        <textarea
          className="input min-h-[120px] text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note about this lead..."
          autoFocus
        />
        <div className="flex justify-end gap-3 pt-3">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => onSave(text)} className="btn-primary">Save Note</button>
        </div>
      </div>
    </div>
  );
}
