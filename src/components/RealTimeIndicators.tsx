import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Fade,
  Paper,
  Badge
} from '@mui/material';
import { Circle, Edit } from '@mui/icons-material';
import { websocketService, WebSocketMessage } from '../services/websocketService';
import { useAuth } from '../contexts/AuthContext';
import { useChatRoom } from '../contexts/ChatRoomContext';

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface OnlineUser {
  userId: string;
  userName: string;
  lastSeen: number;
}

const RealTimeIndicators: React.FC = () => {
  const { currentUser } = useAuth();
  const { currentRoom } = useChatRoom();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser || !currentRoom) return;

    // Listen for WebSocket messages
    websocketService.onMessage((message: WebSocketMessage) => {
      if (message.roomId !== currentRoom.id) return;

      switch (message.type) {
        case 'user_typing':
          handleTypingIndicator(message);
          break;
        case 'user_joined':
          handleUserJoined(message);
          break;
        case 'user_left':
          handleUserLeft(message);
          break;
        case 'file_upload':
          handleFileUpload(message);
          break;
      }
    });

    // Clean up typing indicators periodically
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(user => now - user.timestamp < 3000));
    }, 1000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [currentUser, currentRoom]);

  const handleTypingIndicator = (message: WebSocketMessage) => {
    if (message.userId === currentUser?.email) return; // Don't show own typing

    const now = Date.now();
    
    if (message.data?.isTyping) {
      setTypingUsers(prev => {
        const filtered = prev.filter(user => user.userId !== message.userId);
        return [...filtered, {
          userId: message.userId,
          userName: message.userName,
          timestamp: now
        }];
      });
    } else {
      setTypingUsers(prev => prev.filter(user => user.userId !== message.userId));
    }
  };

  const handleUserJoined = (message: WebSocketMessage) => {
    if (message.userId === currentUser?.email) return;

    setOnlineUsers(prev => {
      const filtered = prev.filter(user => user.userId !== message.userId);
      return [...filtered, {
        userId: message.userId,
        userName: message.userName,
        lastSeen: Date.now()
      }];
    });

    setRecentActivity(prev => [
      `${message.userName} joined the room`,
      ...prev.slice(0, 4)
    ]);
  };

  const handleUserLeft = (message: WebSocketMessage) => {
    setOnlineUsers(prev => prev.filter(user => user.userId !== message.userId));
    
    setRecentActivity(prev => [
      `${message.userName} left the room`,
      ...prev.slice(0, 4)
    ]);
  };

  const handleFileUpload = (message: WebSocketMessage) => {
    if (message.userId === currentUser?.email) return;

    setRecentActivity(prev => [
      `${message.userName} uploaded ${message.data?.fileName}`,
      ...prev.slice(0, 4)
    ]);
  };

  const sendTypingIndicator = (isTyping: boolean) => {
    if (!currentUser || !currentRoom) return;

    websocketService.sendTypingIndicator(
      currentRoom.id,
      currentUser.email,
      currentUser.displayName || currentUser.email,
      isTyping
    );
  };

  return (
    <Box>
      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <Fade in={true}>
          <Paper sx={{ 
            p: 1, 
            mb: 1, 
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            <Edit sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {typingUsers.length === 1
                ? `${typingUsers[0].userName} is typing...`
                : `${typingUsers.length} people are typing...`
              }
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {[1, 2, 3].map((dot) => (
                <Circle
                  key={dot}
                  sx={{
                    fontSize: 4,
                    color: 'primary.main',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    animationDelay: `${dot * 0.2}s`
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Fade>
      )}

      {/* Online Users */}
      {onlineUsers.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Online Now ({onlineUsers.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {onlineUsers.map((user) => (
              <Badge
                key={user.userId}
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <Circle sx={{ fontSize: 8, color: 'success.main' }} />
                }
              >
                <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                  {user.userName.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>
            ))}
          </Box>
        </Box>
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Recent Activity
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {recentActivity.map((activity, index) => (
              <Fade key={index} in={true} timeout={300}>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    opacity: 1 - (index * 0.2),
                    fontSize: '0.7rem'
                  }}
                >
                  • {activity}
                </Typography>
              </Fade>
            ))}
          </Box>
        </Box>
      )}

      {/* Hidden input handler for typing detection */}
      <style>
        {`
          @keyframes pulse {
            0%, 70%, 100% { opacity: 0.4; }
            35% { opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default RealTimeIndicators;
