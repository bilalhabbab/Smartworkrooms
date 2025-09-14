import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  Divider
} from '@mui/material';
import {
  Chat,
  Group,
  Description,
  AdminPanelSettings
} from '@mui/icons-material';
import { useChatRoom } from '../contexts/ChatRoomContext';
import { useAuth } from '../contexts/AuthContext';

interface ChatRoomSelectorProps {
  onRoomSelect: (roomId: string) => void;
  onAdminPanelOpen: () => void;
  organizationRooms?: any[];
}

const ChatRoomSelector: React.FC<ChatRoomSelectorProps> = ({ onRoomSelect, onAdminPanelOpen, organizationRooms }) => {
  const { chatRooms, currentRoom, isOrgAdmin, organizations, currentOrganization } = useChatRoom();
  const { currentUser } = useAuth();

  const isSuperAdmin = currentUser?.email === 'bilalhabbab@gmail.com';
  const canAccessAdminPanel = isSuperAdmin || isOrgAdmin(currentOrganization?.id) || organizations.length === 0;
  
  // Use organizationRooms if provided, otherwise fall back to all chatRooms
  const roomsToDisplay = organizationRooms || chatRooms;

  return (
    <Box sx={{ 
      width: 280, 
      borderRight: 1, 
      borderColor: 'divider', 
      height: '100%',
      bgcolor: 'background.paper'
    }}>
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Typography variant="h6" gutterBottom>
          Chat Rooms
        </Typography>
        {canAccessAdminPanel && (
          <ListItemButton 
            onClick={onAdminPanelOpen} 
            sx={{ 
              borderRadius: 1, 
              mb: 1,
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <ListItemIcon>
              <AdminPanelSettings color={organizations.length === 0 ? "primary" : "error"} />
            </ListItemIcon>
            <ListItemText 
              primary={organizations.length === 0 ? "Create Organization" : "Admin Panel"} 
            />
          </ListItemButton>
        )}
      </Box>

      <List sx={{ p: 1, bgcolor: 'background.paper' }}>
        {roomsToDisplay
          .filter(room => 
            room.members.includes(currentUser?.email || '') || 
            isSuperAdmin
          )
          .map((room) => (
            <ListItem key={room.id} disablePadding>
              <ListItemButton
                selected={currentRoom?.id === room.id}
                onClick={() => onRoomSelect(room.id)}
                sx={{ 
                  borderRadius: 1, 
                  mb: 0.5,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  },
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    '&:hover': {
                      bgcolor: 'action.selected'
                    }
                  }
                }}
              >
                <ListItemIcon>
                  <Chat />
                </ListItemIcon>
                <ListItemText
                  primary={room.name}
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {room.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        <Chip
                          icon={<Group />}
                          label={room.members.length}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          icon={<Description />}
                          label={room.sharedFiles.length}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
      </List>

      {roomsToDisplay.length === 0 && (
        <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
          <Typography variant="body2" color="text.secondary">
            No chat rooms available
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ChatRoomSelector;
