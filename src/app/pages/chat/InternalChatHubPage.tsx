import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Hash, Users, User, Send, Search,
  Phone, Mail, CheckCircle2, Plus, Sparkles, Briefcase,
  Bell, ChevronRight, Info, Clock, ArrowLeft, Shield, Paperclip, X,
  FileText, Download, Loader2
} from 'lucide-react';
import { useInternalChat, ChatRoomItem, ChatAttachment } from '../../context/InternalChatContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

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

export function InternalChatHubPage() {
  const { user } = useAuth();
  const {
    rooms,
    colleagues,
    activeRoomId,
    activeRoom,
    messages,
    loadingMessages,
    setActiveRoomId,
    sendMessage,
    uploadAttachment,
    openDirectChat,
    refreshRooms
  } = useInternalChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<ChatAttachment | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCandidateTagger, setShowCandidateTagger] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [searchCandidate, setSearchCandidate] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [showRightDrawer, setShowRightDrawer] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load available candidates when opening tagger
  useEffect(() => {
    if (showCandidateTagger && candidates.length === 0) {
      api.getCandidates({ limit: 50 })
        .then((res: any) => {
          const list = Array.isArray(res) ? res : (res?.candidates || []);
          setCandidates(list);
        })
        .catch(() => {});
    }
  }, [showCandidateTagger]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedCandidate && !attachedFile) || sending || uploadingFile) return;

    setSending(true);
    const candidateId = selectedCandidate?._id;
    const attachments = attachedFile ? [attachedFile] : undefined;
    const success = await sendMessage(inputText, candidateId, attachments);
    if (success) {
      setInputText('');
      setSelectedCandidate(null);
      setAttachedFile(null);
      setShowCandidateTagger(false);
    }
    setSending(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingFile(true);
      const att = await uploadAttachment(file);
      setAttachedFile(att);
    } catch (err: any) {
      alert(err.message || 'Failed to upload attachment');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Separate channels vs direct chats
  const channels = rooms.filter(r => r.type === 'channel');
  const directChats = rooms.filter(r => r.type === 'direct');

  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDMs = directChats.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCandidates = candidates.filter(c => {
    if (!searchCandidate.trim()) return true;
    const q = searchCandidate.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.walkInToken || '').toLowerCase().includes(q);
  });

  return (
    <div className="h-[calc(100vh-65px)] flex bg-white font-sans overflow-hidden">
      {/* ══════════════ LEFT PANE: Channel & Colleague Directory ══════════════ */}
      <aside className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Team Workspace
            </h2>
            <button
              onClick={() => refreshRooms()}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search channels or team..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Scrollable Room List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Company Channels */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Company Channels
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">{channels.length}</span>
            </div>

            <div className="space-y-1">
              {filteredChannels.map(channel => {
                const isActive = channel._id === activeRoomId;
                return (
                  <button
                    key={channel._id}
                    type="button"
                    onClick={() => setActiveRoomId(channel._id)}
                    className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200/70 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Hash className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-200' : 'text-slate-400'}`} />
                      <span className="text-xs truncate">{channel.name}</span>
                    </div>

                    {channel.unreadCount > 0 && (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white text-emerald-800' : 'bg-rose-500 text-white'
                      }`}>
                        {channel.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Messages (DMs) */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Direct Messages
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">{directChats.length}</span>
            </div>

            <div className="space-y-1">
              {filteredDMs.map(dm => {
                const isActive = dm._id === activeRoomId;
                return (
                  <button
                    key={dm._id}
                    type="button"
                    onClick={() => setActiveRoomId(dm._id)}
                    className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200/70 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs uppercase font-bold shrink-0 ${
                        isActive ? 'bg-emerald-700 text-white' : 'bg-slate-300 text-slate-800'
                      }`}>
                        {dm.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs truncate leading-tight">{dm.name}</p>
                        <p className={`text-[10px] truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {dm.lastMessage?.text || dm.description}
                        </p>
                      </div>
                    </div>

                    {dm.unreadCount > 0 && (
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white text-emerald-800' : 'bg-rose-500 text-white'
                      }`}>
                        {dm.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start New Chat (Colleagues List) */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-2 mb-2">
              Start Chat with Colleague
            </span>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {colleagues.map(col => (
                <button
                  key={col._id}
                  type="button"
                  onClick={() => openDirectChat(col._id)}
                  className="w-full px-2.5 py-1.5 rounded-lg text-left hover:bg-emerald-50/80 flex items-center justify-between transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] flex items-center justify-center font-bold shrink-0">
                      {col.name.charAt(0)}
                    </div>
                    <span className="text-xs text-slate-700 group-hover:text-emerald-800 truncate font-medium">
                      {col.name}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 group-hover:text-emerald-700">
                    {col.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ══════════════ CENTER PANE: Active Conversation Window ══════════════ */}
      <main className="flex-1 flex flex-col bg-white min-w-0">
        {/* Chat Room Top Navigation Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {activeRoom?.type === 'channel' ? <Hash className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-base text-slate-900 flex items-center gap-2 truncate">
                {activeRoom ? (activeRoom.type === 'channel' ? `#${activeRoom.name}` : activeRoom.name) : 'Select a conversation'}
                {activeRoom?.type === 'channel' && (
                  <span className="text-xs font-normal text-slate-500 hidden sm:inline">
                    • {activeRoom.description}
                  </span>
                )}
              </h2>
              {activeRoom?.type === 'direct' && activeRoom.targetUser && (
                <p className="text-xs text-slate-500">
                  <span className="font-semibold uppercase text-emerald-700">{activeRoom.targetUser.role}</span> • {activeRoom.targetUser.email}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tag Candidate Button */}
            <button
              type="button"
              onClick={() => setShowCandidateTagger(!showCandidateTagger)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                showCandidateTagger || selectedCandidate
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>{selectedCandidate ? `Tagged: ${selectedCandidate.name}` : 'Share Candidate'}</span>
            </button>

            {/* Info Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowRightDrawer(!showRightDrawer)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Toggle Room Details"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Candidate Tagger Floating Tray */}
        {showCandidateTagger && (
          <div className="bg-emerald-50/80 border-b border-emerald-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-bold text-emerald-900 shrink-0">Attach Candidate Card:</span>
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchCandidate}
                  onChange={e => setSearchCandidate(e.target.value)}
                  placeholder="Search candidate name, phone, token..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-lg outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {filteredCandidates.slice(0, 4).map(c => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => {
                    setSelectedCandidate(c);
                    setShowCandidateTagger(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition border cursor-pointer ${
                    selectedCandidate?._id === c._id
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-white text-slate-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  👤 {c.name} ({c.walkInToken || 'ATS'})
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCandidateTagger(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Message Thread Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/60">
          {loadingMessages && (
            <div className="text-center py-12 text-sm text-slate-400">
              Loading chat messages...
            </div>
          )}

          {!loadingMessages && messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-base text-slate-800">
                Welcome to {activeRoom ? (activeRoom.type === 'channel' ? `#${activeRoom.name}` : activeRoom.name) : 'the team channel'}!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                This is the start of your team discussion. Share candidate leads, updates, and collaborate in real-time.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div
                key={msg._id || idx}
                className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 mt-0.5">
                    {msg.senderName?.charAt(0) || 'U'}
                  </div>
                )}

                <div className={`max-w-xl flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs text-slate-800">{msg.senderName}</span>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {msg.senderRole}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >
                    {/* Embedded Candidate Card Tag */}
                    {msg.candidateTag && (
                      <div className={`mb-2.5 p-3 rounded-xl border text-xs ${
                        isMe
                          ? 'bg-emerald-700/80 border-emerald-500 text-emerald-50'
                          : 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                      }`}>
                        <div className="flex items-center justify-between font-bold pb-1 border-b border-current/20">
                          <span className="flex items-center gap-1.5">
                            👤 {msg.candidateTag.name}
                          </span>
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-black/10">
                            {msg.candidateTag.token}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] opacity-90">
                          <div><span className="opacity-75">Status:</span> <strong>{msg.candidateTag.status}</strong></div>
                          <div><span className="opacity-75">Experience:</span> <strong>{msg.candidateTag.experience}</strong></div>
                          <div><span className="opacity-75">Contact:</span> <strong>{msg.candidateTag.phone}</strong></div>
                          <div><span className="opacity-75">CTC:</span> <strong>{msg.candidateTag.ctc}</strong></div>
                        </div>
                      </div>
                    )}

                    {/* File Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-2 mb-2">
                        {msg.attachments.map((att, attIdx) => {
                          const isImg = isImageFile(att);
                          if (isImg) {
                            return (
                              <div key={attIdx} className="overflow-hidden rounded-xl border border-black/10">
                                <a href={att.url} target="_blank" rel="noreferrer" className="block group relative">
                                  <img
                                    src={att.url}
                                    alt={att.name}
                                    className="max-h-60 w-full object-cover rounded-lg group-hover:opacity-90 transition"
                                  />
                                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                                    Click to view full image ↗
                                  </div>
                                </a>
                                <div className={`px-3 py-1.5 text-xs flex items-center justify-between ${
                                  isMe ? 'bg-emerald-700/70 text-emerald-100' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  <span className="truncate max-w-[240px] font-medium">{att.name}</span>
                                  <span className="text-[11px] opacity-80">{formatFileSize(att.size)}</span>
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
                              className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                                isMe
                                  ? 'bg-emerald-700/60 border-emerald-500 text-white hover:bg-emerald-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                              }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isMe ? 'bg-emerald-800 text-white' : 'bg-white text-emerald-600 border border-slate-200 shadow-xs'
                              }`}>
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs font-bold truncate leading-snug">{att.name}</p>
                                <p className="text-[10px] opacity-75">{formatFileSize(att.size) || 'Attachment'}</p>
                              </div>
                              <Download className="w-4 h-4 opacity-80 shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {msg.text && <p className="break-words whitespace-pre-wrap">{msg.text}</p>}
                  </div>

                  {isMe && (
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* ─── Message Input Bar ─── */}
        <div className="p-4 border-t border-slate-200 bg-white">
          {selectedCandidate && (
            <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
              <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
                👤 Tagged Candidate: <strong>{selectedCandidate.name}</strong> ({selectedCandidate.walkInToken || 'ATS'})
              </span>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
              >
                ✕ Remove
              </button>
            </div>
          )}

          {uploadingFile && (
            <div className="mb-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Uploading attachment...</span>
            </div>
          )}

          {attachedFile && (
            <div className="mb-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="p-1 bg-emerald-100 text-emerald-700 rounded-lg">
                  <FileText className="w-4 h-4" />
                </span>
                <span className="text-emerald-900 font-semibold truncate max-w-sm">
                  {attachedFile.name}
                </span>
                <span className="text-emerald-600 text-[11px]">
                  ({formatFileSize(attachedFile.size)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                title="Remove attachment"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-end gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="p-3 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-50"
              title="Attach any file (PDF, Doc, Image, Excel, etc.)"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <textarea
              rows={2}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Write a message in ${activeRoom?.type === 'channel' ? '#' + activeRoom.name : activeRoom?.name || 'chat'} (Press Enter to send)...`}
              className="flex-1 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white resize-none transition"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && !selectedCandidate && !attachedFile) || sending || uploadingFile}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </main>

      {/* ══════════════ RIGHT PANE: Channel / Colleague Details ══════════════ */}
      {showRightDrawer && (
        <aside className="w-72 border-l border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto p-5">
          <div className="text-center pb-5 border-b border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-xs">
              {activeRoom?.type === 'channel' ? <Hash className="w-7 h-7" /> : <User className="w-7 h-7" />}
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              {activeRoom ? (activeRoom.type === 'channel' ? `#${activeRoom.name}` : activeRoom.name) : 'Chat Details'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeRoom?.description || 'Internal Workplace Channel'}
            </p>
          </div>

          {/* Guidelines */}
          <div className="py-4 border-b border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Workspace Guidelines
            </span>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                Real-time collaboration across all departments
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                Tag candidates to discuss interview feedback
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                Direct messaging for 1-on-1 coordination
              </li>
            </ul>
          </div>

          {/* Active Members */}
          <div className="py-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Team Members ({colleagues.length})
            </span>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {colleagues.map(m => (
                <div
                  key={m._id}
                  onClick={() => openDirectChat(m._id)}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center font-bold shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{m.name}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{m.role}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    Chat
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default InternalChatHubPage;
