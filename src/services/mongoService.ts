import { connectToDatabase } from './mongodb';
import { User, Organization, ChatRoom, Message, Invite } from '../models/schemas';
import { UserData, ChatRoom as ChatRoomType, Organization as OrganizationType } from '../firebase/config';

// Define Message interface for MongoDB operations
interface MessageType {
  id: string;
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

// User Services
export const createOrUpdateUser = async (userData: UserData): Promise<UserData> => {
  await connectToDatabase();
  
  try {
    const user = await User.findOneAndUpdate(
      { uid: userData.uid },
      {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        role: userData.role,
        lastLoginAt: new Date()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role
    } as UserData;
  } catch (error) {
    console.error('Error creating/updating user:', error);
    throw error;
  }
};

export const getUserByUid = async (uid: string): Promise<UserData | null> => {
  await connectToDatabase();
  
  try {
    const user = await User.findOne({ uid });
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: user.role
    } as UserData;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Organization Services
export const createOrganization = async (name: string, description: string, createdBy: string): Promise<string> => {
  await connectToDatabase();
  
  try {
    const organization = new Organization({
      name,
      description,
      createdBy,
      members: [createdBy]
    });
    
    const savedOrg = await organization.save();
    return savedOrg._id.toString();
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
};

export const getOrganizations = async (userId?: string): Promise<OrganizationType[]> => {
  await connectToDatabase();
  
  try {
    let query = {};
    if (userId) {
      query = { members: userId };
    }
    
    const organizations = await Organization.find(query).sort({ createdAt: -1 });
    
    return organizations.map((org: any) => ({
      id: org._id.toString(),
      name: org.name,
      description: org.description,
      createdBy: org.createdBy,
      members: org.members,
      isActive: org.isActive,
      createdAt: org.createdAt
    }));
  } catch (error) {
    console.error('Error getting organizations:', error);
    return [];
  }
};

export const addUserToOrganization = async (organizationId: string, userId: string): Promise<void> => {
  await connectToDatabase();
  
  try {
    await Organization.findByIdAndUpdate(
      organizationId,
      { $addToSet: { members: userId } }
    );
  } catch (error) {
    console.error('Error adding user to organization:', error);
    throw error;
  }
};

// Chat Room Services
export const createChatRoom = async (name: string, description: string, organizationId: string, createdBy: string): Promise<string> => {
  await connectToDatabase();
  
  try {
    const chatRoom = new ChatRoom({
      name,
      description,
      organizationId,
      createdBy,
      members: [createdBy],
      sharedFiles: []
    });
    
    const savedRoom = await chatRoom.save();
    return savedRoom._id.toString();
  } catch (error) {
    console.error('Error creating chat room:', error);
    throw error;
  }
};

export const getChatRooms = async (organizationId?: string): Promise<ChatRoomType[]> => {
  await connectToDatabase();
  
  try {
    let query = {};
    if (organizationId) {
      query = { organizationId };
    }
    
    const chatRooms = await ChatRoom.find(query).sort({ createdAt: -1 });
    
    return chatRooms.map((room: any) => ({
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      organizationId: room.organizationId,
      createdBy: room.createdBy,
      members: room.members,
      admins: room.admins || [],
      sharedFiles: room.sharedFiles.map((file: any) => ({
        id: file.id,
        name: file.name,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
        url: file.url,
        content: file.content
      })),
      isActive: room.isActive,
      createdAt: room.createdAt
    }));
  } catch (error) {
    console.error('Error getting chat rooms:', error);
    return [];
  }
};

export const addUserToChatRoom = async (roomId: string, userId: string): Promise<void> => {
  await connectToDatabase();
  
  try {
    await ChatRoom.findByIdAndUpdate(
      roomId,
      { $addToSet: { members: userId } }
    );
  } catch (error) {
    console.error('Error adding user to chat room:', error);
    throw error;
  }
};

export const addFileToRoom = async (roomId: string, file: any): Promise<void> => {
  await connectToDatabase();
  
  try {
    await ChatRoom.findByIdAndUpdate(
      roomId,
      { $push: { sharedFiles: file } }
    );
  } catch (error) {
    console.error('Error adding file to room:', error);
    throw error;
  }
};

export const removeFileFromRoom = async (roomId: string, fileId: string): Promise<void> => {
  await connectToDatabase();
  
  try {
    await ChatRoom.findByIdAndUpdate(
      roomId,
      { $pull: { sharedFiles: { id: fileId } } }
    );
  } catch (error) {
    console.error('Error removing file from room:', error);
    throw error;
  }
};

// Message Services
export const addMessage = async (message: Omit<MessageType, 'id'>): Promise<string> => {
  await connectToDatabase();
  
  try {
    const newMessage = new Message({
      roomId: message.roomId,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content,
      type: message.type,
      timestamp: message.timestamp || new Date(),
      metadata: message.metadata
    });
    
    const savedMessage = await newMessage.save();
    return savedMessage._id.toString();
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};

export const getMessages = async (roomId: string, limit: number = 50): Promise<MessageType[]> => {
  await connectToDatabase();
  
  try {
    const messages = await Message.find({ roomId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    return messages.map((msg: any) => ({
      id: msg._id.toString(),
      roomId: msg.roomId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      content: msg.content,
      type: msg.type,
      timestamp: msg.timestamp,
      metadata: msg.metadata
    }));
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

// Invite Services
export const createInvite = async (roomId: string, organizationId: string, invitedBy: string, invitedEmail: string): Promise<string> => {
  await connectToDatabase();
  
  try {
    const token = Buffer.from(`${roomId}:${organizationId}:${invitedEmail}:${Date.now()}`).toString('base64');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const invite = new Invite({
      token,
      roomId,
      organizationId,
      invitedBy,
      invitedEmail,
      expiresAt
    });
    
    await invite.save();
    return token;
  } catch (error) {
    console.error('Error creating invite:', error);
    throw error;
  }
};

export const validateInvite = async (token: string): Promise<{ roomId: string; organizationId: string; invitedEmail: string } | null> => {
  await connectToDatabase();
  
  try {
    const invite = await Invite.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!invite) return null;
    
    return {
      roomId: invite.roomId,
      organizationId: invite.organizationId,
      invitedEmail: invite.invitedEmail
    };
  } catch (error) {
    console.error('Error validating invite:', error);
    return null;
  }
};

export const useInvite = async (token: string): Promise<void> => {
  await connectToDatabase();
  
  try {
    await Invite.findOneAndUpdate(
      { token },
      { 
        isUsed: true,
        usedAt: new Date()
      }
    );
  } catch (error) {
    console.error('Error using invite:', error);
    throw error;
  }
};
