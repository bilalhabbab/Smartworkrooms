import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Debug: Log config to ensure environment variables are loaded
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');

// Configure Google Auth Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Add additional scopes if needed
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Configure Microsoft Auth Provider (uses Firebase's default Microsoft app)
microsoftProvider.setCustomParameters({
  prompt: 'select_account',
  domain_hint: 'smartworkrooms.com' // Hint to use SmartWorkrooms domain
});

// Basic scopes (SharePoint access will be limited without custom Azure app)
microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');
microsoftProvider.addScope('openid');

// User roles
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  EMPLOYEE = 'employee'
}

// Organization interface
export interface Organization {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  admins: string[];
  members: string[];
  createdAt: Date;
  isActive: boolean;
}

// Chat room interface
export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  organizationId: string;
  createdBy: string;
  admins: string[];
  members: string[];
  sharedFiles: UploadedPDF[];
  createdAt: Date;
  isActive: boolean;
}

export interface UploadedPDF {
  id: string;
  name: string;
  content: string;
  uploadedBy: string;
  uploadedAt: Date;
  size?: number;
}

export interface UserData extends User {
  role: UserRole;
  displayName: string;
  email: string;
  photoURL: string | null;
}

// Check if user is admin or super admin
export const isAdmin = (user: UserData | null): boolean => {
  return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
};

// Check if user is super admin
export const isSuperAdmin = (user: UserData | null): boolean => {
  return user?.role === UserRole.SUPER_ADMIN;
};

// Get or create user with Firestore
export const getOrCreateUser = async (user: User): Promise<UserData> => {
  try {
    const userData: UserData = {
      ...user,
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL,
      role: user.email?.endsWith('@wsa.com') ? UserRole.ADMIN : 
            user.email === 'bilalhabbab@gmail.com' ? UserRole.SUPER_ADMIN : UserRole.EMPLOYEE
    };
    
    // Check if user exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create new user in Firestore
      await setDoc(userRef, {
        uid: userData.uid,
        displayName: userData.displayName,
        email: userData.email,
        photoURL: userData.photoURL,
        role: userData.role,
        createdAt: new Date(),
        lastLogin: new Date()
      });
    } else {
      // Update last login
      await setDoc(userRef, {
        lastLogin: new Date()
      }, { merge: true });
    }
    
    return userData;
  } catch (error) {
    console.error('Error getting/creating user:', error);
    // Fallback to local user data
    const userData: UserData = {
      ...user,
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL,
      role: user.email?.endsWith('@wsa.com') ? UserRole.ADMIN : 
            user.email === 'bilalhabbab@gmail.com' ? UserRole.SUPER_ADMIN : UserRole.EMPLOYEE
    };
    return userData;
  }
};
