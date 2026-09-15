const { ChatRoom, ChatMessage } = require('../models/InternalChat');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const path = require('path');
const fs = require('fs');

// Global SSE clients map for real-time push: userId -> array of response objects
const sseClients = new Map();

// Helper to push real-time events to connected users
const broadcastToUsers = (userIds, event, payload) => {
  const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  userIds.forEach(uid => {
    const idStr = uid.toString();
    if (sseClients.has(idStr)) {
      const clientList = sseClients.get(idStr);
      clientList.forEach(res => {
        try {
          res.write(dataString);
        } catch {
          // Client disconnected
        }
      });
    }
  });
};

// ─── Ensure Default Channels Exist ───────────────────────────
exports.seedDefaultChannels = async () => {
  try {
    const defaultChannels = [
      {
        name: 'general',
        type: 'channel',
        description: 'Company-wide discussion for all White Horse Manpower team members',
        icon: 'Hash',
        isDefault: true
      },
      {
        name: 'recruitment-team',
        type: 'channel',
        description: 'Daily interview coordination, walk-in updates, and candidate statuses',
        icon: 'Users',
        isDefault: true
      },
      {
        name: 'urgent-requirements',
        type: 'channel',
        description: 'High-priority job openings, urgent client requests, and hot leads',
        icon: 'Briefcase',
        isDefault: true
      },
      {
        name: 'announcements',
        type: 'channel',
        description: 'Official company announcements, policy updates, and holiday circulars',
        icon: 'Bell',
        isDefault: true
      }
    ];

    for (const ch of defaultChannels) {
      const exists = await ChatRoom.findOne({ name: ch.name, type: 'channel' });
      if (!exists) {
        await ChatRoom.create({
          ...ch,
          lastMessage: {
            text: `Welcome to the #${ch.name} channel!`,
            senderName: 'System',
            timestamp: new Date()
          }
        });
      }
    }
  } catch (err) {
    console.error('Error seeding default chat channels:', err);
  }
};

// ─── GET /api/internal-chat/rooms ─────────────────────────────
exports.getRooms = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Channels are open to all active staff; Direct messages require user to be a participant
    const rooms = await ChatRoom.find({
      $or: [
        { type: 'channel', isArchived: false },
        { type: 'direct', 'participants.user': userId, isArchived: false }
      ]
    })
      .populate('participants.user', 'name email role employeeId')
      .sort('-lastMessage.timestamp -updatedAt');

    // Format rooms with computed unread counts and display labels
    const formatted = rooms.map(room => {
      const pData = room.participants.find(p => p.user && p.user._id.toString() === userId.toString());
      const unread = pData ? (pData.unreadCount || 0) : 0;

      let displayName = room.name;
      let displaySubtitle = room.description || '';
      let targetUser = null;

      if (room.type === 'direct') {
        const otherParticipant = room.participants.find(p => p.user && p.user._id.toString() !== userId.toString());
        if (otherParticipant && otherParticipant.user) {
          displayName = otherParticipant.user.name;
          displaySubtitle = `${otherParticipant.user.role?.toUpperCase()} • ${otherParticipant.user.email}`;
          targetUser = otherParticipant.user;
        } else {
          displayName = 'Colleague';
        }
      }

      return {
        _id: room._id,
        name: displayName,
        type: room.type,
        icon: room.icon,
        description: displaySubtitle,
        lastMessage: room.lastMessage,
        unreadCount: unread,
        targetUser,
        participantsCount: room.participants.length,
        updatedAt: room.updatedAt
      };
    });

    res.json(formatted);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/internal-chat/rooms/direct ──────────────────────
exports.getOrCreateDirectRoom = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: 'Cannot create a direct chat with yourself' });
    }

    const targetUser = await User.findById(targetUserId).select('name email role employeeId');
    if (!targetUser) {
      return res.status(404).json({ message: 'Target employee not found' });
    }

    // Generate unique sorted key
    const directKey = [currentUserId.toString(), targetUserId.toString()].sort().join('_');

    let room = await ChatRoom.findOne({ directKey })
      .populate('participants.user', 'name email role employeeId');

    if (!room) {
      room = await ChatRoom.create({
        type: 'direct',
        directKey,
        name: targetUser.name,
        participants: [
          { user: currentUserId, lastReadAt: new Date(), unreadCount: 0 },
          { user: targetUserId, lastReadAt: new Date(), unreadCount: 0 }
        ],
        createdBy: currentUserId,
        lastMessage: {
          text: 'Conversation started',
          senderName: 'System',
          timestamp: new Date()
        }
      });

      room = await ChatRoom.findById(room._id).populate('participants.user', 'name email role employeeId');
    }

    res.json({
      _id: room._id,
      name: targetUser.name,
      type: 'direct',
      targetUser,
      lastMessage: room.lastMessage,
      unreadCount: 0
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/internal-chat/rooms/:roomId/messages ────────────
exports.getMessages = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '100'), 200);

    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(limit);

    // Auto-mark read for the current user
    await ChatRoom.updateOne(
      { _id: roomId, 'participants.user': req.user.id },
      {
        $set: {
          'participants.$.unreadCount': 0,
          'participants.$.lastReadAt': new Date()
        }
      }
    );

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/internal-chat/rooms/:roomId/messages ───────────
exports.sendMessage = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { text, attachments, candidateId } = req.body;
    const sender = req.user;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    // Optional candidate card tag
    let candidateTag = null;
    if (candidateId) {
      const cand = await Candidate.findById(candidateId).select('name phone walkInToken experience status currentCTC expectedCTC');
      if (cand) {
        candidateTag = {
          candidateId: cand._id,
          name: cand.name,
          phone: cand.phone,
          token: cand.walkInToken || '—',
          status: cand.status || 'New',
          experience: cand.experience || 'N/A',
          ctc: cand.expectedCTC || cand.currentCTC || 'N/A'
        };
      }
    }

    const message = await ChatMessage.create({
      roomId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      text: (text || '').trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      candidateTag,
      readBy: [{ user: sender.id, readAt: new Date() }]
    });

    // Update room lastMessage snippet
    const snippet = (text || '').trim() || (attachments?.length ? `📎 Attachment (${attachments[0].name})` : 'Shared a candidate');
    room.lastMessage = {
      text: snippet,
      senderId: sender.id,
      senderName: sender.name,
      timestamp: new Date()
    };

    // If channel, ensure sender is in participants list
    const hasSender = room.participants.some(p => p.user && p.user.toString() === sender.id.toString());
    if (!hasSender) {
      room.participants.push({ user: sender.id, lastReadAt: new Date(), unreadCount: 0 });
    }

    // Increment unread count for other participants
    room.participants.forEach(p => {
      if (p.user && p.user.toString() !== sender.id.toString()) {
        p.unreadCount = (p.unreadCount || 0) + 1;
      } else if (p.user) {
        p.unreadCount = 0;
        p.lastReadAt = new Date();
      }
    });

    await room.save();

    // Broadcast real-time update to all room participants or global stream
    const targetUserIds = room.type === 'direct'
      ? room.participants.map(p => p.user)
      : Array.from(sseClients.keys());

    broadcastToUsers(targetUserIds, 'new_message', {
      roomId,
      message,
      roomUpdate: {
        roomId,
        lastMessage: room.lastMessage
      }
    });

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/internal-chat/rooms/:roomId/read ───────────────
exports.markRoomAsRead = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    await ChatRoom.updateOne(
      { _id: roomId, 'participants.user': userId },
      {
        $set: {
          'participants.$.unreadCount': 0,
          'participants.$.lastReadAt': new Date()
        }
      }
    );

    res.json({ success: true, roomId });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/internal-chat/colleagues ─────────────────────────
exports.getColleagues = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const colleagues = await User.find({
      _id: { $ne: currentUserId },
      status: { $ne: 'Suspended' }
    })
      .select('name email role employeeId status')
      .sort('name');

    // Add real-time online indicator if connected to SSE
    const enriched = colleagues.map(c => ({
      _id: c._id,
      name: c.name,
      email: c.email,
      role: c.role,
      employeeId: c.employeeId || '',
      isOnline: sseClients.has(c._id.toString())
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/internal-chat/unread-total ──────────────────────
exports.getUnreadTotal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const rooms = await ChatRoom.find({ 'participants.user': userId });

    let total = 0;
    rooms.forEach(r => {
      const p = r.participants.find(part => part.user && part.user.toString() === userId.toString());
      if (p && p.unreadCount) {
        total += p.unreadCount;
      }
    });

    res.json({ unreadTotal: total });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/internal-chat/stream (Real-Time SSE) ────────────
exports.chatStream = (req, res) => {
  const userId = req.user.id.toString();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent NGINX from buffering SSE stream
  });

  res.write(`event: connected\ndata: {"status":"connected","userId":"${userId}"}\n\n`);

  if (!sseClients.has(userId)) {
    sseClients.set(userId, []);
  }
  sseClients.get(userId).push(res);

  // Broadcast online presence to everyone
  broadcastToUsers(Array.from(sseClients.keys()), 'user_online', { userId, isOnline: true });

  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    if (sseClients.has(userId)) {
      const list = sseClients.get(userId).filter(c => c !== res);
      if (list.length > 0) {
        sseClients.set(userId, list);
      } else {
        sseClients.delete(userId);
        broadcastToUsers(Array.from(sseClients.keys()), 'user_offline', { userId, isOnline: false });
      }
    }
  });
};

// ─── POST /api/internal-chat/upload ───────────────────────────
exports.uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file was uploaded' });
    }

    const fileUrl = `/uploads/chat/${req.file.filename}`;
    const fileType = req.file.mimetype || 'application/octet-stream';

    res.status(201).json({
      name: req.file.originalname,
      url: fileUrl,
      fileType: fileType,
      size: req.file.size
    });
  } catch (err) {
    next(err);
  }
};

