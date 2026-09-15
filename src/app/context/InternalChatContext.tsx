import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

export interface ChatRoomItem {
  _id: string;
  name: string;
  type: 'channel' | 'direct';
  icon?: string;
  description?: string;
  lastMessage?: {
    text: string;
    senderName: string;
    timestamp: string;
  };
  unreadCount: number;
  targetUser?: {
    _id: string;
    name: string;
    email: string;
    role: string;
    employeeId?: string;
  };
  participantsCount?: number;
  updatedAt?: string;
}

export interface ChatAttachment {
  name: string;
  url: string;
  fileType?: string;
  size?: number;
}

export interface ChatMessageItem {
  _id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  senderAvatar?: string;
  text: string;
  attachments?: ChatAttachment[];
  candidateTag?: {
    candidateId: string;
    name: string;
    phone: string;
    token: string;
    designation: string;
    status: string;
    experience: string;
    ctc: string;
  };
  createdAt: string;
}

export interface ColleagueItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
  isOnline?: boolean;
}

interface InternalChatContextType {
  rooms: ChatRoomItem[];
  colleagues: ColleagueItem[];
  activeRoomId: string | null;
  activeRoom: ChatRoomItem | null;
  messages: ChatMessageItem[];
  loadingMessages: boolean;
  totalUnreadCount: number;
  isWidgetOpen: boolean;
  setIsWidgetOpen: (open: boolean) => void;
  setActiveRoomId: (id: string | null) => void;
  sendMessage: (text: string, candidateId?: string, attachments?: ChatAttachment[]) => Promise<boolean>;
  uploadAttachment: (file: File) => Promise<ChatAttachment>;
  openDirectChat: (targetUserId: string) => Promise<void>;
  markActiveRoomRead: () => Promise<void>;
  refreshRooms: () => Promise<void>;
}

const InternalChatContext = createContext<InternalChatContextType | undefined>(undefined);

export function InternalChatProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [colleagues, setColleagues] = useState<ColleagueItem[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);

  const activeRoom = rooms.find(r => r._id === activeRoomId) || null;
  const pollTimerRef = useRef<any>(null);
  const prevMsgCountRef = useRef<number>(0);

  // ── Load Rooms, Directory, and Unread Count ───────────────────
  const refreshRooms = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [roomsData, colleaguesData, unreadData] = await Promise.all([
        api.getChatRooms().catch(() => []),
        api.getChatColleagues().catch(() => []),
        api.getChatUnreadTotal().catch(() => ({ unreadTotal: 0 }))
      ]);

      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setColleagues(Array.isArray(colleaguesData) ? colleaguesData : []);
      setTotalUnreadCount(unreadData.unreadTotal || 0);

      // Default to general channel if none selected
      if (!activeRoomId && Array.isArray(roomsData) && roomsData.length > 0) {
        const general = roomsData.find(r => r.name === 'general') || roomsData[0];
        setActiveRoomId(general._id);
      }
    } catch (err) {
      console.error('Failed to load chat data:', err);
    }
  }, [isAuthenticated, activeRoomId]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      refreshRooms();
    } else {
      setRooms([]);
      setColleagues([]);
      setActiveRoomId(null);
      setMessages([]);
      setTotalUnreadCount(0);
    }
  }, [isAuthenticated]);

  // ── Load Messages for Active Room ─────────────────────────────
  const loadMessages = useCallback(async (roomId: string, silent = false) => {
    if (!roomId) return;
    if (!silent) setLoadingMessages(true);
    try {
      const msgList = await api.getChatMessages(roomId);
      const safeList = Array.isArray(msgList) ? msgList : [];
      
      // Play subtle chime on new incoming message if window was already open
      if (prevMsgCountRef.current > 0 && safeList.length > prevMsgCountRef.current) {
        const lastMsg = safeList[safeList.length - 1];
        if (lastMsg && lastMsg.senderId !== user?.id) {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {}
        }
      }
      prevMsgCountRef.current = safeList.length;
      setMessages(safeList);

      // Decrement unread count locally for this room
      setRooms(prev => prev.map(r => r._id === roomId ? { ...r, unreadCount: 0 } : r));
      setTotalUnreadCount(prev => Math.max(0, prev - (activeRoom?.unreadCount || 0)));
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [user?.id, activeRoom?.unreadCount]);

  useEffect(() => {
    if (activeRoomId) {
      prevMsgCountRef.current = 0;
      loadMessages(activeRoomId);
    } else {
      setMessages([]);
    }
  }, [activeRoomId]);

  // ── Real-Time Polling Engine (Every 3.5s) ──────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    pollTimerRef.current = setInterval(() => {
      // 1. Refresh active room messages silently
      if (activeRoomId) {
        loadMessages(activeRoomId, true);
      }
      // 2. Poll global unread and rooms snippet
      api.getChatRooms()
        .then(rList => {
          if (Array.isArray(rList)) {
            setRooms(rList);
            const total = rList.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
            setTotalUnreadCount(total);
          }
        })
        .catch(() => {});
    }, 3500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isAuthenticated, activeRoomId, loadMessages]);

  // ── Upload File Attachment ───────────────────────────────────
  const uploadAttachment = async (file: File): Promise<ChatAttachment> => {
    return api.uploadChatAttachment(file);
  };

  // ── Send Message ──────────────────────────────────────────────
  const sendMessage = async (
    text: string,
    candidateId?: string,
    attachments?: ChatAttachment[]
  ): Promise<boolean> => {
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if (!activeRoomId || (!text.trim() && !candidateId && !hasAttachments)) return false;

    try {
      const newMsg = await api.sendChatMessage(activeRoomId, {
        text: text.trim(),
        candidateId,
        attachments: attachments || []
      });

      // Optimistic append
      setMessages(prev => [...prev, newMsg]);
      prevMsgCountRef.current += 1;

      // Update room snippet
      const snippet = text.trim() || (hasAttachments ? `📎 ${attachments![0].name}` : 'Shared a candidate');
      setRooms(prev => prev.map(r => {
        if (r._id === activeRoomId) {
          return {
            ...r,
            lastMessage: {
              text: snippet,
              senderName: user?.name || 'You',
              timestamp: new Date().toISOString()
            }
          };
        }
        return r;
      }));

      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      return false;
    }
  };

  // ── Open Direct Chat with any Colleague ───────────────────────
  const openDirectChat = async (targetUserId: string) => {
    try {
      const room = await api.getOrCreateDirectChat(targetUserId);
      if (room && room._id) {
        // Ensure room is in list
        setRooms(prev => {
          const exists = prev.find(r => r._id === room._id);
          if (exists) return prev;
          return [room, ...prev];
        });
        setActiveRoomId(room._id);
        setIsWidgetOpen(true);
      }
    } catch (err) {
      console.error('Failed to open direct chat:', err);
    }
  };

  // ── Mark Active Room Read ─────────────────────────────────────
  const markActiveRoomRead = async () => {
    if (!activeRoomId) return;
    try {
      await api.markChatRoomRead(activeRoomId);
      setRooms(prev => prev.map(r => r._id === activeRoomId ? { ...r, unreadCount: 0 } : r));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  return (
    <InternalChatContext.Provider
      value={{
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
        openDirectChat,
        markActiveRoomRead,
        refreshRooms
      }}
    >
      {children}
    </InternalChatContext.Provider>
  );
}

export function useInternalChat() {
  const context = useContext(InternalChatContext);
  if (!context) {
    throw new Error('useInternalChat must be used within an InternalChatProvider');
  }
  return context;
}
