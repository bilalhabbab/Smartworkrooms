import React, { createContext, useContext, useEffect, useState } from 'react';
import { connectToDatabase } from '../services/mongodb';

interface MongoDBContextType {
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => Promise<void>;
}

const MongoDBContext = createContext<MongoDBContextType | undefined>(undefined);

export const useMongoDBConnection = () => {
  const context = useContext(MongoDBContext);
  if (context === undefined) {
    throw new Error('useMongoDBConnection must be used within a MongoDBProvider');
  }
  return context;
};

interface MongoDBProviderProps {
  children: React.ReactNode;
}

export const MongoDBProvider: React.FC<MongoDBProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connect = async () => {
    try {
      await connectToDatabase();
      setIsConnected(true);
      setConnectionError(null);
      console.log('MongoDB Atlas connected successfully');
    } catch (error) {
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Unknown connection error');
      console.error('MongoDB Atlas connection error:', error);
    }
  };

  const reconnect = async () => {
    setConnectionError(null);
    await connect();
  };

  useEffect(() => {
    connect();
  }, []);

  const value: MongoDBContextType = {
    isConnected,
    connectionError,
    reconnect
  };

  return (
    <MongoDBContext.Provider value={value}>
      {children}
    </MongoDBContext.Provider>
  );
};
