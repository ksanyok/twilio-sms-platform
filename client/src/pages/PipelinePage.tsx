import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
} from '@dnd-kit/core';
import api from '../services/api';
import {
  Plus,
  GripVertical,
  Phone,
  User,
  Tag,
  MoreVertical,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

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
    tags: { tag: { id: string; name: string; color: string } }[];
  };
  notes: string | null;
}

export default function PipelinePage() {
  const [activeCard, setActiveCard] = useState<PipelineCard | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const { data } = await api.get('/pipeline');
      return data;
    },
  });

  const moveCardMutation = useMutation({
    mutationFn: ({ cardId, stageId, position }: { cardId: string; stageId: string; position: number }) =>
      api.put(`/pipeline/cards/${cardId}/move`, { stageId, position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to move card'),
  });

  const stages: PipelineStage[] = data?.stages || [];

  function handleDragStart(event: DragStartEvent) {
    const card = findCard(event.active.id as string);
    setActiveCard(card || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id as string;
    const overStageId = (over.data?.current as any)?.stageId || (over.id as string);

    // Find the target stage
    const targetStage = stages.find((s) => s.id === overStageId);
    if (!targetStage) return;

    moveCardMutation.mutate({
      cardId,
      stageId: targetStage.id,
      position: targetStage.cards.length,
    });
  }

  function findCard(cardId: string): PipelineCard | undefined {
    for (const stage of stages) {
      const card = stage.cards.find((c) => c.id === cardId);
      if (card) return card;
    }
    return undefined;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-dark-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark-50">Pipeline</h1>
            <p className="text-sm text-dark-400 mt-1">Drag leads between stages to track progress</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-dark-500">
              {stages.reduce((sum, s) => sum + s.cards.length, 0)} leads total
            </span>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="flex gap-4 h-full">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-[300px] shrink-0 bg-dark-800/50 rounded-xl animate-pulse h-[400px]" />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full min-h-[500px]">
              {stages.map((stage) => (
                <StageColumn key={stage.id} stage={stage} />
              ))}
            </div>

            <DragOverlay>
              {activeCard && <CardOverlay card={activeCard} />}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function StageColumn({ stage }: { stage: PipelineStage }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stageId: stage.id },
  });

  return (
    <div className="w-[300px] shrink-0 flex flex-col">
      {/* Stage Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold text-dark-200">{stage.name}</h3>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-dark-800 text-dark-400">
            {stage.cards.length}
          </span>
        </div>
        <button className="btn-ghost p-1">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 rounded-xl p-2 space-y-2 transition-colors overflow-y-auto',
          isOver ? 'bg-scl-600/10 ring-1 ring-scl-600/30' : 'bg-dark-800/30'
        )}
      >
        {stage.cards.map((card) => (
          <DraggableCard key={card.id} card={card} stageColor={stage.color} />
        ))}
        {stage.cards.length === 0 && (
          <div className="text-center py-8 text-dark-600 text-xs">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ card, stageColor }: { card: PipelineCard; stageColor: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'bg-dark-850 rounded-lg p-3 border border-dark-700/50 hover:border-dark-600 transition-all cursor-grab active:cursor-grabbing group',
        isDragging && 'opacity-30'
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center text-[10px] font-semibold text-dark-300">
            {card.lead.firstName[0]}{card.lead.lastName?.[0] || ''}
          </div>
          <div>
            <p className="text-sm font-medium text-dark-200 leading-tight">
              {card.lead.firstName} {card.lead.lastName || ''}
            </p>
            <p className="text-[11px] text-dark-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />
              {card.lead.phone}
            </p>
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-dark-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

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

function CardOverlay({ card }: { card: PipelineCard }) {
  return (
    <div className="bg-dark-850 rounded-lg p-3 border border-scl-500/50 shadow-xl shadow-scl-500/10 w-[280px]">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center text-[10px] font-semibold text-dark-300">
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
