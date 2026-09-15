import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  MessageSquare, X, Send, Hash, Users, Maximize2,
  ChevronDown, Search, Paperclip, CheckCircle2, User,
  Circle, Shield, Briefcase, Bell, Phone, Sparkles,
  FileText, Download, Loader2, GripVertical
} from 'lucide-react';
import { useInternalChat, ChatAttachment } from '../../context/InternalChatContext';
import { useAuth } from '../../context/AuthContext';
import { useDraggableFloating } from '../../utils/useDraggableFloating';

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(att: { url: string; fileType?: string; name?: string }) {
  if (att.fileType?.startsWith('image/')) return true;
  const lower = (att.name || att.url || '').toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.gif');
}

export function FloatingChatWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    rooms,
    colleagues,
    activeRoomId,
    activeRoom,
    messages,
    loadingMessages,
    totalUnreadCount,
    isWidgetOpen,
    setIsWidgetOpen,
    setActiveRoomId,
    sendMessage,
    uploadAttachment,
    openDirectChat
  } = useInternalChat();

  const [activeTab, setActiveTab] = useState<'chat' | 'directory'>('chat');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<ChatAttachment | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchColleague, setSearchColleague] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  const { pos, isDragging, isDraggingRef, startDrag, clampToBounds } = useDraggableFloating({
    storageKey: 'ats_team_chat_pos',
    defaultRight: 24,
    defaultBottom: 24,
  });

  // Clamp within viewport if opened
  useEffect(() => {
    if (isWidgetOpen) {
      clampToBounds(410, 540);
    }
  }, [isWidgetOpen, clampToBounds]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isWidgetOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isWidgetOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachedFile) || sending || uploadingFile) return;

    setSending(true);
    const attachments = attachedFile ? [attachedFile] : undefined;
    const success = await sendMessage(inputText, undefined, attachments);
    if (success) {
      setInputText('');
      setAttachedFile(null);
    }
    setSending(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File too large. Maximum size is 25MB.');
      return;
    }

    setUploadingFile(true);
    try {
      const att = await uploadAttachment(file);
      setAttachedFile(att);
    } catch (err: any) {
      alert(err.message || 'Failed to upload attachment');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter channels vs direct chats
  const channels = rooms.filter(r => r.type === 'channel');
  const directChats = rooms.filter(r => r.type === 'direct');

  const filteredColleagues = colleagues.filter(c => {
    if (!searchColleague.trim()) return true;
    const q = searchColleague.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div
      ref={widgetContainerRef}
      style={{
        bottom: `${pos.bottom}px`,
        right: `${pos.right}px`,
      }}
      className={`fixed z-50 font-sans ${isDragging ? 'opacity-90' : ''}`}
    >
      {/* ─── Floating Launcher Button ────────────────────────────── */}
      {!isWidgetOpen && (
        <button
          type="button"
          onPointerDown={(e) => startDrag(e, widgetContainerRef)}
          onClick={(e) => {
            if (isDraggingRef.current) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            setIsWidgetOpen(true);
          }}
          className="drag-launcher-btn group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 cursor-grab active:cursor-grabbing border border-emerald-500/30 touch-none select-none"
          title="Drag to reposition anywhere, click to open Team Chat"
        >
          <GripVertical className="w-3.5 h-3.5 text-emerald-200/60 group-hover:text-emerald-100 transition-colors shrink-0 -ml-1 cursor-grab" />
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-white" />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-bold tracking-wide">Team Chat</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
        </button>
      )}

      {/* ─── Floating Quick-Chat Window ─────────────────────────── */}
      {isWidgetOpen && (
        <div className="w-[380px] sm:w-[410px] h-[540px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header Bar - Draggable */}
          <div
            onPointerDown={(e) => startDrag(e, widgetContainerRef)}
            className="bg-slate-900 text-white px-3.5 py-3 flex items-center justify-between shadow-xs cursor-grab active:cursor-grabbing select-none touch-none border-b border-slate-800"
            title="Drag header to move chat window"
          >
            <div className="flex items-center gap-2 min-w-0 pointer-events-none">
              <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {activeRoom?.type === 'channel' ? (
                  <Hash className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                  {activeRoom ? activeRoom.name : 'Team Chat'}
                  {activeRoom?.type === 'channel' && (
                    <span className="text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.2 rounded font-normal">
                      Channel
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 truncate">
                  {activeRoom?.description || 'Active Workplace Discussion'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Expand to Full Page Button */}
              <button
                type="button"
                onClick={() => {
                  setIsWidgetOpen(false);
                  navigate('/chat');
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Expand to Full Screen Hub"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Minimize */}
              <button
                type="button"
                onClick={() => setIsWidgetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Minimize"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Sub-Navigation Tabs */}
          <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-2.5 py-1 rounded-md transition ${
                  activeTab === 'chat'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chat Thread
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('directory')}
                className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                  activeTab === 'directory'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3 h-3" />
                Team ({colleagues.length})
              </button>
            </div>

            {/* Channel / DM Quick Dropdown */}
            {activeTab === 'chat' && (
              <select
                value={activeRoomId || ''}
                onChange={e => setActiveRoomId(e.target.value)}
                className="text-[11px] font-medium bg-white border border-slate-200 rounded px-2 py-0.5 outline-none text-slate-700 max-w-[140px] truncate"
              >
                <optgroup label="Company Channels">
                  {channels.map(c => (
                    <option key={c._id} value={c._id}>
                      #{c.name} {c.unreadCount > 0 ? `(${c.unreadCount})` : ''}
                    </option>
                  ))}
                </optgroup>
                {directChats.length > 0 && (
                  <optgroup label="Direct Messages">
                    {directChats.map(d => (
                      <option key={d._id} value={d._id}>
                        {d.name} {d.unreadCount > 0 ? `(${d.unreadCount})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          {/* ─── Body Area: Chat Feed or Team Directory ─────────────── */}
          {activeTab === 'directory' ? (
            /* Colleague Directory View */
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchColleague}
                  onChange={e => setSearchColleague(e.target.value)}
                  placeholder="Search team members..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                {filteredColleagues.map(c => (
                  <div
                    key={c._id}
                    onClick={() => {
                      openDirectChat(c._id);
                      setActiveTab('chat');
                    }}
                    className="p-2 rounded-xl hover:bg-emerald-50/60 border border-transparent hover:border-emerald-200 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{c.role} • {c.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded-full">
                      Chat
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Chat Message Feed View */
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
              {loadingMessages && (
                <div className="text-center py-8 text-xs text-slate-400">
                  Loading discussion...
                </div>
              )}

              {!loadingMessages && messages.length === 0 && (
                <div className="text-center py-10 px-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-600">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No messages yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Start the conversation! Say hello to your team.
                  </p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={msg._id || idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-700">{msg.senderName}</span>
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-200 text-slate-600 font-semibold">
                          {msg.senderRole}
                        </span>
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs leading-relaxed ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                      }`}
                    >
                      {/* Candidate Card Tag */}
                      {msg.candidateTag && (
                        <div className={`mb-2 p-2 rounded-lg border text-[11px] ${
                          isMe ? 'bg-emerald-700/60 border-emerald-500 text-emerald-50' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}>
                          <div className="flex items-center justify-between font-bold">
                            <span>👤 {msg.candidateTag.name}</span>
                            <span className="font-mono text-[10px]">{msg.candidateTag.token}</span>
                          </div>
                          <div className="mt-1 text-[10px] opacity-90">
                            <span>Status: {msg.candidateTag.status}</span> • <span>Exp: {msg.candidateTag.experience}</span>
                          </div>
                        </div>
                      )}

                      {/* File Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-1.5 mb-1.5">
                          {msg.attachments.map((att, attIdx) => {
                            const isImg = isImageFile(att);
                            if (isImg) {
                              return (
                                <div key={attIdx} className="overflow-hidden rounded-xl border border-black/10">
                                  <a href={att.url} target="_blank" rel="noreferrer" className="block group relative">
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="max-h-44 w-full object-cover rounded-lg group-hover:opacity-90 transition"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition">
                                      View full image ↗
                                    </div>
                                  </a>
                                  <div className={`px-2 py-1 text-[10px] flex items-center justify-between ${
                                    isMe ? 'bg-emerald-700/70 text-emerald-100' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    <span className="truncate max-w-[170px]">{att.name}</span>
                                    <span>{formatFileSize(att.size)}</span>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <a
                                key={attIdx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                download={att.name}
                                className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                                  isMe
                                    ? 'bg-emerald-700/60 border-emerald-500 text-white hover:bg-emerald-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                                }`}
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isMe ? 'bg-emerald-800 text-white' : 'bg-white text-emerald-600 border border-slate-200'
                                }`}>
                                  <FileText className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-[11px] font-bold truncate leading-tight">{att.name}</p>
                                  <p className="text-[9px] opacity-75">{formatFileSize(att.size) || 'Attachment'}</p>
                                </div>
                                <Download className="w-3.5 h-3.5 opacity-80 shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {msg.text && <p className="break-words">{msg.text}</p>}
                    </div>

                    <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* ─── Bottom Message Input ─────────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="bg-white border-t border-slate-200">
              {uploadingFile && (
                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-[11px] flex items-center gap-2 border-b border-emerald-100">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Uploading file attachment...</span>
                </div>
              )}

              {attachedFile && (
                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-[11px] flex items-center justify-between border-b border-emerald-100">
                  <span className="flex items-center gap-1.5 truncate max-w-[280px]">
                    📎 <strong className="truncate">{attachedFile.name}</strong> ({formatFileSize(attachedFile.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="p-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50"
                  title="Attach any document, image, or file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={`Message ${activeRoom?.type === 'channel' ? '#' + activeRoom.name : activeRoom?.name || 'team'}...`}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachedFile) || sending || uploadingFile}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition shadow-xs cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
