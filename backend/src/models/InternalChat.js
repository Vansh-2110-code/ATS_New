const mongoose = require('mongoose');

// ─── Chat Room (Channels & Direct Messages) ────────────────────
const chatRoomSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  type: { type: String, enum: ['channel', 'direct'], default: 'channel', index: true },
  description: { type: String, trim: true },
  icon: { type: String, default: 'Hash' }, // 'Hash', 'Users', 'Bell', 'Briefcase', 'Lock'
  
  // For 1-on-1 Direct Messages: sorted pair of user IDs string "userId1_userId2"
  directKey: { type: String, unique: true, sparse: true, index: true },
  
  // Participants
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: Date.now },
    unreadCount: { type: Number, default: 0 }
  }],
  
  // Last message snippet for fast previews in list
  lastMessage: {
    text: { type: String, default: '' },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  },

  isDefault: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

chatRoomSchema.index({ 'participants.user': 1 });
chatRoomSchema.index({ updatedAt: -1 });

// ─── Chat Message ─────────────────────────────────────────────
const chatMessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, default: 'employee' },
  senderAvatar: { type: String },

  text: { type: String, trim: true, default: '' },
  
  // File attachments (images, PDFs, resumes)
  attachments: [{
    name: { type: String },
    url: { type: String },
    fileType: { type: String },
    size: { type: Number }
  }],

  // Candidate sharing tag (allows instant collaboration on a candidate)
  candidateTag: {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
    name: { type: String },
    phone: { type: String },
    token: { type: String },
    designation: { type: String },
    status: { type: String },
    experience: { type: String },
    ctc: { type: String }
  },

  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],

  deletedForEveryone: { type: Boolean, default: false }
}, { timestamps: true });

chatMessageSchema.index({ roomId: 1, createdAt: -1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { ChatRoom, ChatMessage };
