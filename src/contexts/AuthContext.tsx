import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider, microsoftProvider, getOrCreateUser, UserData } from '../firebase/config';

interface AuthContextType {
  currentUser: UserData | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOrgAdmin: (orgId?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Allow any Google account
      
      // Get or create user in Firestore
      const userData = await getOrCreateUser(user);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithMicrosoft = async () => {
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      const user = result.user;
      
      // Get or create user data
      const userData = await getOrCreateUser(user);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error signing in with Microsoft:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          const userData = await getOrCreateUser(user);
          setCurrentUser(userData);
        } catch (error) {
          console.error('Error getting user data:', error);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isOrgAdmin = (orgId?: string) => {
    // For now, we'll implement this in the ChatRoomContext where organization data is available
    // This is a placeholder that will be enhanced when we have access to organization data
    return currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  };

  const value = {
    currentUser,
    loading,
    signInWithGoogle,
    signInWithMicrosoft,
    signOut,
    isAdmin: currentUser?.role === 'admin' || currentUser?.role === 'super_admin',
    isSuperAdmin: currentUser?.role === 'super_admin',
    isOrgAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
