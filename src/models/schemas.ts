import mongoose, { Schema, Document } from 'mongoose';

// User Schema
export interface IUser extends Document {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'employee' | 'admin' | 'super_admin';
  createdAt: Date;
  lastLoginAt: Date;
}

const UserSchema = new Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  photoURL: { type: String },
  role: { 
    type: String, 
    enum: ['employee', 'admin', 'super_admin'], 
    default: 'employee' 
  },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now }
});

// Organization Schema
export interface IOrganization extends Document {
  name: string;
  description?: string;
  createdBy: string;
  members: string[];
  isActive: boolean;
  createdAt: Date;
}

const OrganizationSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  createdBy: { type: String, required: true },
  members: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Chat Room Schema
export interface IChatRoom extends Document {
  name: string;
  description?: string;
  organizationId: string;
  createdBy: string;
  members: string[];
  admins: string[];
  sharedFiles: Array<{
    id: string;
    name: string;
    uploadedBy: string;
    uploadedAt: Date;
    url?: string;
    content?: string;
  }>;
  isActive: boolean;
  createdAt: Date;
}

const ChatRoomSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  organizationId: { type: String, required: true },
  createdBy: { type: String, required: true },
  members: [{ type: String }],
  admins: [{ type: String }],
  sharedFiles: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    url: { type: String },
    content: { type: String }
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Message Schema
export interface IMessage extends Document {
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  metadata?: {
    aiModel?: string;
    processingTime?: number;
    documentContext?: string[];
  };
}

const MessageSchema = new Schema({
  roomId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['user', 'ai'], required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    aiModel: { type: String },
    processingTime: { type: Number },
    documentContext: [{ type: String }]
  }
});

// Invite Schema
export interface IInvite extends Document {
  token: string;
  roomId: string;
  organizationId: string;
  invitedBy: string;
  invitedEmail: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}

const InviteSchema = new Schema({
  token: { type: String, required: true, unique: true },
  roomId: { type: String, required: true },
  organizationId: { type: String, required: true },
  invitedBy: { type: String, required: true },
  invitedEmail: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false },
  usedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes for better performance
UserSchema.index({ email: 1 });
UserSchema.index({ uid: 1 });
OrganizationSchema.index({ createdBy: 1 });
OrganizationSchema.index({ members: 1 });
ChatRoomSchema.index({ organizationId: 1 });
ChatRoomSchema.index({ members: 1 });
MessageSchema.index({ roomId: 1, timestamp: -1 });
InviteSchema.index({ token: 1 });
InviteSchema.index({ expiresAt: 1 });

// Export models
let UserModel: any;
let OrganizationModel: any;
let ChatRoomModel: any;
let MessageModel: any;
let InviteModel: any;

try {
  UserModel = mongoose.model('User');
} catch {
  UserModel = mongoose.model('User', UserSchema);
}

try {
  OrganizationModel = mongoose.model('Organization');
} catch {
  OrganizationModel = mongoose.model('Organization', OrganizationSchema);
}

try {
  ChatRoomModel = mongoose.model('ChatRoom');
} catch {
  ChatRoomModel = mongoose.model('ChatRoom', ChatRoomSchema);
}

try {
  MessageModel = mongoose.model('Message');
} catch {
  MessageModel = mongoose.model('Message', MessageSchema);
}

try {
  InviteModel = mongoose.model('Invite');
} catch {
  InviteModel = mongoose.model('Invite', InviteSchema);
}

export const User = UserModel;
export const Organization = OrganizationModel;
export const ChatRoom = ChatRoomModel;
export const Message = MessageModel;
export const Invite = InviteModel;
