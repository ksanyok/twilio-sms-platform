import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Conversation, Message } from '../types';
import {
  Search,
  Send,
  User,
  Clock,
  CheckCheck,
  AlertTriangle,
  MessageSquare,
  ChevronDown,
  Phone,
  Tag,
  MoreVertical,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data: conversationsData, isLoading } = useQuery({
    queryKey: ['conversations', search, showUnreadOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (showUnreadOnly) params.set('unreadOnly', 'true');
      const { data } = await api.get(`/inbox?${params}`);
      return data;
    },
    refetchInterval: 10000, // Poll every 10s
  });

  const conversations: Conversation[] = conversationsData?.conversations || [];

  return (
    <div className="flex h-full min-h-0">
      {/* Conversation List */}
      <div className="w-[380px] flex flex-col border-r border-dark-700/50 bg-dark-900/50">
        {/* Search Header */}
        <div className="p-4 border-b border-dark-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-dark-50">Inbox</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={clsx(
                  'badge cursor-pointer',
                  showUnreadOnly ? 'bg-scl-600/30 text-scl-300' : 'bg-dark-700 text-dark-400'
                )}
              >
                Unread
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="input pl-10 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3 p-3">
                  <div className="w-10 h-10 bg-dark-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-dark-700 rounded w-2/3" />
                    <div className="h-3 bg-dark-700 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {conversations.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 mx-auto text-dark-600 mb-3" />
              <p className="text-sm text-dark-500">No conversations</p>
            </div>
          )}
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isSelected={selectedId === conv.id}
              onClick={() => setSelectedId(conv.id)}
            />
          ))}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col bg-dark-950">
        {selectedId ? (
          <MessageThread conversationId={selectedId} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-14 h-14 mx-auto text-dark-700 mb-4" />
              <p className="text-dark-400 font-medium">Select a conversation</p>
              <p className="text-sm text-dark-600 mt-1">Choose a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const lead = conversation.lead;
  const lastMessage = conversation.messages?.[0];

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-dark-800/50 transition-colors border-b border-dark-800/30',
        isSelected && 'bg-dark-800/70 border-l-2 border-l-scl-500'
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-scl-600/20 flex items-center justify-center text-scl-400 text-sm font-semibold">
          {lead?.firstName?.[0]}{lead?.lastName?.[0] || ''}
        </div>
        {conversation.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-scl-500 text-white text-[10px] font-bold flex items-center justify-center">
            {conversation.unreadCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={clsx(
            'text-sm truncate',
            conversation.unreadCount > 0 ? 'font-semibold text-dark-100' : 'font-medium text-dark-300'
          )}>
            {lead?.firstName} {lead?.lastName || ''}
          </p>
          <span className="text-[10px] text-dark-500 shrink-0 ml-2">
            {conversation.lastMessageAt
              ? formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })
              : ''}
          </span>
        </div>
        <p className="text-xs text-dark-500 truncate mt-0.5">
          {lastMessage
            ? `${lastMessage.direction === 'OUTBOUND' ? 'You: ' : ''}${lastMessage.body}`
            : lead?.phone}
        </p>
        {/* Tags */}
        {lead?.tags && lead.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {lead.tags.slice(0, 2).map((lt) => (
              <span
                key={lt.tag.id}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: lt.tag.color + '33', color: lt.tag.color }}
              >
                {lt.tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

function MessageThread({ conversationId }: { conversationId: string }) {
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const { data } = await api.get(`/inbox/${conversationId}`);
      return data;
    },
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => api.post(`/inbox/${conversationId}/reply`, { body }),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to send'),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    sendMutation.mutate(replyText.trim());
  };

  const conversation = data?.conversation;
  const messages: Message[] = data?.messages || [];

  return (
    <>
      {/* Thread Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-dark-700/50 bg-dark-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-scl-600/20 flex items-center justify-center text-scl-400 text-sm font-semibold">
            {conversation?.lead?.firstName?.[0]}{conversation?.lead?.lastName?.[0] || ''}
          </div>
          <div>
            <p className="text-sm font-semibold text-dark-100">
              {conversation?.lead?.firstName} {conversation?.lead?.lastName || ''}
            </p>
            <p className="text-xs text-dark-500 flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              {conversation?.lead?.phone}
              {conversation?.lead?.status && (
                <span className="ml-2 badge-info text-[10px]">{conversation.lead.status}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost p-2">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-scl-500 border-t-transparent rounded-full" />
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      <div className="border-t border-dark-700/50 bg-dark-900/30 p-4">
        {conversation?.lead?.optedOut ? (
          <div className="flex items-center justify-center gap-2 text-sm text-red-400 py-2">
            <AlertTriangle className="w-4 h-4" />
            This lead has opted out. Cannot send messages.
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-end gap-3">
            <textarea
              className="input flex-1 min-h-[44px] max-h-[120px] resize-none py-2.5"
              placeholder="Type your message..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              rows={1}
            />
            <button
              type="submit"
              disabled={!replyText.trim() || sendMutation.isPending}
              className="btn-primary px-4 py-2.5"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'OUTBOUND';

  return (
    <div className={clsx('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[70%] rounded-2xl px-4 py-2.5',
          isOutbound
            ? 'bg-scl-600 text-white rounded-br-md'
            : 'bg-dark-800 text-dark-200 rounded-bl-md'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <div
          className={clsx(
            'flex items-center gap-1.5 mt-1',
            isOutbound ? 'justify-end' : 'justify-start'
          )}
        >
          <span className={clsx(
            'text-[10px]',
            isOutbound ? 'text-scl-200/70' : 'text-dark-500'
          )}>
            {message.sentAt
              ? format(new Date(message.sentAt), 'h:mm a')
              : format(new Date(message.createdAt), 'h:mm a')}
          </span>
          {isOutbound && <MessageStatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function MessageStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'DELIVERED':
      return <CheckCheck className="w-3.5 h-3.5 text-scl-200" />;
    case 'SENT':
      return <CheckCheck className="w-3.5 h-3.5 text-scl-200/50" />;
    case 'FAILED':
    case 'UNDELIVERED':
    case 'BLOCKED':
      return <AlertTriangle className="w-3.5 h-3.5 text-red-300" />;
    case 'QUEUED':
    case 'SENDING':
      return <Clock className="w-3.5 h-3.5 text-scl-200/50" />;
    default:
      return null;
  }
}
