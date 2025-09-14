// Mock WebSocket service for development without socket.io-client
interface MockSocket {
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  disconnect: () => void;
  connected: boolean;
}

interface WebSocketMessage {
  type: 'file_upload' | 'user_typing' | 'message_sent' | 'user_joined' | 'user_left';
  roomId: string;
  userId: string;
  userName: string;
  data?: any;
  timestamp: string;
}

class WebSocketService {
  private socket: MockSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(userId: string, userName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('WebSocket service: Using localStorage simulation for development');
        this.simulateWebSocketWithLocalStorage();
        resolve();

      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        // Fallback to localStorage simulation
        this.simulateWebSocketWithLocalStorage();
        resolve();
      }
    });
  }

  private simulateWebSocketWithLocalStorage() {
    // Create a mock socket that uses localStorage for communication
    this.socket = {
      emit: (event: string, data?: any) => {
        // Simulate emitting events via localStorage
        localStorage.setItem(`ws_${event}_${Date.now()}`, JSON.stringify(data));
      },
      on: (event: string, callback: (...args: any[]) => void) => {
        // Simulate listening to events via localStorage changes
        window.addEventListener('storage', (e) => {
          if (e.key?.startsWith(`ws_${event}_`)) {
            try {
              const data = JSON.parse(e.newValue || '{}');
              callback(data);
            } catch (error) {
              console.error('Error parsing WebSocket simulation data:', error);
            }
          }
        });
      },
      disconnect: () => {
        console.log('Mock WebSocket disconnected');
      },
      connected: false // Mock connection status
    };
  }

  private handleReconnect(userId: string, userName: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(userId, userName);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  joinRoom(roomId: string, userId: string, userName: string) {
    const message: WebSocketMessage = {
      type: 'user_joined',
      roomId,
      userId,
      userName,
      timestamp: new Date().toISOString()
    };

    if (this.socket?.connected) {
      this.socket.emit('join_room', message);
    } else {
      // Simulate with localStorage
      localStorage.setItem(`ws_${Date.now()}`, JSON.stringify(message));
    }
  }

  leaveRoom(roomId: string, userId: string, userName: string) {
    const message: WebSocketMessage = {
      type: 'user_left',
      roomId,
      userId,
      userName,
      timestamp: new Date().toISOString()
    };

    if (this.socket?.connected) {
      this.socket.emit('leave_room', message);
    } else {
      localStorage.setItem(`ws_${Date.now()}`, JSON.stringify(message));
    }
  }

  sendTypingIndicator(roomId: string, userId: string, userName: string, isTyping: boolean) {
    const message: WebSocketMessage = {
      type: 'user_typing',
      roomId,
      userId,
      userName,
      data: { isTyping },
      timestamp: new Date().toISOString()
    };

    if (this.socket?.connected) {
      this.socket.emit('typing', message);
    } else {
      localStorage.setItem(`ws_${Date.now()}`, JSON.stringify(message));
    }
  }

  notifyFileUpload(roomId: string, userId: string, userName: string, fileName: string) {
    const message: WebSocketMessage = {
      type: 'file_upload',
      roomId,
      userId,
      userName,
      data: { fileName },
      timestamp: new Date().toISOString()
    };

    if (this.socket?.connected) {
      this.socket.emit('file_upload', message);
    } else {
      localStorage.setItem(`ws_${Date.now()}`, JSON.stringify(message));
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void) {
    if (this.socket) {
      this.socket.on('message', callback);
      this.socket.on('file_upload', callback);
      this.socket.on('user_typing', callback);
      this.socket.on('user_joined', callback);
      this.socket.on('user_left', callback);
    }
  }

  private handleMessage(message: WebSocketMessage) {
    // Handle incoming messages for localStorage simulation
    console.log('Received WebSocket message:', message);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const websocketService = new WebSocketService();
export type { WebSocketMessage };
