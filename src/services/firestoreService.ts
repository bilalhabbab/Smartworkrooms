import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Organization, ChatRoom, UploadedPDF, UserData } from '../firebase/config';

// Organization operations
export const createOrganization = async (orgData: Omit<Organization, 'id' | 'createdAt'>): Promise<Organization> => {
  const docRef = await addDoc(collection(db, 'organizations'), {
    ...orgData,
    createdAt: Timestamp.now()
  });
  
  return {
    ...orgData,
    id: docRef.id,
    createdAt: new Date()
  };
};

export const getOrganizations = async (): Promise<Organization[]> => {
  const querySnapshot = await getDocs(collection(db, 'organizations'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date()
  })) as Organization[];
};

export const updateOrganization = async (orgId: string, updates: Partial<Organization>): Promise<void> => {
  const orgRef = doc(db, 'organizations', orgId);
  await updateDoc(orgRef, updates);
};

export const deleteOrganization = async (orgId: string): Promise<void> => {
  const orgRef = doc(db, 'organizations', orgId);
  await deleteDoc(orgRef);
};

// Chat room operations
export const createChatRoom = async (roomData: Omit<ChatRoom, 'id' | 'createdAt'>): Promise<ChatRoom> => {
  const docRef = await addDoc(collection(db, 'chatRooms'), {
    ...roomData,
    createdAt: Timestamp.now()
  });
  
  return {
    ...roomData,
    id: docRef.id,
    createdAt: new Date()
  };
};

export const getChatRooms = async (organizationId?: string): Promise<ChatRoom[]> => {
  let querySnapshot;
  
  if (organizationId) {
    const q = query(collection(db, 'chatRooms'), where('organizationId', '==', organizationId));
    querySnapshot = await getDocs(q);
  } else {
    querySnapshot = await getDocs(collection(db, 'chatRooms'));
  }
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date()
  })) as ChatRoom[];
};

export const updateChatRoom = async (roomId: string, updates: Partial<ChatRoom>): Promise<void> => {
  const roomRef = doc(db, 'chatRooms', roomId);
  await updateDoc(roomRef, updates);
};

export const deleteChatRoom = async (roomId: string): Promise<void> => {
  const roomRef = doc(db, 'chatRooms', roomId);
  await deleteDoc(roomRef);
};

// Message operations
export interface Message {
  id: string;
  roomId: string;
  userId: string;
  userEmail: string;
  userName: string;
  content: string;
  timestamp: Date;
  isAI?: boolean;
}

export const addMessage = async (messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
  const docRef = await addDoc(collection(db, 'messages'), {
    ...messageData,
    timestamp: Timestamp.now()
  });
  
  return {
    ...messageData,
    id: docRef.id,
    timestamp: new Date()
  };
};

export const getMessages = async (roomId: string): Promise<Message[]> => {
  const q = query(
    collection(db, 'messages'), 
    where('roomId', '==', roomId),
    orderBy('timestamp', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate() || new Date()
  })) as Message[];
};

// Real-time message listener
export const subscribeToMessages = (roomId: string, callback: (messages: Message[]) => void) => {
  const q = query(
    collection(db, 'messages'), 
    where('roomId', '==', roomId),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    })) as Message[];
    callback(messages);
  });
};

// File operations
export const addRoomFile = async (roomId: string, file: UploadedPDF): Promise<void> => {
  const fileData = {
    ...file,
    roomId,
    uploadedAt: Timestamp.now()
  };
  
  await addDoc(collection(db, 'roomFiles'), fileData);
};

export const getRoomFiles = async (roomId: string): Promise<UploadedPDF[]> => {
  const q = query(
    collection(db, 'roomFiles'), 
    where('roomId', '==', roomId),
    orderBy('uploadedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    uploadedAt: doc.data().uploadedAt?.toDate() || new Date()
  })) as UploadedPDF[];
};

export const deleteRoomFile = async (roomId: string, fileName: string): Promise<void> => {
  const q = query(
    collection(db, 'roomFiles'), 
    where('roomId', '==', roomId),
    where('name', '==', fileName)
  );
  
  const querySnapshot = await getDocs(q);
  const batch = writeBatch(db);
  
  querySnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
};

// User operations
export const getUsers = async (): Promise<UserData[]> => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  })) as UserData[];
};

export const updateUser = async (userId: string, updates: Partial<UserData>): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, updates);
};
