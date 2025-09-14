import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { ChatRoom, Organization, UploadedPDF, UserData, UserRole } from '../firebase/config';
import * as firestoreService from '../services/firestoreService';

interface ChatRoomContextType {
  chatRooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  users: UserData[];
  organizations: Organization[];
  currentOrganization: Organization | null;
  organizationName: string;
  setCurrentRoom: (room: ChatRoom | null) => void;
  setCurrentOrganization: (org: Organization | null) => void;
  setOrganizationName: (name: string) => void;
  getOrganizationChatRooms: () => ChatRoom[];
  createChatRoom: (name: string, description: string, organizationId: string) => Promise<ChatRoom>;
  deleteChatRoom: (roomId: string) => void;
  removeUserFromRoom: (roomId: string, userEmail: string) => void;
  promoteToRoomAdmin: (roomId: string, userEmail: string) => void;
  demoteFromRoomAdmin: (roomId: string, userEmail: string) => void;
  promoteToAdmin: (userEmail: string) => void;
  demoteFromAdmin: (userEmail: string) => void;
  updateOrganizationName: (name: string) => void;
  roomFiles: Record<string, UploadedPDF[]>;
  addRoomFile: (roomId: string, file: UploadedPDF) => void;
  removeRoomFile: (roomId: string, fileName: string) => void;
  getRoomFiles: (roomId: string) => UploadedPDF[];
  addRoomMessage: (roomId: string, message: any) => Promise<void>;
  roomMessages: Record<string, any[]>;
  addMessageToRoom: (roomId: string, message: any) => Promise<void>;
  getRoomMessages: (roomId: string) => Promise<firestoreService.Message[]>;
  getChatRoomById: (roomId: string) => ChatRoom | null;
  joinChatRoom: (roomId: string, userEmail: string) => boolean;
  createOrganization: (name: string, description: string) => Promise<Organization>;
  joinOrganization: (orgId: string, userEmail: string) => boolean;
  getOrganizationById: (orgId: string) => Organization | null;
  selectChatRoom: (roomId: string) => void;
  inviteUserToRoom: (roomId: string, userEmail: string) => void;
  clearRoomMessages: (roomId: string) => void;
  isOrgAdmin: (orgId?: string) => boolean;
}

const ChatRoomContext = createContext<ChatRoomContextType | undefined>(undefined);

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Error accessing localStorage for key "${key}":`, error);
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Error setting localStorage for key "${key}":`, error);
  }
};

export const ChatRoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('SmartWorkrooms Organization');
  const [roomFiles, setRoomFiles] = useState<Record<string, UploadedPDF[]>>({});
  const [roomMessages, setRoomMessages] = useState<Record<string, any[]>>({});

  // Load data from Firestore on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [orgs, rooms, users] = await Promise.all([
          firestoreService.getOrganizations(),
          firestoreService.getChatRooms(),
          firestoreService.getUsers()
        ]);
        
        setOrganizations(orgs);
        setChatRooms(rooms);
        setUsers(users);
        
        // Set current organization if any exist
        if (orgs.length > 0 && currentUser) {
          // Find an organization the user is admin of, or just use the first one
          const userAdminOrg = orgs.find(org => org.createdBy === currentUser.email || org.admins.includes(currentUser.email));
          setCurrentOrganization(userAdminOrg || orgs[0]);
        }
      } catch (error) {
        console.error('Error loading data from Firestore:', error);
      }
    };

    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // Filter chat rooms by current organization
  const getOrganizationChatRooms = () => {
    if (!currentOrganization) return [];
    return chatRooms.filter(room => room.organizationId === currentOrganization.id);
  };

  const createChatRoom = async (name: string, description: string, organizationId: string): Promise<ChatRoom> => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const newRoom = await firestoreService.createChatRoom({
      name,
      description,
      organizationId,
      createdBy: currentUser.email,
      admins: [currentUser.email],
      members: [currentUser.email],
      sharedFiles: [],
      isActive: true
    });
    
    setChatRooms(prev => [...prev, newRoom]);
    return newRoom;
  };

  const createOrganization = async (name: string, description: string): Promise<Organization> => {
    if (!currentUser) throw new Error('User not authenticated');
    
    const newOrg = await firestoreService.createOrganization({
      name,
      description,
      createdBy: currentUser.email,
      members: [currentUser.email],
      admins: [currentUser.email],
      isActive: true
    });
    
    setOrganizations(prev => [...prev, newOrg]);
    return newOrg;
  };

  const deleteChatRoom = (roomId: string) => {
    if (currentUser?.email !== 'bilalhabbab@gmail.com') return;
    
    if (currentRoom?.id === roomId) {
      setCurrentRoom(null);
    }
    
    setChatRooms(prev => prev.filter(room => room.id !== roomId));
  };

  const selectChatRoom = (roomId: string) => {
    const room = chatRooms.find(r => r.id === roomId);
    if (room && currentUser && currentOrganization) {
      if (room.organizationId === currentOrganization.id &&
          (room.members.includes(currentUser.email) || 
           currentUser.email === 'bilalhabbab@gmail.com' ||
           room.admins.includes(currentUser.email))) {
        setCurrentRoom(room);
      }
    }
  };

  const inviteUserToRoom = (roomId: string, userEmail: string) => {
    if (!currentUser) return;
    
    const room = chatRooms.find(r => r.id === roomId);
    if (!room || (!room.admins.includes(currentUser.email) && currentUser.email !== 'bilalhabbab@gmail.com')) {
      return;
    }

    setChatRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, members: [...room.members, userEmail] }
        : room
    ));
  };

  const removeUserFromRoom = (roomId: string, userEmail: string) => {
    if (!currentUser) return;
    
    const room = chatRooms.find(r => r.id === roomId);
    if (!room || (!room.admins.includes(currentUser.email) && currentUser.email !== 'bilalhabbab@gmail.com')) {
      return;
    }

    if (userEmail === room.createdBy) {
      return;
    }

    setChatRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { 
            ...room, 
            members: room.members.filter(email => email !== userEmail),
            admins: room.admins.filter(email => email !== userEmail)
          }
        : room
    ));
  };

  const promoteToRoomAdmin = (roomId: string, userEmail: string) => {
    if (!currentUser) return;
    
    const room = chatRooms.find(r => r.id === roomId);
    if (!room || (!room.admins.includes(currentUser.email) && currentUser.email !== 'bilalhabbab@gmail.com')) {
      return;
    }

    setChatRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, admins: [...room.admins, userEmail] }
        : room
    ));
  };

  const demoteFromRoomAdmin = (roomId: string, userEmail: string) => {
    if (!currentUser) return;
    
    const room = chatRooms.find(r => r.id === roomId);
    if (!room || (!room.admins.includes(currentUser.email) && currentUser.email !== 'bilalhabbab@gmail.com')) {
      return;
    }

    if (userEmail === room.createdBy) {
      return;
    }

    setChatRooms(prev => prev.map(room => 
      room.id === roomId 
        ? { ...room, admins: room.admins.filter(email => email !== userEmail) }
        : room
    ));
  };

  const promoteToAdmin = (userEmail: string) => {
    if (currentUser?.email !== 'bilalhabbab@gmail.com') return;

    setUsers(prev => prev.map(user => 
      user.email === userEmail 
        ? { ...user, role: UserRole.ADMIN }
        : user
    ));
  };

  const demoteFromAdmin = (userEmail: string) => {
    if (currentUser?.email !== 'bilalhabbab@gmail.com') return;
    
    setUsers(prev => prev.map(user => 
      user.email === userEmail 
        ? { ...user, role: UserRole.EMPLOYEE }
        : user
    ));
  };

  const updateOrganizationName = (name: string) => {
    if (currentUser?.email !== 'bilalhabbab@gmail.com') return;
    
    setOrganizationName(name);
    
    if (currentOrganization) {
      const updatedOrg = { ...currentOrganization, name };
      setCurrentOrganization(updatedOrg);
      
      setOrganizations(prev => prev.map(org => 
        org.id === currentOrganization.id 
          ? updatedOrg
          : org
      ));
    }
  };

  const addRoomFile = (roomId: string, file: UploadedPDF) => {
    setRoomFiles(prev => {
      const currentFiles = prev[roomId] || [];
      
      if (currentFiles.length >= 20) {
        currentFiles.shift();
      }
      
      const limitedFile = {
        ...file,
        content: file.content.length > 50000 ? file.content.substring(0, 50000) + '\n\n[Content truncated due to size limits]' : file.content
      };
      
      const updatedFiles = {
        ...prev,
        [roomId]: [...currentFiles, limitedFile]
      };
      
      setChatRooms(prevRooms => prevRooms.map(room => 
        room.id === roomId 
          ? { ...room, sharedFiles: updatedFiles[roomId] }
          : room
      ));
      
      return updatedFiles;
    });
  };

  const removeRoomFile = (roomId: string, fileName: string) => {
    setRoomFiles(prev => {
      const updatedFiles = {
        ...prev,
        [roomId]: (prev[roomId] || []).filter(file => file.name !== fileName)
      };
      
      setChatRooms(prevRooms => prevRooms.map(room => 
        room.id === roomId 
          ? { ...room, sharedFiles: updatedFiles[roomId] }
          : room
      ));
      
      return updatedFiles;
    });
  };

  const getRoomFiles = (roomId: string): UploadedPDF[] => {
    return roomFiles[roomId] || [];
  };

  const addMessageToRoom = async (roomId: string, message: any) => {
    try {
      await firestoreService.addMessage({
        roomId,
        userId: message.userId || currentUser?.uid || '',
        userEmail: message.userEmail || currentUser?.email || '',
        userName: message.userName || currentUser?.displayName || '',
        content: message.content,
        isAI: message.isAI || false
      });
    } catch (error) {
      console.error('Error adding message:', error);
    }
  };

  const getRoomMessages = async (roomId: string) => {
    try {
      return await firestoreService.getMessages(roomId);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  const clearRoomMessages = (roomId: string) => {
    if (!currentUser) return;
    const roomKey = `${roomId}_${currentUser.email}`;
    setRoomMessages(prev => ({
      ...prev,
      [roomKey]: []
    }));
  };

  const addRoomMessage = async (roomId: string, message: any) => {
    try {
      const roomMessages = JSON.parse(localStorage.getItem('roomMessages') || '{}');
      if (!roomMessages[roomId]) {
        roomMessages[roomId] = [];
      }
      roomMessages[roomId].push({
        ...message,
        id: message.id || Date.now().toString(),
        timestamp: message.timestamp || new Date()
      });
      
      if (roomMessages[roomId].length > 100) {
        roomMessages[roomId] = roomMessages[roomId].slice(-50);
      }
      
      safeSetItem('roomMessages', JSON.stringify(roomMessages));
    } catch (error) {
      console.error('Error adding message:', error);
    }
  };

  const getChatRoomById = (roomId: string): ChatRoom | null => {
    return chatRooms.find(room => room.id === roomId) || null;
  };

  const joinChatRoom = (roomId: string, userEmail: string): boolean => {
    const room = getChatRoomById(roomId);
    if (!room || room.members.includes(userEmail)) {
      return false;
    }

    setChatRooms(prev => prev.map(r => 
      r.id === roomId 
        ? { ...r, members: [...r.members, userEmail] }
        : r
    ));
    
    return true;
  };

  const joinOrganization = (orgId: string, userEmail: string): boolean => {
    const org = getOrganizationById(orgId);
    if (!org || org.members.includes(userEmail)) {
      return false;
    }

    setOrganizations(prev => prev.map(o => 
      o.id === orgId 
        ? { ...o, members: [...o.members, userEmail] }
        : o
    ));
    
    return true;
  };

  const getOrganizationById = (orgId: string): Organization | null => {
    return organizations.find(org => org.id === orgId) || null;
  };

  const isOrgAdmin = (orgId?: string): boolean => {
    if (!currentUser) return false;
    
    // Super admin has access to everything
    if (currentUser.email === 'bilalhabbab@gmail.com') return true;
    
    const targetOrgId = orgId || currentOrganization?.id;
    if (!targetOrgId) return false;
    
    const org = getOrganizationById(targetOrgId);
    if (!org) return false;
    
    // User is admin if they created the org or are in the admins list
    return org.createdBy === currentUser.email || org.admins.includes(currentUser.email);
  };

  return (
    <ChatRoomContext.Provider value={{
      chatRooms: getOrganizationChatRooms(),
      currentRoom,
      users,
      organizations,
      currentOrganization,
      organizationName,
      setCurrentRoom,
      setCurrentOrganization,
      setOrganizationName,
      getOrganizationChatRooms,
      createChatRoom,
      deleteChatRoom,
      removeUserFromRoom,
      promoteToRoomAdmin,
      demoteFromRoomAdmin,
      promoteToAdmin,
      demoteFromAdmin,
      updateOrganizationName,
      roomFiles,
      addRoomFile,
      removeRoomFile,
      getRoomFiles,
      addRoomMessage,
      roomMessages,
      addMessageToRoom,
      getRoomMessages,
      clearRoomMessages,
      getChatRoomById,
      joinChatRoom,
      createOrganization,
      joinOrganization,
      getOrganizationById,
      selectChatRoom,
      inviteUserToRoom,
      isOrgAdmin
    }}>
      {children}
    </ChatRoomContext.Provider>
  );
};

export const useChatRoom = (): ChatRoomContextType => {
  const context = useContext(ChatRoomContext);
  if (context === undefined) {
    throw new Error('useChatRoom must be used within a ChatRoomProvider');
  }
  return context;
};
