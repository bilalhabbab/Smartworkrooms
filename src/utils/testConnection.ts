import { connectToDatabase } from '../services/mongodb';
import * as mongoService from '../services/mongoService';

export const testMongoDBConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('Testing MongoDB Atlas connection...');
    
    // Test basic connection
    const connection = await connectToDatabase();
    console.log('✅ MongoDB connection established');
    
    // Test basic operations
    const testUser = {
      uid: 'test-user-' + Date.now(),
      email: 'test@example.com',
      displayName: 'Test User',
      photoURL: null,
      phoneNumber: null,
      providerId: 'test',
      role: 'employee' as const,
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => '',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({})
    } as any;
    
    // Test user creation
    const createdUser = await mongoService.createOrUpdateUser(testUser);
    console.log('✅ User creation test passed');
    
    // Test user retrieval
    const retrievedUser = await mongoService.getUserByUid(testUser.uid);
    console.log('✅ User retrieval test passed');
    
    // Test organization creation
    const orgId = await mongoService.createOrganization(
      'Test Organization',
      'Test description',
      testUser.uid
    );
    console.log('✅ Organization creation test passed');
    
    // Test chat room creation
    const roomId = await mongoService.createChatRoom(
      'Test Room',
      'Test room description',
      orgId,
      testUser.uid
    );
    console.log('✅ Chat room creation test passed');
    
    // Test message creation
    const messageId = await mongoService.addMessage({
      roomId,
      senderId: testUser.uid,
      senderName: testUser.displayName,
      content: 'Test message',
      type: 'user',
      timestamp: new Date()
    });
    console.log('✅ Message creation test passed');
    
    // Test message retrieval
    const messages = await mongoService.getMessages(roomId);
    console.log('✅ Message retrieval test passed');
    
    return {
      success: true,
      message: 'All MongoDB operations completed successfully!',
      details: {
        connectionState: connection.connection.readyState,
        testUser: createdUser,
        organizationId: orgId,
        chatRoomId: roomId,
        messageId,
        messagesCount: messages.length
      }
    };
    
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    return {
      success: false,
      message: `MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    };
  }
};

export const checkEnvironmentSetup = (): {
  success: boolean;
  message: string;
  missingVars: string[];
} => {
  const requiredVars = [
    'REACT_APP_MONGODB_URI',
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_OPENAI_API_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return {
      success: false,
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
      missingVars
    };
  }
  
  return {
    success: true,
    message: 'All required environment variables are set',
    missingVars: []
  };
};
