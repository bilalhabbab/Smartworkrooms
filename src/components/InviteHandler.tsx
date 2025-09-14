import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { CheckCircle, Error, Group, Business } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useChatRoom } from '../contexts/ChatRoomContext';
import { parseInviteLink } from '../services/emailService';

const InviteHandler: React.FC = () => {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { joinChatRoom, getChatRoomById, setCurrentRoom } = useChatRoom();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    const processInvite = async () => {
      try {
        const parsed = parseInviteLink(inviteToken);
        if (!parsed) {
          setError('Invalid or corrupted invite link');
          setLoading(false);
          return;
        }

        // Check if invite is expired (7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        if (parsed.timestamp < sevenDaysAgo) {
          setError('This invite link has expired');
          setLoading(false);
          return;
        }

        setInviteData(parsed);
        
        // Try to get room info
        const roomInfo = getChatRoomById(parsed.roomId);
        if (roomInfo) {
          setRoom(roomInfo);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to process invite link');
        setLoading(false);
      }
    };

    processInvite();
  }, [inviteToken, getChatRoomById]);

  const handleJoinRoom = async () => {
    if (!currentUser || !inviteData || !room) return;

    try {
      setLoading(true);
      
      // Check if user is already a member
      if (room.members.includes(currentUser.email)) {
        setCurrentRoom(room);
        navigate('/');
        return;
      }

      // Join the room
      const success = joinChatRoom(room.id, currentUser.email);
      if (success) {
        setJoined(true);
        setCurrentRoom(room);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError('Failed to join the room');
      }
    } catch (err) {
      setError('An error occurred while joining the room');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography>Processing invite...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        p: 3
      }}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <Error color="error" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Invite Error
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/')}>
            Go to Home
          </Button>
        </Paper>
      </Box>
    );
  }

  if (joined) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        p: 3
      }}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Successfully Joined!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You've been added to the {room?.name} chat room. Redirecting you to the chat...
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        p: 3
      }}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <Business color="primary" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Chat Room Invitation
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You've been invited to join a chat room. Please sign in to continue.
          </Typography>
          <Button variant="contained" size="large" onClick={handleSignIn}>
            Sign In to Join
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      p: 3
    }}>
      <Paper sx={{ p: 4, maxWidth: 600 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Group color="primary" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            You're Invited!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You've been invited to join a chat room
          </Typography>
        </Box>

        {room && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {room.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {room.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {room.members.length} members
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Invited by: {inviteData?.inviterEmail}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            size="large" 
            onClick={handleJoinRoom}
            disabled={!room}
          >
            Join Chat Room
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default InviteHandler;
